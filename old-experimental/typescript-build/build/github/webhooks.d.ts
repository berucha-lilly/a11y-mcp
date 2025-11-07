/**
 * GitHub Webhook Handler
 * Processes PR events and triggers accessibility analysis
 */
import { AccessibilityScanner } from '../scanner.js';
import { CheckRunManager } from './check-runs.js';
export declare class WebhookHandler {
    private scanner;
    private checkRunManager;
    private activeCheckRuns;
    constructor(scanner: AccessibilityScanner, checkRunManager: CheckRunManager);
    handlePullRequestEvent(payload: any): Promise<void>;
    private analyzePullRequest;
    private getChangedFiles;
    private getFileContent;
    private filterRelevantFiles;
    private isFileTypeSupported;
    private convertViolationsToGitHubFormat;
    private buildCheckRun;
    private buildAnalysisSummary;
    private postAnalysisResults;
    private postErrorStatus;
    private isAnalysisRunning;
    private startAnalysis;
    private completeAnalysis;
    private delay;
    private getSampleJSXContent;
    private getSampleCSSContent;
}
