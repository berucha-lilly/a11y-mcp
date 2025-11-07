/**
 * GitHub File Analyzer
 * Handles file parsing and change analysis for PRs
 */
import { GitHubFile } from '../types/github.js';
export interface ParsedChange {
    type: 'addition' | 'deletion' | 'modification';
    startLine: number;
    endLine: number;
    content: string;
    isRelevant: boolean;
}
export declare class FileAnalyzer {
    /**
     * Parse PR changes to identify relevant accessibility issues
     */
    parsePRChanges(files: GitHubFile[]): ParsedChange[];
    /**
     * Parse individual file patch to extract line changes
     */
    private parsePatch;
    /**
     * Determine if a line change is relevant for accessibility analysis
     */
    private isLineRelevant;
    /**
     * Extract code snippets around specific lines for context
     */
    extractCodeContext(content: string, targetLine: number, contextLines?: number): string;
    /**
     * Identify the specific accessibility issue in a code change
     */
    identifyAccessibilityIssue(content: string, filename: string): {
        issue: string;
        severity: 'error' | 'warning' | 'info';
        line: number;
        fix: string;
    } | null;
    private isFileTypeSupported;
    /**
     * Calculate impact score for a file change
     */
    calculateImpactScore(file: GitHubFile, changes: ParsedChange[]): number;
    private getFileExtension;
    /**
     * Get suggested review priority for a file
     */
    getReviewPriority(file: GitHubFile): 'high' | 'medium' | 'low';
}
