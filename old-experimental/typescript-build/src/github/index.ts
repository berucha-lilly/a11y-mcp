/**
 * GitHub Integration Manager
 * Main orchestrator for GitHub App functionality
 */

import { AccessibilityScanner } from '../scanner.js';
import { WebhookHandler } from './webhooks.js';
import { CheckRunManager } from './check-runs.js';
import { RateLimiter } from './rate-limiter.js';
import { FileAnalyzer } from './file-analyzer.js';
import {
  GitHubConfig,
  PullRequestEvent,
  PerformanceMetrics
} from '../types/github.js';

export class GitHubIntegrationManager {
  private scanner: AccessibilityScanner;
  private webhookHandler: WebhookHandler;
  private checkRunManager: CheckRunManager;
  private rateLimiter: RateLimiter;
  private fileAnalyzer: FileAnalyzer;
  private config: GitHubConfig;
  private performanceMetrics: PerformanceMetrics;

  constructor(scanner: AccessibilityScanner, config: GitHubConfig) {
    this.scanner = scanner;
    this.config = config;
    this.rateLimiter = new RateLimiter();
    this.checkRunManager = new CheckRunManager(config.apiToken || config.privateKey);
    this.webhookHandler = new WebhookHandler(scanner, this.checkRunManager);
    this.fileAnalyzer = new FileAnalyzer();
    
    this.performanceMetrics = {
      analysisStartTime: new Date(),
      analysisEndTime: undefined,
      filesProcessed: 0,
      filesSkipped: 0,
      violationsFound: 0,
      apiCallsMade: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageFileProcessingTime: 0,
      memoryUsage: {
        used: 0,
        total: 0,
        percentage: 0
      }
    };
  }

  /**
   * Process GitHub webhook event
   */
  async processWebhookEvent(eventType: string, payload: any): Promise<void> {
    const startTime = Date.now();
    
    console.log(`Processing webhook event: ${eventType}`);
    
    try {
      this.performanceMetrics.apiCallsMade++;
      
      switch (eventType) {
        case 'pull_request':
          await this.webhookHandler.handlePullRequestEvent(payload);
          break;
        
        default:
          console.log(`Ignoring unsupported event type: ${eventType}`);
      }
      
      // Update performance metrics
      this.performanceMetrics.analysisEndTime = new Date();
      
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Analyze a specific PR manually
   */
  async analyzePR(
    owner: string,
    repo: string,
    prNumber: number,
    options: {
      includeComments?: boolean;
      forceReanalysis?: boolean;
      specificFiles?: string[];
    } = {}
  ): Promise<any> {
    const startTime = Date.now();
    
    console.log(`Starting manual PR analysis: ${owner}/${repo}#${prNumber}`);
    
    try {
      // Initialize metrics
      this.resetPerformanceMetrics();
      this.performanceMetrics.analysisStartTime = new Date();
      
      // Get PR details and files
      const [ownerInfo, repoInfo, files] = await Promise.all([
        this.getRepositoryInfo(owner, repo),
        this.getRepositorySettings(owner, repo),
        this.getPRFiles(owner, repo, prNumber)
      ]);
      
      console.log(`Found ${files.length} files in PR #${prNumber}`);
      
      // Filter and analyze files
      const relevantFiles = this.filterFilesForAnalysis(files, options.specificFiles);
      console.log(`${relevantFiles.length} files after filtering`);
      
      const results = await this.analyzeFiles(owner, repo, relevantFiles);
      
      // Generate summary
      const summary = this.generateAnalysisSummary(results);
      
      // Optionally post results as comments
      if (options.includeComments) {
        await this.postPRComment(owner, repo, prNumber, summary);
      }
      
      this.performanceMetrics.analysisEndTime = new Date();
      
      return {
        pr: { owner, repo, number: prNumber },
        summary,
        files: results,
        metrics: this.performanceMetrics,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('PR analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get GitHub API rate limit status
   */
  async getRateLimitStatus(): Promise<any> {
    try {
      const response = await this.rateLimiter.execute(async () => {
        const apiUrl = 'https://api.github.com';
        return await fetch(`${apiUrl}/rate_limit`, {
          headers: {
            'Authorization': `Bearer ${this.config.privateKey}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'A11y-MCP-Server'
          }
        });
      });

      if (!response.ok) {
        throw new Error(`Failed to get rate limit: ${response.status}`);
      }

      const rateLimit = await response.json();
      this.performanceMetrics.apiCallsMade++;
      this.rateLimiter.updateRateLimit(response.headers as any);
      
      return rateLimit;
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      throw error;
    }
  }

  /**
   * Health check for GitHub integration
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, any>;
    metrics: PerformanceMetrics;
  }> {
    const checks: Record<string, any> = {};
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Check API connectivity
    try {
      const rateLimit = await this.getRateLimitStatus();
      checks.api = {
        status: 'ok',
        remaining: rateLimit.resources.core.remaining,
        resetTime: new Date(rateLimit.resources.core.reset * 1000)
      };
    } catch (error) {
      checks.api = { status: 'error', error: error.message };
      status = 'degraded';
    }
    
    // Check scanner functionality
    try {
      const testResult = await this.scanner.scanFile('test.js', '<img src="test.jpg" />');
      checks.scanner = {
        status: 'ok',
        violationsFound: testResult.violations.length
      };
    } catch (error) {
      checks.scanner = { status: 'error', error: error.message };
      status = 'unhealthy';
    }
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    checks.memory = {
      used: Math.round(memUsage.used / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memUsage.used / memUsage.heapTotal) * 100)
    };
    
    this.performanceMetrics.memoryUsage = checks.memory;
    
    if (checks.memory.percentage > 90) {
      status = 'degraded';
    }
    
    return {
      status,
      checks,
      metrics: this.performanceMetrics
    };
  }

  // Private helper methods
  
  private async getRepositoryInfo(owner: string, repo: string): Promise<any> {
    // Implementation would fetch repo info from GitHub API
    return { owner, repo };
  }
  
  private async getRepositorySettings(owner: string, repo: string): Promise<any> {
    // Implementation would fetch repo settings from GitHub API
    return {};
  }
  
  private async getPRFiles(owner: string, repo: string, prNumber: number): Promise<any[]> {
    // Implementation would fetch PR files from GitHub API
    return [];
  }
  
  private filterFilesForAnalysis(files: any[], specificFiles?: string[]): any[] {
    let filtered = files.filter(file => {
      const ext = this.getFileExtension(file.filename);
      return ['.tsx', '.jsx', '.ts', '.js', '.css', '.scss'].includes(ext) &&
             !file.filename.includes('test.') &&
             !file.filename.includes('stories.') &&
             file.status !== 'removed';
    });
    
    if (specificFiles && specificFiles.length > 0) {
      filtered = filtered.filter(file => specificFiles.includes(file.filename));
    }
    
    return filtered;
  }
  
  private async analyzeFiles(owner: string, repo: string, files: any[]): Promise<any[]> {
    const results = [];
    
    for (const file of files) {
      try {
        const content = await this.getFileContent(owner, repo, file.filename);
        if (content) {
          const scanResult = await this.scanner.scanFile(file.filename, content);
          results.push({
            file: file.filename,
            status: file.status,
            violations: scanResult.violations,
            statistics: scanResult.statistics
          });
          this.performanceMetrics.filesProcessed++;
        } else {
          this.performanceMetrics.filesSkipped++;
        }
      } catch (error) {
        console.warn(`Failed to analyze ${file.filename}:`, error);
        this.performanceMetrics.filesSkipped++;
      }
    }
    
    return results;
  }
  
  private async getFileContent(owner: string, repo: string, filePath: string): Promise<string | null> {
    // Implementation would fetch file content from GitHub API
    return null;
  }
  
  private generateAnalysisSummary(results: any[]): any {
    const allViolations = results.flatMap(r => r.violations);
    const errors = allViolations.filter(v => v.severity === 'error').length;
    const warnings = allViolations.filter(v => v.severity === 'warning').length;
    const info = allViolations.filter(v => v.severity === 'info').length;
    
    return {
      totalFiles: results.length,
      totalViolations: allViolations.length,
      errors,
      warnings,
      info,
      complianceScore: allViolations.length === 0 ? 100 : Math.max(0, 100 - (errors * 10 + warnings * 2)),
      estimatedFixTime: `${allViolations.length * 2} minutes`
    };
  }
  
  private async postPRComment(owner: string, repo: string, prNumber: number, summary: any): Promise<void> {
    // Implementation would post PR comment via GitHub API
    console.log(`Would post comment to ${owner}/${repo}#${prNumber}`);
  }
  
  private resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      analysisStartTime: new Date(),
      analysisEndTime: undefined,
      filesProcessed: 0,
      filesSkipped: 0,
      violationsFound: 0,
      apiCallsMade: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageFileProcessingTime: 0,
      memoryUsage: {
        used: 0,
        total: 0,
        percentage: 0
      }
    };
  }
  
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }
}