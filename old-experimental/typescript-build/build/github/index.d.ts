/**
 * GitHub Integration Manager
 * Main orchestrator for GitHub App functionality
 */
import { AccessibilityScanner } from '../scanner.js';
import { GitHubConfig, PerformanceMetrics } from '../types/github.js';
export declare class GitHubIntegrationManager {
    private scanner;
    private webhookHandler;
    private checkRunManager;
    private rateLimiter;
    private fileAnalyzer;
    private config;
    private performanceMetrics;
    constructor(scanner: AccessibilityScanner, config: GitHubConfig);
    /**
     * Process GitHub webhook event
     */
    processWebhookEvent(eventType: string, payload: any): Promise<void>;
    /**
     * Analyze a specific PR manually
     */
    analyzePR(owner: string, repo: string, prNumber: number, options?: {
        includeComments?: boolean;
        forceReanalysis?: boolean;
        specificFiles?: string[];
    }): Promise<any>;
    /**
     * Get GitHub API rate limit status
     */
    getRateLimitStatus(): Promise<any>;
    /**
     * Health check for GitHub integration
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        checks: Record<string, any>;
        metrics: PerformanceMetrics;
    }>;
    private getRepositoryInfo;
    private getRepositorySettings;
    private getPRFiles;
    private filterFilesForAnalysis;
    private analyzeFiles;
    private getFileContent;
    private generateAnalysisSummary;
    private postPRComment;
    private resetPerformanceMetrics;
    private getFileExtension;
}
