#!/usr/bin/env node
/**
 * Production-Ready MCP Server for GitHub Accessibility Reviewer
 * Hybrid approach: Fast regex + AST parsing for comprehensive WCAG 2.2 AA enforcement
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { analyzeFileHybrid } from './core/hybrid-analyzer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Production MCP Server
 */
class ProductionMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'accessibility-reviewer',
        version: '2.0.0',
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
            description: 'Analyze a file for WCAG 2.2 AA accessibility violations using hybrid analysis (fast regex + AST)',
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
            description: 'Analyze multiple files for accessibility violations',
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
            description: 'Get detailed fix suggestions for a specific violation',
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

    const violations = await analyzeFileHybrid(fileContent, filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    let fileType = 'unknown';
    if (['.jsx'].includes(ext)) fileType = 'jsx';
    else if (['.tsx'].includes(ext)) fileType = 'tsx';
    else if (['.js'].includes(ext)) fileType = 'js';
    else if (['.ts'].includes(ext)) fileType = 'ts';
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
        wcagCriteria: [...new Set(violations.flatMap(v => v.wcagCriteria || []))]
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
        const violations = await analyzeFileHybrid(file.content, file.path);
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
      'aria-invalid-role': [
        'Use a valid ARIA role from the ARIA specification',
        'Common roles: button, link, menuitem, tab, checkbox, radio',
        'See: https://www.w3.org/TR/wai-aria-1.2/#roles'
      ],
      'missing-keyboard-handler': [
        'Add onKeyDown handler: onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { handleClick(); } }}',
        'Or use semantic <button> element which handles keyboard automatically'
      ],
      'color-contrast-insufficient': [
        'Use darker text or lighter background to achieve 4.5:1 contrast',
        'For large text (18pt+), minimum is 3:1',
        'Use online contrast checkers to verify: https://webaim.org/resources/contrastchecker/'
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
    console.error('Production Accessibility MCP Server running on stdio');
  }
}

// Start the server
const server = new ProductionMCPServer();
server.run().catch(console.error);
