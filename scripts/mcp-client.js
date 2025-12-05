#!/usr/bin/env node
/**
 * MCP Client for GitHub Actions
 * Communicates with the MCP server via JSON-RPC over stdio
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Call MCP server tool via JSON-RPC
 */
function callMCPServer(method, params = {}) {
  return new Promise((resolve, reject) => {
    // Try multiple possible locations for MCP server
    // 1. In source repo: src/mcp-server.js
    // 2. In integrated repo: .github/a11y-mcp/mcp-server.js
    // 3. Environment variable override
    const possiblePaths = [
      process.env.MCP_SERVER_PATH,
      path.join(__dirname, '..', 'src', 'mcp-server.js'),
      path.join(__dirname, '..', '.github', 'a11y-mcp', 'mcp-server.js'),
      path.join(process.cwd(), '.github', 'a11y-mcp', 'mcp-server.js')
    ].filter(Boolean); // Remove undefined values
    
    let mcpServerPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        mcpServerPath = possiblePath;
        break;
      }
    }
    
    if (!mcpServerPath) {
      reject(new Error(`MCP server not found. Tried: ${possiblePaths.join(', ')}`));
      return;
    }

    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    };

    const child = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let responseReceived = false;

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      const stderrText = data.toString();
      stderr += stderrText;
      // MCP server logs to stderr, but we can ignore non-error logs
      if (stderrText.includes('Error') || stderrText.includes('error')) {
        console.error('MCP Server stderr:', stderrText);
      }
    });

    // Set timeout for response
    const timeout = setTimeout(() => {
      if (!responseReceived) {
        child.kill();
        reject(new Error(`MCP server timeout after 30 seconds. Stdout: ${stdout.substring(0, 500)}`));
      }
    }, 30000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      responseReceived = true;

      try {
        // MCP server sends JSON-RPC responses via stdout
        // Parse the response
        let response = null;
        
        // Try to find JSON in stdout (might have multiple lines)
        const lines = stdout.trim().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              const parsed = JSON.parse(trimmed);
              // Check if it's a JSON-RPC response
              if (parsed.jsonrpc === '2.0' && parsed.id === request.id) {
                response = parsed;
                break;
              }
            } catch (e) {
              // Not valid JSON, continue
            }
          }
        }

        // If no response found, try parsing entire stdout
        if (!response && stdout.trim()) {
          try {
            const parsed = JSON.parse(stdout.trim());
            if (parsed.jsonrpc === '2.0') {
              response = parsed;
            }
          } catch (e) {
            // Not JSON
          }
        }

        if (!response) {
          reject(new Error(`Failed to parse MCP response. Code: ${code}\nStdout: ${stdout}\nStderr: ${stderr}`));
          return;
        }

        if (response.error) {
          reject(new Error(`MCP Error: ${response.error.message || JSON.stringify(response.error)}`));
          return;
        }

        resolve(response.result || response);
      } catch (error) {
        reject(new Error(`Failed to parse MCP response: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to spawn MCP server: ${error.message}`));
    });

    // Send request to MCP server (JSON-RPC over stdio)
    try {
      child.stdin.write(JSON.stringify(request) + '\n');
      child.stdin.end();
    } catch (error) {
      clearTimeout(timeout);
      reject(new Error(`Failed to write to MCP server: ${error.message}`));
    }
  });
}

/**
 * Check accessibility for a single file
 */
export async function checkAccessibility(filePath, content) {
  try {
    const result = await callMCPServer('tools/call', {
      name: 'check_accessibility',
      arguments: {
        filePath,
        content
      }
    });

    // Parse the result (MCP returns content as text with JSON)
    if (result && result.content && result.content[0]) {
      const jsonText = result.content[0].text;
      return JSON.parse(jsonText);
    }

    throw new Error('Unexpected MCP response format');
  } catch (error) {
    console.error(`Error checking ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Check accessibility for multiple files (batch)
 */
export async function checkAccessibilityBatch(files) {
  try {
    const result = await callMCPServer('tools/call', {
      name: 'check_accessibility_batch',
      arguments: {
        files: files.map(f => ({
          path: f.path,
          content: f.content
        }))
      }
    });

    // Parse the result
    if (result && result.content && result.content[0]) {
      const jsonText = result.content[0].text;
      return JSON.parse(jsonText);
    }

    throw new Error('Unexpected MCP response format');
  } catch (error) {
    console.error('Error in batch check:', error.message);
    throw error;
  }
}

/**
 * Get fix suggestions for a violation
 */
export async function suggestFix(violationId, code) {
  try {
    const result = await callMCPServer('tools/call', {
      name: 'suggest_fix',
      arguments: {
        violationId,
        code
      }
    });

    if (result && result.content && result.content[0]) {
      const jsonText = result.content[0].text;
      return JSON.parse(jsonText);
    }

    throw new Error('Unexpected MCP response format');
  } catch (error) {
    console.error(`Error getting fix suggestions for ${violationId}:`, error.message);
    throw error;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  if (command === 'test') {
    // Test the MCP server connection
    callMCPServer('tools/list')
      .then(result => {
        console.log('✅ MCP Server is working!');
        console.log('Available tools:', JSON.stringify(result, null, 2));
      })
      .catch(error => {
        console.error('❌ MCP Server test failed:', error.message);
        process.exit(1);
      });
  } else {
    console.log('Usage: node mcp-client.js test');
    process.exit(1);
  }
}
