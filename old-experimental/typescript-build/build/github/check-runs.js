/**
 * GitHub Check Run API Integration
 * Handles posting check results with annotations to GitHub PRs
 */
import { RateLimiter } from './rate-limiter.js';
export class CheckRunManager {
    rateLimiter;
    apiToken;
    apiUrl;
    constructor(apiToken, apiUrl = 'https://api.github.com') {
        this.apiToken = apiToken;
        this.apiUrl = apiUrl;
        this.rateLimiter = new RateLimiter();
    }
    async createCheckRun(owner, repo, analysisResult) {
        const checkRun = this.buildCheckRun(analysisResult);
        const response = await this.rateLimiter.execute(async () => {
            return await fetch(`${this.apiUrl}/repos/${owner}/${repo}/check-runs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'A11y-MCP-Server'
                },
                body: JSON.stringify(checkRun)
            });
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to create check run: ${response.status} ${error.message}`);
        }
        const result = await response.json();
        this.rateLimiter.updateRateLimit(response.headers);
        return {
            id: result.id,
            html_url: result.html_url
        };
    }
    async updateCheckRun(owner, repo, checkRunId, analysisResult) {
        const checkRun = this.buildCheckRun(analysisResult);
        const response = await this.rateLimiter.execute(async () => {
            return await fetch(`${this.apiUrl}/repos/${owner}/${repo}/check-runs/${checkRunId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'A11y-MCP-Server'
                },
                body: JSON.stringify(checkRun)
            });
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to update check run: ${response.status} ${error.message}`);
        }
        const result = await response.json();
        this.rateLimiter.updateRateLimit(response.headers);
        return {
            id: result.id,
            html_url: result.html_url
        };
    }
    buildCheckRun(analysisResult) {
        const { summary, violations, checkRun } = analysisResult;
        // Build annotations from violations
        const annotations = this.buildAnnotations(violations);
        return {
            ...checkRun,
            output: {
                title: `Accessibility Analysis Results`,
                summary: this.buildSummary(summary, annotations.length),
                annotations_count: annotations.length
            }
        };
    }
    buildAnnotations(violations) {
        return violations.map(violation => {
            const severityToLevel = (severity) => {
                switch (severity) {
                    case 'error': return 'failure';
                    case 'warning': return 'warning';
                    case 'info': return 'notice';
                    default: return 'warning';
                }
            };
            return {
                path: violation.file,
                start_line: violation.line,
                end_line: violation.endLine || violation.line,
                start_column: violation.column,
                end_column: violation.column ? violation.column + 1 : undefined,
                annotation_level: severityToLevel(violation.severity),
                message: violation.description,
                title: `[${violation.severity.toUpperCase()}] ${violation.title}`,
                raw_details: this.buildViolationDetails(violation)
            };
        });
    }
    buildViolationDetails(violation) {
        let details = `WCAG Criteria: ${violation.wcagCriteria.join(', ')}\n\n`;
        if (violation.codeSnippet) {
            details += `Problematic Code:\n\`\`\`\n${violation.codeSnippet}\n\`\`\`\n\n`;
        }
        details += `Suggested Fix:\n${violation.fixSuggestion}\n\n`;
        if (violation.severity === 'error') {
            details += `⚠️ **Action Required**: This violation must be fixed before merge.`;
        }
        else if (violation.severity === 'warning') {
            details += `⚠️ **Recommended**: Consider fixing this to improve accessibility.`;
        }
        return details;
    }
    buildSummary(summary, annotationCount) {
        let summaryText = `# Accessibility Analysis Results\n\n`;
        summaryText += `**Compliance Score**: ${summary.complianceScore}%\n\n`;
        summaryText += `**Violations Found**: ${summary.totalViolations}\n`;
        summaryText += `- 🔴 Errors: ${summary.errors}\n`;
        summaryText += `- 🟡 Warnings: ${summary.warnings}\n`;
        summaryText += `- 🟢 Info: ${summary.totalViolations - summary.errors - summary.warnings}\n\n`;
        summaryText += `**Estimated Fix Time**: ${summary.estimatedFixTime}\n\n`;
        if (summary.totalViolations > 0) {
            summaryText += `## 🔍 Analysis Details\n\n`;
            summaryText += `The accessibility scan identified ${summary.totalViolations} issue(s) across ${annotationCount} file(s). `;
            if (summary.errors > 0) {
                summaryText += `${summary.errors} critical error(s) must be fixed before merging.\n\n`;
            }
            else {
                summaryText += `No critical errors found.\n\n`;
            }
            summaryText += `### 📋 Next Steps\n\n`;
            summaryText += `1. Review the inline annotations below\n`;
            summaryText += `2. Fix all error-level violations\n`;
            summaryText += `3. Consider addressing warning-level violations\n`;
            summaryText += `4. Re-run the accessibility check after fixes\n\n`;
            summaryText += `### 📚 Resources\n\n`;
            summaryText += `- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)\n`;
            summaryText += `- [LDS Storybook](https://storybook.lilly.internal)\n`;
            summaryText += `- [Accessibility Testing Tools](https://github.com/dequelabs/axe-core)\n`;
        }
        else {
            summaryText += `## ✅ Excellent!\n\n`;
            summaryText += `No accessibility violations found. This code meets WCAG 2.2 AA standards.\n\n`;
        }
        summaryText += `---\n`;
        summaryText += `*Analysis performed by A11y-MCP Server v1.0.0*\n`;
        return summaryText;
    }
    async getCheckRun(owner, repo, checkRunId) {
        const response = await this.rateLimiter.execute(async () => {
            return await fetch(`${this.apiUrl}/repos/${owner}/${repo}/check-runs/${checkRunId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Accept': 'application/vnd.github+json',
                    'User-Agent': 'A11y-MCP-Server'
                }
            });
        });
        if (!response.ok) {
            throw new Error(`Failed to get check run: ${response.status}`);
        }
        const result = await response.json();
        this.rateLimiter.updateRateLimit(response.headers);
        return result;
    }
}
