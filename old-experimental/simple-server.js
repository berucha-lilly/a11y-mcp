/**
 * Simplified MCP Server for GitHub Accessibility Reviewer
 * JavaScript version for testing without TypeScript compilation
 */

// Minimal MCP server implementation
import fs from 'fs';
import path from 'path';

// Simple accessibility checker for testing
class SimpleAccessibilityChecker {
  constructor() {
    this.rules = [
      {
        id: 'img-missing-alt',
        name: 'Images must have alt attributes',
        check: (code) => {
          const violations = [];
          const imgRegex = /<img[^>]*>/g;
          const matches = code.match(imgRegex);
          
          if (matches) {
            matches.forEach((img, index) => {
              if (!img.includes('alt=')) {
                violations.push({
                  id: 'img-missing-alt',
                  severity: 'error',
                  line: code.substring(0, code.indexOf(img)).split('\n').length,
                  description: 'Image missing alt attribute',
                  fix: 'Add alt attribute: <img src="..." alt="description">'
                });
              }
            });
          }
          
          return violations;
        }
      },
      {
        id: 'div-button',
        name: 'Use semantic button elements',
        check: (code) => {
          const violations = [];
          const divButtonRegex = /<div[^>]*onClick/g;
          const matches = code.match(divButtonRegex);
          
          if (matches) {
            matches.forEach((match) => {
              const lineNum = code.substring(0, code.indexOf(match)).split('\n').length;
              violations.push({
                id: 'div-button',
                severity: 'error',
                line: lineNum,
                description: 'Div with onClick should be a button element',
                fix: 'Replace <div onClick> with <button onClick>'
              });
            });
          }
          
          return violations;
        }
      },
      {
        id: 'missing-focus-styles',
        name: 'Missing CSS focus styles',
        check: (code) => {
          const violations = [];
          const hasFocusRegex = /:focus[^}]*/g;
          const matches = code.match(hasFocusRegex);
          
          if (!matches || matches.length === 0) {
            violations.push({
              id: 'missing-focus-styles',
              severity: 'warning',
              line: 1,
              description: 'CSS file may be missing focus styles',
              fix: 'Add :focus styles for keyboard navigation accessibility'
            });
          }
          
          return violations;
        }
      }
    ];
  }

  analyze(code, fileType) {
    const violations = [];
    
    this.rules.forEach(rule => {
      try {
        const ruleViolations = rule.check(code);
        violations.push(...ruleViolations);
      } catch (error) {
        console.warn(`Rule ${rule.id} failed:`, error.message);
      }
    });

    return {
      fileType,
      violations,
      statistics: {
        totalViolations: violations.length,
        errors: violations.filter(v => v.severity === 'error').length,
        warnings: violations.filter(v => v.severity === 'warning').length,
        estimatedFixTime: `${violations.length * 5} minutes`
      }
    };
  }
}

// MCP Server implementation
class SimpleMCPServer {
  constructor() {
    this.checker = new SimpleAccessibilityChecker();
    this.tools = [
      {
        name: 'check_accessibility',
        description: 'Analyze code for accessibility violations',
        parameters: {
          code: { type: 'string', required: true },
          fileType: { type: 'string', required: true, enum: ['jsx', 'tsx', 'js', 'css', 'scss'] }
        }
      },
      {
        name: 'suggest_fix',
        description: 'Get fix suggestions for violations',
        parameters: {
          violation: { type: 'object', required: true },
          code: { type: 'string', required: true }
        }
      }
    ];
  }

  async handleTool(toolName, args) {
    switch (toolName) {
      case 'check_accessibility':
        return this.handleCheckAccessibility(args);
      case 'suggest_fix':
        return this.handleSuggestFix(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  handleCheckAccessibility(args) {
    const { code, fileType } = args;
    
    if (!code || !fileType) {
      throw new Error('Code and fileType are required');
    }

    const result = this.checker.analyze(code, fileType);
    
    let summary = `Accessibility Analysis Results\n\n`;
    summary += `File Type: ${fileType.toUpperCase()}\n`;
    summary += `Violations Found: ${result.statistics.totalViolations}\n`;
    summary += `- Errors: ${result.statistics.errors}\n`;
    summary += `- Warnings: ${result.statistics.warnings}\n`;
    summary += `Estimated Fix Time: ${result.statistics.estimatedFixTime}\n\n`;

    if (result.violations.length > 0) {
      summary += `Issues Found:\n`;
      result.violations.forEach((violation, index) => {
        summary += `${index + 1}. [${violation.severity.toUpperCase()}] ${violation.title}\n`;
        summary += `   Line ${violation.line}: ${violation.description}\n`;
        summary += `   Fix: ${violation.fix}\n\n`;
      });
    } else {
      summary += '✅ No accessibility issues found!\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: summary
        }
      ]
    };
  }

  handleSuggestFix(args) {
    const { violation, code } = args;
    
    let suggestion = `Fix Suggestion for: ${violation.title || violation.id}\n\n`;
    suggestion += `Description: ${violation.description}\n`;
    suggestion += `Suggested Fix: ${violation.fix}\n`;
    
    if (violation.code) {
      suggestion += `\nCurrent Code:\n${violation.code}\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: suggestion
        }
      ]
    };
  }

  // MCP protocol handling
  async handleRequest(request) {
    try {
      const { method, params } = request;

      switch (method) {
        case 'tools/list':
          return {
            tools: this.tools.map(tool => ({
              name: tool.name,
              description: tool.description,
              inputSchema: {
                type: 'object',
                properties: tool.parameters,
                required: Object.keys(tool.parameters).filter(key => tool.parameters[key].required)
              }
            }))
          };

        case 'tools/call':
          const { name, arguments: args } = params;
          return await this.handleTool(name, args);

        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  async start() {
    console.error('Starting GitHub Accessibility Reviewer MCP Server (JavaScript version)...');
    console.error('Server ready for MCP requests');
    
    // Simple stdin/stdout handling for MCP protocol
    let buffer = '';
    
    process.stdin.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // Process complete JSON-RPC requests
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      lines.forEach(line => {
        if (line.trim()) {
          try {
            const request = JSON.parse(line);
            this.handleRequest(request)
              .then(result => {
                const response = { id: request.id, result };
                process.stdout.write(JSON.stringify(response) + '\n');
                process.stdout.flush();
              })
              .catch(error => {
                const errorResponse = { 
                  id: request.id, 
                  error: { message: error.message } 
                };
                process.stdout.write(JSON.stringify(errorResponse) + '\n');
                process.stdout.flush();
              });
          } catch (error) {
            console.error('Failed to parse request:', error);
          }
        }
      });
    });

    process.stdin.on('end', () => {
      console.error('MCP server shutting down');
    });

    // Keep process alive
    setInterval(() => {
      // Heartbeat
    }, 10000);
  }
}

// Start server
const server = new SimpleMCPServer();
server.start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});