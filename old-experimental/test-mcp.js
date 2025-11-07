#!/usr/bin/env node

// Test script for the MCP server
import { spawn } from 'child_process';

function testMCPServer() {
  console.log('Testing GitHub Accessibility Reviewer MCP Server...\n');

  // Start the server
  const server = spawn('node', ['simple-server.js'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let error = '';

  server.stdout.on('data', (data) => {
    output += data.toString();
    console.log('Server output:', data.toString());
  });

  server.stderr.on('data', (data) => {
    error += data.toString();
    console.error('Server error:', data.toString());
  });

  // Test tools/list request
  setTimeout(() => {
    const toolsRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    }) + '\n';

    console.log('\nSending tools/list request...');
    server.stdin.write(toolsRequest);
  }, 1000);

  // Test check_accessibility request
  setTimeout(() => {
    const accessibilityRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'check_accessibility',
        arguments: {
          code: '<img src="test.jpg" /><div onClick={handleClick}>Click</div>',
          fileType: 'jsx'
        }
      }
    }) + '\n';

    console.log('\nSending check_accessibility request...');
    server.stdin.write(accessibilityRequest);
  }, 2000);

  // Test suggest_fix request
  setTimeout(() => {
    const fixRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'suggest_fix',
        arguments: {
          violation: {
            id: 'img-missing-alt',
            title: 'Image missing alt attribute',
            description: 'Image element is missing alt attribute for accessibility'
          },
          code: '<img src="test.jpg" />'
        }
      }
    }) + '\n';

    console.log('\nSending suggest_fix request...');
    server.stdin.write(fixRequest);
  }, 3000);

  // Cleanup
  setTimeout(() => {
    console.log('\nShutting down server...');
    server.kill();
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Server responses:');
    console.log(output);
    if (error) {
      console.log('Server errors:');
      console.log(error);
    }
  }, 5000);
}

testMCPServer();