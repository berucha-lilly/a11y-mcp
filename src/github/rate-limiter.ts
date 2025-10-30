/**
 * GitHub API Rate Limiting
 * Handles GitHub API rate limits gracefully
 */

import { RateLimitInfo, GitHubError } from '../types/github.js';

export class RateLimiter {
  private rateLimit: RateLimitInfo;
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  constructor() {
    this.rateLimit = {
      remaining: 5000, // Default limit for GitHub Apps
      resetTime: new Date(),
      used: 0,
      limit: 5000
    };
  }

  updateRateLimit(headers: Record<string, string>): void {
    this.rateLimit = {
      remaining: parseInt(headers['x-ratelimit-remaining'] || '5000'),
      resetTime: new Date(parseInt(headers['x-ratelimit-reset'] || '0') * 1000),
      used: parseInt(headers['x-ratelimit-used'] || '0'),
      limit: parseInt(headers['x-ratelimit-limit'] || '5000')
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.rateLimit.remaining <= 0) {
      await this.waitForRateLimitReset();
    }

    try {
      const result = await operation();
      
      // Check if we need to update rate limit after the call
      // This should be called by the caller after making API requests
      return result;
    } catch (error: any) {
      if (this.isRateLimitError(error)) {
        await this.handleRateLimitError();
        // Retry after handling
        return await operation();
      }
      throw error;
    }
  }

  private async waitForRateLimitReset(): Promise<void> {
    const now = new Date();
    const resetTime = this.rateLimit.resetTime;
    
    if (resetTime <= now) {
      return; // Reset time has passed
    }

    const waitTime = resetTime.getTime() - now.getTime();
    
    if (waitTime > 60000) { // More than 1 minute
      throw new Error(`Rate limit will reset in ${Math.ceil(waitTime / 60000)} minutes. Operation queued.`);
    }

    console.warn(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  private isRateLimitError(error: any): boolean {
    return error.status === 403 || 
           error.message?.includes('rate limit exceeded') ||
           error.message?.includes('API rate limit exceeded');
  }

  private async handleRateLimitError(): Promise<void> {
    const resetTime = this.rateLimit.resetTime;
    const waitTime = resetTime.getTime() - Date.now();
    
    if (waitTime > 300000) { // 5 minutes
      throw new Error('Rate limit exceeded and wait time too long');
    }

    console.warn(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  canMakeRequest(): boolean {
    return this.rateLimit.remaining > 0;
  }

  getRemainingRequests(): number {
    return this.rateLimit.remaining;
  }

  getResetTime(): Date {
    return this.rateLimit.resetTime;
  }

  addToQueue(operation: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.execute(operation);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.canMakeRequest()) {
      const operation = this.queue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('Queue operation failed:', error);
        }
      }
    }

    this.isProcessing = false;

    if (this.queue.length > 0) {
      // Schedule next processing attempt
      setTimeout(() => this.processQueue(), 1000);
    }
  }
}