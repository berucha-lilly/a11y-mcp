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

export class FileAnalyzer {
  /**
   * Parse PR changes to identify relevant accessibility issues
   */
  parsePRChanges(files: GitHubFile[]): ParsedChange[] {
    const changes: ParsedChange[] = [];

    files.forEach(file => {
      if (file.patch && this.isFileTypeSupported(file.filename)) {
        const fileChanges = this.parsePatch(file);
        changes.push(...fileChanges);
      }
    });

    return changes;
  }

  /**
   * Parse individual file patch to extract line changes
   */
  private parsePatch(file: GitHubFile): ParsedChange[] {
    if (!file.patch) return [];

    const lines = file.patch.split('\n');
    const changes: ParsedChange[] = [];
    let currentLine = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Parse line range header
        const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
        if (match) {
          currentLine = parseInt(match[1]);
        }
      } else if (line.startsWith('+')) {
        // Addition
        if (!line.startsWith('+++')) {
          changes.push({
            type: 'addition',
            startLine: currentLine,
            endLine: currentLine,
            content: line.substring(1),
            isRelevant: this.isLineRelevant(line.substring(1), file.filename)
          });
          currentLine++;
        }
      } else if (line.startsWith('-')) {
        // Deletion
        if (!line.startsWith('---')) {
          changes.push({
            type: 'deletion',
            startLine: currentLine,
            endLine: currentLine,
            content: line.substring(1),
            isRelevant: this.isLineRelevant(line.substring(1), file.filename)
          });
        }
      } else {
        // Context line
        currentLine++;
      }
    }

    return changes.filter(change => change.isRelevant);
  }

  /**
   * Determine if a line change is relevant for accessibility analysis
   */
  private isLineRelevant(content: string, filename: string): boolean {
    const trimmed = content.trim();

    // Skip comments and whitespace
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return false;
    }

    // Check for accessibility-relevant patterns
    const accessibilityPatterns = [
      // JSX/React patterns
      /<img[^>]*>/,                    // Image elements
      /<div[^>]*onClick/,             // Div with click handlers
      /<button[^>]*>/,                // Button elements
      /<input[^>]*>/,                 // Input elements
      /<form[^>]*>/,                  // Form elements
      /<a[^>]*href/,                  // Link elements
      /aria-label|aria-labelledby|aria-describedby/, // ARIA attributes
      /tabIndex|role=/,               // Accessibility attributes
      /alt=|title=/,                  // Alt and title attributes

      // CSS patterns
      /:focus/,                       // Focus styles
      /:hover/,                       // Hover styles
      /outline/,                      // Outline styles
      /color\s*:|background/,         // Color properties
      /font-size/,                    // Font size
      /line-height/,                  // Line height
    ];

    return accessibilityPatterns.some(pattern => pattern.test(trimmed));
  }

  /**
   * Extract code snippets around specific lines for context
   */
  extractCodeContext(content: string, targetLine: number, contextLines: number = 3): string {
    const lines = content.split('\n');
    const start = Math.max(0, targetLine - contextLines - 1);
    const end = Math.min(lines.length, targetLine + contextLines);
    
    const context = lines.slice(start, end);
    const lineNumbers = Array.from({ length: end - start }, (_, i) => start + i + 1);
    
    return context.map((line, index) => 
      `${lineNumbers[index].toString().padStart(3)}: ${line}`
    ).join('\n');
  }

  /**
   * Identify the specific accessibility issue in a code change
   */
  identifyAccessibilityIssue(content: string, filename: string): {
    issue: string;
    severity: 'error' | 'warning' | 'info';
    line: number;
    fix: string;
  } | null {
    const trimmed = content.trim();

    // Image without alt attribute
    if (/<img[^>]*>/.test(trimmed) && !/alt=/.test(trimmed)) {
      return {
        issue: 'Image missing alt attribute',
        severity: 'error',
        line: 1,
        fix: 'Add alt attribute: <img src="..." alt="Description of image">'
      };
    }

    // Div used as button
    if (/<div[^>]*onClick/.test(trimmed)) {
      return {
        issue: 'Non-semantic interactive element',
        severity: 'error',
        line: 1,
        fix: 'Use semantic <button> element instead of <div>'
      };
    }

    // Button without accessible name
    if (/<button[^>]*>/.test(trimmed) && !/aria-label|children/.test(trimmed)) {
      return {
        issue: 'Button missing accessible name',
        severity: 'error',
        line: 1,
        fix: 'Add aria-label or ensure button has text content'
      };
    }

    // Missing focus styles in CSS
    if (filename.endsWith('.css') && /:focus/.test(trimmed) === false) {
      if (/\.(button|input|select)/.test(trimmed) && !/cursor:\s*pointer/.test(trimmed)) {
        return {
          issue: 'Missing focus styles for interactive element',
          severity: 'warning',
          line: 1,
          fix: 'Add :focus and :focus-visible styles'
        };
      }
    }

    // Missing aria-label on interactive elements
    if (/<(button|input|select|a)[^>]*>/.test(trimmed) && !/aria-label/.test(trimmed)) {
      return {
        issue: 'Interactive element missing accessible name',
        severity: 'error',
        line: 1,
        fix: 'Add aria-label attribute for screen reader users'
      };
    }

    return null;
  }

  private isFileTypeSupported(filename: string): boolean {
    const supportedExtensions = ['.tsx', '.jsx', '.ts', '.js', '.css', '.scss'];
    return supportedExtensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Calculate impact score for a file change
   */
  calculateImpactScore(file: GitHubFile, changes: ParsedChange[]): number {
    let score = 0;

    // Base score by file type
    const typeScore = {
      '.tsx': 10,
      '.jsx': 10,
      '.ts': 8,
      '.js': 8,
      '.css': 6,
      '.scss': 6
    };

    const ext = this.getFileExtension(file.filename);
    score += typeScore[ext] || 0;

    // Add score for number of relevant changes
    score += changes.filter(c => c.isRelevant).length * 5;

    // Add score for file size (more lines = higher potential impact)
    score += Math.min(file.changes / 10, 20);

    // Add score for type of change
    switch (file.status) {
      case 'added':
        score += 15;
        break;
      case 'modified':
        score += 10;
        break;
      case 'renamed':
        score += 5;
        break;
    }

    return Math.min(score, 100); // Cap at 100
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  /**
   * Get suggested review priority for a file
   */
  getReviewPriority(file: GitHubFile): 'high' | 'medium' | 'low' {
    const impactScore = this.calculateImpactScore(file, []);
    
    if (impactScore >= 70) return 'high';
    if (impactScore >= 40) return 'medium';
    return 'low';
  }
}