/**
 * GitHub API Rate Limiting
 * Handles GitHub API rate limits gracefully
 */
export declare class RateLimiter {
    private rateLimit;
    private queue;
    private isProcessing;
    constructor();
    updateRateLimit(headers: Record<string, string>): void;
    execute<T>(operation: () => Promise<T>): Promise<T>;
    private waitForRateLimitReset;
    private isRateLimitError;
    private handleRateLimitError;
    canMakeRequest(): boolean;
    getRemainingRequests(): number;
    getResetTime(): Date;
    addToQueue(operation: () => Promise<any>): Promise<any>;
    private processQueue;
}
