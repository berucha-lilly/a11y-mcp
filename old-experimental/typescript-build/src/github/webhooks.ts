/**
 * GitHub Webhook Handler
 * Processes PR events and triggers accessibility analysis
 */

import { 
  PullRequestEvent, 
  GitHubFile, 
  PRAnalysisResult,
  GitHubCheckViolation 
} from '../types/github.js';
import { AccessibilityScanner } from '../scanner.js';
import { CheckRunManager } from './check-runs.js';
import { parsePRChanges } from './file-analyzer.js';

export class WebhookHandler {
  private scanner: AccessibilityScanner;
  private checkRunManager: CheckRunManager;
  private activeCheckRuns: Map<number, { id: number; startTime: number }>;

  constructor(scanner: AccessibilityScanner, checkRunManager: CheckRunManager) {
    this.scanner = scanner;
    this.checkRunManager = checkRunManager;
    this.activeCheckRuns = new Map();
  }

  async handlePullRequestEvent(payload: any): Promise<void> {
    const event = payload as PullRequestEvent;
    const { action, number, pull_request, repository } = event;

    console.log(`Processing PR event: ${action} for PR #${number}`);

    // Only process specific events
    if (!['opened', 'synchronize', 'reopened'].includes(action)) {
      console.log(`Ignoring PR event: ${action}`);
      return;
    }

    try {
      // Check if analysis is already running for this PR
      if (this.isAnalysisRunning(number)) {
        console.log(`Analysis already running for PR #${number}, skipping...`);
        return;
      }

      // Mark analysis as started
      this.startAnalysis(number);

      // Perform accessibility analysis
      const analysisResult = await this.analyzePullRequest(event);
      
      // Post results to GitHub
      await this.postAnalysisResults(event, analysisResult);

    } catch (error) {
      console.error(`Error processing PR #${number}:`, error);
      
      // Post error status to GitHub
      await this.postErrorStatus(event, error instanceof Error ? error.message : 'Unknown error');
      
    } finally {
      // Mark analysis as completed
      this.completeAnalysis(number);
    }
  }

  private async analyzePullRequest(event: PullRequestEvent): Promise<PRAnalysisResult> {
    const { pull_request, repository } = event;
    const startTime = Date.now();

    console.log(`Starting accessibility analysis for PR #${pull_request.number}`);

    // Get changed files
    const changedFiles = await this.getChangedFiles(event);
    console.log(`Found ${changedFiles.length} changed files`);

    // Filter relevant files
    const relevantFiles = this.filterRelevantFiles(changedFiles);
    console.log(`${relevantFiles.length} files after filtering`);

    // Analyze files
    const analysisStartTime = new Date();
    const filesToAnalyze = relevantFiles.filter(file => this.isFileTypeSupported(file.filename));
    
    console.log(`Analyzing ${filesToAnalyze.length} files...`);

    const violations: GitHubCheckViolation[] = [];
    let totalFilesAnalyzed = 0;
    let totalFilesSkipped = 0;

    // Analyze files in batches for performance
    const batchSize = 5;
    for (let i = 0; i < filesToAnalyze.length; i += batchSize) {
      const batch = filesToAnalyze.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (file) => {
          const content = await this.getFileContent(file, event);
          if (content) {
            const result = await this.scanner.scanFile(file.filename, content);
            totalFilesAnalyzed++;
            
            // Convert violations to GitHub format
            return this.convertViolationsToGitHubFormat(result.violations, file.filename);
          } else {
            totalFilesSkipped++;
            return [];
          }
        })
      );

      // Process results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          violations.push(...result.value);
        } else {
          console.warn(`Failed to analyze file ${batch[index].filename}:`, result.reason);
          totalFilesSkipped++;
        }
      });

      // Add delay between batches to avoid overwhelming the system
      if (i + batchSize < filesToAnalyze.length) {
        await this.delay(100);
      }
    }

    const analysisEndTime = new Date();
    const processingTime = Date.now() - startTime;

    // Build check run
    const checkRun = this.buildCheckRun(event, violations, processingTime);

    return {
      prNumber: pull_request.number,
      repository: repository.full_name,
      branch: pull_request.head.ref,
      totalFiles: changedFiles.length,
      analyzedFiles: totalFilesAnalyzed,
      skippedFiles: totalFilesSkipped,
      violations,
      summary: this.buildAnalysisSummary(violations),
      checkRun,
      processingTime
    };
  }

  private async getChangedFiles(event: PullRequestEvent): Promise<GitHubFile[]> {
    const { pull_request, repository } = event;
    
    try {
      // This would be implemented to fetch files from GitHub API
      // For now, returning mock data structure
      const mockFiles: GitHubFile[] = [
        {
          filename: 'src/components/Button.tsx',
          status: 'modified',
          additions: 5,
          deletions: 2,
          changes: 7,
          blob_url: '',
          raw_url: '',
          contents_url: '',
          patch: ''
        },
        {
          filename: 'src/styles/main.css',
          status: 'modified',
          additions: 10,
          deletions: 0,
          changes: 10,
          blob_url: '',
          raw_url: '',
          contents_url: '',
          patch: ''
        }
      ];

      return mockFiles;
    } catch (error) {
      console.error('Failed to get changed files:', error);
      return [];
    }
  }

  private async getFileContent(file: GitHubFile, event: PullRequestEvent): Promise<string | null> {
    try {
      // This would fetch the file content from GitHub API
      // For now, returning sample content based on file type
      if (file.filename.endsWith('.tsx') || file.filename.endsWith('.jsx')) {
        return this.getSampleJSXContent(file.filename);
      } else if (file.filename.endsWith('.css') || file.filename.endsWith('.scss')) {
        return this.getSampleCSSContent(file.filename);
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to get content for ${file.filename}:`, error);
      return null;
    }
  }

  private filterRelevantFiles(files: GitHubFile[]): GitHubFile[] {
    return files.filter(file => {
      // Skip deleted files
      if (file.status === 'removed') {
        return false;
      }

      // Skip binary files and non-relevant file types
      const excludedExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        '.zip', '.tar', '.gz', '.7z',
        '.env', '.config', '.log'
      ];

      if (excludedExtensions.some(ext => file.filename.endsWith(ext))) {
        return false;
      }

      // Skip test files and configs by default
      if (file.filename.match(/\.(test|spec|stories)\.(js|jsx|ts|tsx)$/)) {
        return false;
      }

      return true;
    });
  }

  private isFileTypeSupported(filename: string): boolean {
    const supportedExtensions = ['.tsx', '.jsx', '.ts', '.js', '.css', '.scss'];
    return supportedExtensions.some(ext => filename.endsWith(ext));
  }

  private convertViolationsToGitHubFormat(violations: any[], filePath: string): GitHubCheckViolation[] {
    return violations.map(violation => ({
      id: violation.id || `violation-${Date.now()}-${Math.random()}`,
      severity: violation.severity || 'warning',
      title: violation.title || 'Accessibility Issue',
      description: violation.description || 'An accessibility issue was found',
      file: filePath,
      line: violation.line || 1,
      column: violation.column,
      endLine: violation.line,
      wcagCriteria: violation.wcagCriteria || [],
      fixSuggestion: violation.fixSuggestions?.[0]?.description || 'Review and fix the accessibility issue',
      codeSnippet: violation.code,
      annotationLevel: violation.severity === 'error' ? 'failure' : 
                     violation.severity === 'warning' ? 'warning' : 'notice'
    }));
  }

  private buildCheckRun(event: PullRequestEvent, violations: GitHubCheckViolation[], processingTime: number) {
    const hasErrors = violations.some(v => v.severity === 'error');
    const hasWarnings = violations.some(v => v.severity === 'warning');

    return {
      name: 'Accessibility Review',
      head_sha: event.pull_request.head.sha,
      status: 'completed' as const,
      conclusion: hasErrors ? 'failure' as const : 
                  hasWarnings ? 'neutral' as const : 'success' as const,
      output: {
        title: violations.length > 0 ? `Found ${violations.length} accessibility violation(s)` : 'No violations found',
        summary: `WCAG 2.2 AA compliance check completed in ${processingTime}ms`,
        annotations_count: violations.length
      }
    };
  }

  private buildAnalysisSummary(violations: GitHubCheckViolation[]) {
    const errors = violations.filter(v => v.severity === 'error').length;
    const warnings = violations.filter(v => v.severity === 'warning').length;
    const info = violations.filter(v => v.severity === 'info').length;

    return {
      totalViolations: violations.length,
      errors,
      warnings,
      info,
      complianceScore: violations.length === 0 ? 100 : Math.max(0, 100 - (errors * 10 + warnings * 2)),
      estimatedFixTime: `${violations.length * 2} minutes`
    };
  }

  private async postAnalysisResults(event: PullRequestEvent, analysisResult: PRAnalysisResult): Promise<void> {
    const { repository, pull_request } = event;
    const [owner, repo] = repository.full_name.split('/');

    try {
      // Create check run
      const checkRun = await this.checkRunManager.createCheckRun(owner, repo, analysisResult);
      
      console.log(`Posted check run to PR #${pull_request.number}: ${checkRun.html_url}`);
      
    } catch (error) {
      console.error('Failed to post analysis results:', error);
      throw error;
    }
  }

  private async postErrorStatus(event: PullRequestEvent, errorMessage: string): Promise<void> {
    const { repository, pull_request } = event;
    const [owner, repo] = repository.full_name.split('/');

    const checkRun = {
      name: 'Accessibility Review',
      head_sha: event.pull_request.head.sha,
      status: 'completed' as const,
      conclusion: 'failure' as const,
      output: {
        title: 'Accessibility analysis failed',
        summary: `Error during analysis: ${errorMessage}`,
        text: 'Please check the server logs for more details.'
      }
    };

    try {
      await this.checkRunManager.createCheckRun(owner, repo, {
        prNumber: pull_request.number,
        repository: repository.full_name,
        branch: pull_request.head.ref,
        totalFiles: 0,
        analyzedFiles: 0,
        skippedFiles: 0,
        violations: [],
        summary: {
          totalViolations: 0,
          errors: 1,
          warnings: 0,
          info: 0,
          complianceScore: 0,
          estimatedFixTime: 'N/A'
        },
        checkRun,
        processingTime: 0
      });
    } catch (error) {
      console.error('Failed to post error status:', error);
    }
  }

  private isAnalysisRunning(prNumber: number): boolean {
    return this.activeCheckRuns.has(prNumber);
  }

  private startAnalysis(prNumber: number): void {
    this.activeCheckRuns.set(prNumber, {
      id: Date.now(),
      startTime: Date.now()
    });
  }

  private completeAnalysis(prNumber: number): void {
    this.activeCheckRuns.delete(prNumber);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getSampleJSXContent(filename: string): string {
    if (filename.includes('Button')) {
      return `<div onClick={handleClick}>Click me</div>`;
    } else if (filename.includes('Image')) {
      return `<img src="test.jpg" />`;
    } else {
      return `<div>Sample React component</div>`;
    }
  }

  private getSampleCSSContent(filename: string): string {
    return `.button {
  background: blue;
  color: white;
  /* Missing focus styles */
}`;
  }
}