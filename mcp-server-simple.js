#!/usr/bin/env node
/**
 * Simplified MCP Server for Accessibility Checking
 * Implements Model Context Protocol for GitHub Actions integration
 * Supports stdio communication
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';

// Import our existing accessibility analyzer
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Accessibility analyzer (same logic as cli-scanner.js)
 */
function analyzeFile(content, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const violations = [];
  let line = 1;
  let match;
  
  // JSX/TSX/JS/HTML analysis
  if (['.jsx', '.tsx', '.js', '.html', '.htm'].includes(ext)) {
    
    // 1. Missing alt attributes
    const imgRegex = /<img[^>]*>/gi;
    while ((match = imgRegex.exec(content)) !== null) {
      if (!match[0].includes('alt=')) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'img-missing-alt',
          severity: 'error',
          wcagCriteria: ['1.1.1'],
          title: 'Image missing alt attribute',
          description: 'All images must have an alt attribute for screen readers',
          help: 'Add alt attribute with meaningful description',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: ['Add alt="description" to the image tag'],
          tags: ['wcag-a', 'images']
        });
      }
    }

    // 2. Div used as button
    const divButtonRegex = /<div[^>]*(onclick|onClick)[^>]*>/gi;
    while ((match = divButtonRegex.exec(content)) !== null) {
      line = content.substring(0, match.index).split('\n').length;
      violations.push({
        id: 'div-button',
        severity: 'error',
        wcagCriteria: ['1.3.1', '4.1.2'],
        title: 'Interactive div should be a button',
        description: 'Div with click handler should be a semantic button element',
        help: 'Replace with <button> or add proper ARIA role and keyboard support',
        line,
        column: 1,
        code: match[0],
        fixSuggestions: [
          'Replace <div onClick> with <button>',
          'Add role="button" tabIndex="0" and keyboard handlers'
        ],
        tags: ['wcag-a', 'semantic-html']
      });
    }

    // 3. Buttons with no accessible name
    const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
    while ((match = buttonRegex.exec(content)) !== null) {
      const buttonContent = match[1].replace(/<!--.*?-->/gs, '').replace(/<[^>]+>/g, '').trim();
      const hasAriaLabel = match[0].includes('aria-label');
      
      if (!buttonContent && !hasAriaLabel) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'button-missing-accessible-name',
          severity: 'error',
          wcagCriteria: ['4.1.2'],
          title: 'Button has no accessible name',
          description: 'Button must have text content or aria-label',
          help: 'Add visible text or aria-label attribute',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: ['Add text inside button', 'Add aria-label="description"'],
          tags: ['wcag-a', 'buttons']
        });
      }
    }

    // 4. Form inputs missing labels
    const inputRegex = /<input[^>]*>/gi;
    while ((match = inputRegex.exec(content)) !== null) {
      const hasId = /id=["']([^"']+)["']/.exec(match[0]);
      const hasAriaLabel = match[0].includes('aria-label');
      const hasAriaLabelledBy = match[0].includes('aria-labelledby');
      const inputType = /type=["']([^"']+)["']/.exec(match[0]);
      const type = inputType ? inputType[1] : 'text';
      
      if (type === 'hidden' || type === 'submit' || type === 'button') continue;
      
      if (hasId && !hasAriaLabel && !hasAriaLabelledBy) {
        const inputId = hasId[1];
        const labelRegex = new RegExp(`<label[^>]*for=["']${inputId}["'][^>]*>`, 'i');
        
        if (!labelRegex.test(content)) {
          line = content.substring(0, match.index).split('\n').length;
          violations.push({
            id: 'input-missing-label',
            severity: 'error',
            wcagCriteria: ['1.3.1', '3.3.2'],
            title: 'Form input missing label',
            description: 'All form inputs must have an associated label',
            help: 'Add a <label> element or aria-label attribute',
            line,
            column: 1,
            code: match[0],
            fixSuggestions: [`Add <label for="${inputId}">Label</label>`],
            tags: ['wcag-a', 'forms']
          });
        }
      }
    }

    // 5. Links with non-descriptive text
    const linkRegex = /<a[^>]*>(.*?)<\/a>/gi;
    while ((match = linkRegex.exec(content)) !== null) {
      const linkText = match[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
      const badTexts = ['click here', 'here', 'read more', 'more', 'link'];
      
      if (badTexts.includes(linkText)) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'link-non-descriptive',
          severity: 'warning',
          wcagCriteria: ['2.4.4'],
          title: 'Link text not descriptive',
          description: `Link text "${linkText}" is not meaningful out of context`,
          help: 'Use descriptive link text',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: ['Use descriptive text instead of "' + linkText + '"'],
          tags: ['wcag-aa', 'links']
        });
      }
    }
  }

  // HTML-only checks
  if (['.html', '.htm'].includes(ext)) {
    if (!/<html[^>]*lang=/i.test(content)) {
      violations.push({
        id: 'html-missing-lang',
        severity: 'error',
        wcagCriteria: ['3.1.1'],
        title: 'HTML missing lang attribute',
        description: 'The <html> element must have a lang attribute',
        help: 'Add lang attribute',
        line: 1,
        column: 1,
        code: '<html>',
        fixSuggestions: ['Add lang="en" to <html> tag'],
        tags: ['wcag-a']
      });
    }
  }

  // CSS/SCSS checks
  if (['.css', '.scss'].includes(ext)) {
    if (!/:focus[^}]*/g.test(content)) {
      violations.push({
        id: 'missing-focus-styles',
        severity: 'warning',
        wcagCriteria: ['2.4.7'],
        title: 'No focus styles defined',
        description: 'CSS should include :focus styles for keyboard navigation',
        help: 'Add :focus styles',
        line: 1,
        column: 1,
        code: '',
        fixSuggestions: ['Add :focus styles for interactive elements'],
        tags: ['wcag-aa', 'focus']
      });
    }

    const outlineNoneRegex = /outline\s*:\s*none/gi;
    while ((match = outlineNoneRegex.exec(content)) !== null) {
      line = content.substring(0, match.index).split('\n').length;
      violations.push({
        id: 'outline-none-no-alternative',
        severity: 'error',
        wcagCriteria: ['2.4.7'],
        title: 'Removed focus outline without alternative',
        description: 'outline: none removes keyboard focus indicator',
        help: 'Provide alternative focus indicator',
        line,
        column: 1,
        code: match[0],
        fixSuggestions: ['Add custom focus style or remove outline: none'],
        tags: ['wcag-aa', 'focus']
      });
    }
  }

  return violations;
}

/**
 * MCP Server Implementation
 */
class AccessibilityMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'accessibility-reviewer',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'check_accessibility',
            description: 'Check a file for WCAG 2.2 AA accessibility violations',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the file to check'
                },
                content: {
                  type: 'string',
                  description: 'File content to analyze (optional if filePath is provided)'
                }
              },
              required: ['filePath']
            }
          },
          {
            name: 'check_accessibility_batch',
            description: 'Check multiple files for accessibility violations',
            inputSchema: {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      path: { type: 'string' },
                      content: { type: 'string' }
                    },
                    required: ['path', 'content']
                  },
                  description: 'Array of files to check'
                }
              },
              required: ['files']
            }
          },
          {
            name: 'suggest_fix',
            description: 'Get fix suggestions for a specific violation',
            inputSchema: {
              type: 'object',
              properties: {
                violationId: {
                  type: 'string',
                  description: 'ID of the violation to get fixes for'
                },
                code: {
                  type: 'string',
                  description: 'Code snippet with the violation'
                }
              },
              required: ['violationId', 'code']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'check_accessibility':
            return await this.handleCheckAccessibility(args);
          
          case 'check_accessibility_batch':
            return await this.handleCheckAccessibilityBatch(args);
          
          case 'suggest_fix':
            return await this.handleSuggestFix(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async handleCheckAccessibility(args) {
    const { filePath, content } = args;

    let fileContent = content;
    if (!fileContent) {
      if (!fs.existsSync(filePath)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `File not found: ${filePath}`
        );
      }
      fileContent = fs.readFileSync(filePath, 'utf8');
    }

    const violations = analyzeFile(fileContent, filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    let fileType = 'unknown';
    if (['.jsx'].includes(ext)) fileType = 'jsx';
    else if (['.tsx'].includes(ext)) fileType = 'tsx';
    else if (['.js'].includes(ext)) fileType = 'js';
    else if (['.html', '.htm'].includes(ext)) fileType = 'html';
    else if (['.css'].includes(ext)) fileType = 'css';
    else if (['.scss'].includes(ext)) fileType = 'scss';

    const result = {
      filePath,
      fileType,
      violations,
      summary: {
        totalViolations: violations.length,
        errors: violations.filter(v => v.severity === 'error').length,
        warnings: violations.filter(v => v.severity === 'warning').length,
        wcagCriteria: [...new Set(violations.flatMap(v => v.wcagCriteria))]
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  async handleCheckAccessibilityBatch(args) {
    const { files } = args;
    const results = [];

    for (const file of files) {
      try {
        const violations = analyzeFile(file.content, file.path);
        results.push({
          filePath: file.path,
          violations,
          summary: {
            totalViolations: violations.length,
            errors: violations.filter(v => v.severity === 'error').length,
            warnings: violations.filter(v => v.severity === 'warning').length
          }
        });
      } catch (error) {
        results.push({
          filePath: file.path,
          error: error.message,
          violations: []
        });
      }
    }

    const overallSummary = {
      filesChecked: files.length,
      filesWithViolations: results.filter(r => r.violations && r.violations.length > 0).length,
      totalViolations: results.reduce((sum, r) => sum + (r.summary?.totalViolations || 0), 0),
      totalErrors: results.reduce((sum, r) => sum + (r.summary?.errors || 0), 0),
      totalWarnings: results.reduce((sum, r) => sum + (r.summary?.warnings || 0), 0)
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ results, summary: overallSummary }, null, 2)
        }
      ]
    };
  }

  async handleSuggestFix(args) {
    const { violationId, code } = args;

    const fixes = {
      'img-missing-alt': [
        'Add descriptive alt text: <img src="..." alt="Description of image content">',
        'For decorative images, use alt="": <img src="..." alt="">',
        'Consider if the image conveys meaningful information'
      ],
      'div-button': [
        'Replace with semantic button: <button onClick={handler}>Text</button>',
        'If div is required, add: role="button" tabIndex={0} onKeyDown={keyHandler}',
        'Ensure keyboard accessibility with Enter and Space key handlers'
      ],
      'button-missing-accessible-name': [
        'Add text content: <button>Click me</button>',
        'Or add aria-label: <button aria-label="Description">...</button>',
        'For icon buttons, always include accessible text or label'
      ],
      'input-missing-label': [
        'Add label element: <label htmlFor="inputId">Label</label><input id="inputId" />',
        'Or use aria-label: <input aria-label="Field description" />',
        'Labels help all users understand form fields'
      ],
      'link-non-descriptive': [
        'Use descriptive text: <a href="...">Read the full privacy policy</a>',
        'Add aria-label for context: <a href="..." aria-label="Read more about...">Read more</a>',
        'Avoid generic text like "click here" or "read more"'
      ],
      'html-missing-lang': [
        'Add lang attribute to html tag: <html lang="en">',
        'Use appropriate language code (en, es, fr, etc.)',
        'This helps screen readers pronounce content correctly'
      ],
      'missing-focus-styles': [
        'Add focus styles: button:focus { outline: 2px solid blue; }',
        'Use :focus-visible for better UX: button:focus-visible { ... }',
        'Ensure focus indicators are clearly visible'
      ],
      'outline-none-no-alternative': [
        'Add custom focus style: button:focus { box-shadow: 0 0 0 3px rgba(0,0,255,0.3); }',
        'Or remove outline: none and keep default focus indicator',
        'Never remove focus styles without providing an alternative'
      ]
    };

    const suggestions = fixes[violationId] || [
      'Review WCAG 2.2 documentation for this violation',
      'Consult with accessibility team for specific guidance'
    ];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            violationId,
            code,
            suggestions
          }, null, 2)
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Accessibility MCP Server running on stdio');
  }
}

// Start the server
const server = new AccessibilityMCPServer();
server.run().catch(console.error);
