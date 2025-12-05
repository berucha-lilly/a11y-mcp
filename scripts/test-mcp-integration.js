#!/usr/bin/env node
/**
 * Test script to verify MCP server integration
 * Run this locally to test the MCP client before deploying to GitHub Actions
 */

import { checkAccessibility, checkAccessibilityBatch } from './mcp-client.js';
import fs from 'fs';
import path from 'path';

async function testMCPIntegration() {
  console.log('🧪 Testing MCP Server Integration\n');
  
  try {
    // Test 1: Single file check
    console.log('Test 1: Single file accessibility check');
    const testContent = `
      export const BadComponent = () => {
        return (
          <div>
            <img src="logo.png" />
            <div onClick={() => alert('hi')}>Click me</div>
            <button></button>
          </div>
        );
      };
    `;
    
    const result = await checkAccessibility('test-component.jsx', testContent);
    console.log('✅ Single file check passed');
    console.log(`   Found ${result.summary?.totalViolations || 0} violations`);
    console.log(`   Errors: ${result.summary?.errors || 0}, Warnings: ${result.summary?.warnings || 0}\n`);
    
    // Test 2: Batch check
    console.log('Test 2: Batch file check');
    const batchResult = await checkAccessibilityBatch([
      {
        path: 'test1.jsx',
        content: '<img src="test.png" />'
      },
      {
        path: 'test2.css',
        content: 'button { outline: none; }'
      }
    ]);
    
    console.log('✅ Batch check passed');
    console.log(`   Files checked: ${batchResult.summary?.filesChecked || 0}`);
    console.log(`   Total violations: ${batchResult.summary?.totalViolations || 0}\n`);
    
    // Test 3: Check with example files if they exist
    const examplesDir = path.join(process.cwd(), 'examples');
    if (fs.existsSync(examplesDir)) {
      console.log('Test 3: Checking example files');
      const exampleFiles = fs.readdirSync(examplesDir)
        .filter(f => /\.(jsx|tsx|js|ts|html|css|scss)$/.test(f))
        .slice(0, 3); // Test first 3 files
      
      if (exampleFiles.length > 0) {
        const exampleFilesToCheck = exampleFiles.map(f => ({
          path: path.join('examples', f),
          content: fs.readFileSync(path.join(examplesDir, f), 'utf8')
        }));
        
        const exampleResult = await checkAccessibilityBatch(exampleFilesToCheck);
        console.log('✅ Example files check passed');
        console.log(`   Files: ${exampleFiles.join(', ')}`);
        console.log(`   Violations found: ${exampleResult.summary?.totalViolations || 0}\n`);
      }
    }
    
    console.log('✅ All MCP integration tests passed!');
    console.log('🚀 Ready for GitHub Actions deployment');
    
  } catch (error) {
    console.error('❌ MCP integration test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testMCPIntegration();
