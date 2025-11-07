/**
 * GitHub Check Run API Integration
 * Handles posting check results with annotations to GitHub PRs
 */
import { PRAnalysisResult } from '../types/github.js';
export declare class CheckRunManager {
    private rateLimiter;
    private apiToken;
    private apiUrl;
    constructor(apiToken: string, apiUrl?: string);
    createCheckRun(owner: string, repo: string, analysisResult: PRAnalysisResult): Promise<{
        id: number;
        html_url: string;
    }>;
    updateCheckRun(owner: string, repo: string, checkRunId: number, analysisResult: PRAnalysisResult): Promise<{
        id: number;
        html_url: string;
    }>;
    private buildCheckRun;
    private buildAnnotations;
    private buildViolationDetails;
    private buildSummary;
    getCheckRun(owner: string, repo: string, checkRunId: number): Promise<any>;
}
