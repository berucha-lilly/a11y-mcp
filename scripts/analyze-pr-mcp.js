#!/usr/bin/env node
/**
 * GitHub Actions PR Analyzer using MCP Server
 * Analyzes PR files for accessibility violations via MCP protocol
 */

import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import { checkAccessibilityBatch } from './mcp-client.js';

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

async function analyzePR() {
  try {
    const [owner, repo] = process.env.REPOSITORY.split('/');
    const prNumber = parseInt(process.env.PR_NUMBER);
    
    console.log(`📋 Analyzing PR #${prNumber} in ${owner}/${repo}`);
    
    // Get PR details
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });
    
    console.log(`📊 PR Title: ${pr.title}`);
    console.log(`🌿 Branch: ${pr.head.ref}`);
    
    // Get changed files
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100
    });
    
    console.log(`📄 Found ${files.length} changed files`);
    
    // Filter relevant files
    const relevantFiles = files.filter(file => {
      const ext = path.extname(file.filename).toLowerCase();
      const supportedExts = ['.tsx', '.jsx', '.ts', '.js', '.html', '.htm', '.css', '.scss'];
      return supportedExts.includes(ext) &&
             !file.filename.includes('test.') &&
             !file.filename.includes('stories.') &&
             !file.filename.includes('.test.') &&
             !file.filename.includes('.spec.') &&
             file.status !== 'removed';
    });
    
    console.log(`🎯 ${relevantFiles.length} files relevant for accessibility analysis`);
    
    if (relevantFiles.length === 0) {
      console.log('✅ No files to analyze');
      const results = {
        prNumber,
        repository: `${owner}/${repo}`,
        branch: pr.head.ref,
        totalFiles: files.length,
        analyzedFiles: 0,
        violations: [],
        summary: {
          totalViolations: 0,
          errors: 0,
          warnings: 0,
          info: 0
        },
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync('a11y-results.json', JSON.stringify(results, null, 2));
      return results;
    }
    
    // Fetch file contents and prepare for batch analysis
    const filesToCheck = [];
    
    for (const file of relevantFiles) {
      try {
        // Get file content at the PR branch
        const { data: content } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.filename,
          ref: pr.head.sha
        });
        
        if ('content' in content) {
          const decodedContent = Buffer.from(content.content, 'base64').toString('utf-8');
          filesToCheck.push({
            path: file.filename,
            content: decodedContent
          });
        }
      } catch (error) {
        console.warn(`⚠️  Failed to fetch ${file.filename}:`, error.message);
      }
    }
    
    if (filesToCheck.length === 0) {
      console.log('⚠️  No file contents could be fetched');
      const results = {
        prNumber,
        repository: `${owner}/${repo}`,
        branch: pr.head.ref,
        totalFiles: files.length,
        analyzedFiles: 0,
        violations: [],
        summary: {
          totalViolations: 0,
          errors: 0,
          warnings: 0,
          info: 0
        },
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync('a11y-results.json', JSON.stringify(results, null, 2));
      return results;
    }
    
    console.log(`🔍 Analyzing ${filesToCheck.length} files via MCP server...`);
    
    // Use MCP server for analysis (this is the proper MCP integration)
    let batchResults = [];
    let overallSummary = {};
    
    try {
      const mcpResult = await checkAccessibilityBatch(filesToCheck);
      
      if (mcpResult && mcpResult.results) {
        batchResults = mcpResult.results;
        overallSummary = mcpResult.summary || {};
        console.log(`✅ MCP analysis complete: ${overallSummary.filesWithViolations || 0} files with violations`);
      } else {
        throw new Error('Unexpected MCP response format');
      }
    } catch (error) {
      console.error(`❌ MCP server error: ${error.message}`);
      console.error(`⚠️  Falling back to direct analysis...`);
      
      // Fallback: analyze files directly if MCP fails
      for (const file of filesToCheck) {
        try {
          const { analyzeFileHybrid } = await import('../src/core/hybrid-analyzer.js');
          const violations = await analyzeFileHybrid(file.content, file.path);
          batchResults.push({
            filePath: file.path,
            violations,
            summary: {
              totalViolations: violations.length,
              errors: violations.filter(v => v.severity === 'error').length,
              warnings: violations.filter(v => v.severity === 'warning').length
            }
          });
        } catch (fallbackError) {
          console.warn(`⚠️  Failed to analyze ${file.path}:`, fallbackError.message);
          batchResults.push({
            filePath: file.path,
            violations: [],
            error: fallbackError.message
          });
        }
      }
      
      // Calculate summary for fallback
      overallSummary = {
        filesChecked: filesToCheck.length,
        filesWithViolations: batchResults.filter(r => r.violations && r.violations.length > 0).length,
        totalViolations: batchResults.reduce((sum, r) => sum + (r.summary?.totalViolations || 0), 0),
        totalErrors: batchResults.reduce((sum, r) => sum + (r.summary?.errors || 0), 0),
        totalWarnings: batchResults.reduce((sum, r) => sum + (r.summary?.warnings || 0), 0)
      };
    }
    
    // Use summary from MCP if available, otherwise calculate
    const batchResult = {
      results: batchResults,
      summary: overallSummary.filesChecked ? overallSummary : {
        filesChecked: filesToCheck.length,
        filesWithViolations: batchResults.filter(r => r.violations && r.violations.length > 0).length,
        totalViolations: batchResults.reduce((sum, r) => sum + (r.summary?.totalViolations || 0), 0),
        totalErrors: batchResults.reduce((sum, r) => sum + (r.summary?.errors || 0), 0),
        totalWarnings: batchResults.reduce((sum, r) => sum + (r.summary?.warnings || 0), 0)
      }
    };
    
    // Transform MCP results to our format
    const allViolations = [];
    
    if (batchResult && batchResult.results) {
      for (const fileResult of batchResult.results) {
        if (fileResult.violations && Array.isArray(fileResult.violations) && fileResult.violations.length > 0) {
          for (const violation of fileResult.violations) {
            allViolations.push({
              id: violation.id || 'unknown',
              severity: violation.severity || 'error',
              title: violation.title || 'Accessibility violation',
              description: violation.description || violation.help || 'Accessibility issue detected',
              help: violation.help || violation.description || '',
              line: violation.line || 1,
              file: fileResult.filePath || 'unknown',
              wcagCriteria: Array.isArray(violation.wcagCriteria) ? violation.wcagCriteria : [],
              fixSuggestion: violation.fixSuggestions?.[0] || violation.help || violation.description || 'Review WCAG guidelines',
              code: violation.code || ''
            });
          }
        }
      }
    } else {
      console.warn('⚠️  Unexpected MCP response format:', JSON.stringify(batchResult, null, 2));
    }
    
    // Generate results
    const results = {
      prNumber,
      repository: `${owner}/${repo}`,
      branch: pr.head.ref,
      totalFiles: files.length,
      analyzedFiles: filesToCheck.length,
      violations: allViolations,
      summary: {
        totalViolations: allViolations.length,
        errors: allViolations.filter(v => v.severity === 'error').length,
        warnings: allViolations.filter(v => v.severity === 'warning').length,
        info: allViolations.filter(v => v.severity === 'info').length
      },
      timestamp: new Date().toISOString()
    };
    
    // Save results
    fs.writeFileSync('a11y-results.json', JSON.stringify(results, null, 2));
    
    console.log(`✅ Analysis complete: ${results.summary.totalViolations} violations found`);
    console.log(`   - Errors: ${results.summary.errors}`);
    console.log(`   - Warnings: ${results.summary.warnings}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run analysis
analyzePR();
