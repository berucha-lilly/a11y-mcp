#!/usr/bin/env node
/**
 * Analyze PR files for accessibility violations using MCP server with ESLint
 */

import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { analyzeFileHybrid } from './core/hybrid-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

async function analyzePR() {
  try {
    console.log('📁 Detecting changed files in PR...');
    
    // Get changed files from git (run from repo root)
    let changedFiles = [];
    try {
      const output = execSync('git diff --name-only origin/main...HEAD', { 
        encoding: 'utf8',
        cwd: rootDir 
      });
      changedFiles = output.split('\n').filter(f => f.trim() !== '');
    } catch (error) {
      console.log('⚠️  Could not detect changed files, analyzing sample files...');
      // Fallback: analyze common files
      changedFiles = [
        'src/AccessibilityViolations.jsx',
        'src/App.js',
        'src/components/AccessibleFormValidation/FormValidation.js',
        'src/components/ColorContrastEnhancer/ContrastToggle.js',
        'src/components/KeyboardFriendlyNavigation/KeyboardNav.js'
      ].filter(f => fs.existsSync(path.join(rootDir, f)));
    }

    // Filter for relevant file types
    const relevantFiles = changedFiles.filter(f => 
      /\.(jsx?|tsx?)$/i.test(f) && fs.existsSync(path.join(rootDir, f))
    );

    console.log(`📊 Analyzing ${relevantFiles.length} files with ESLint + jsx-a11y...`);

    let totalViolations = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    const fileResults = [];

    // Use ESLint-based analysis
    for (const filePath of relevantFiles) {
      const fullPath = path.join(rootDir, filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Analyze using hybrid analyzer (ESLint + jsx-a11y)
      const violations = await analyzeFileHybrid(content, filePath);

      const errors = violations.filter(v => v.severity === 'error').length;
      const warnings = violations.filter(v => v.severity === 'warning').length;

      totalViolations += violations.length;
      totalErrors += errors;
      totalWarnings += warnings;

      if (violations.length > 0) {
        fileResults.push({
          filePath,
          violations,
          summary: {
            totalViolations: violations.length,
            errors,
            warnings
          }
        });
        console.log(`  ❌ ${filePath}: ${violations.length} violation(s)`);
      } else {
        console.log(`  ✅ ${filePath}: No violations`);
      }
    }

    // Write results
    const results = {
      analyzedFiles: relevantFiles.length,
      filesWithViolations: fileResults.length,
      summary: {
        totalViolations,
        errors: totalErrors,
        warnings: totalWarnings
      },
      files: fileResults
    };

    fs.writeFileSync(path.join(__dirname, 'a11y-results.json'), JSON.stringify(results, null, 2));
    console.log('\n✅ Analysis complete!');
    console.log(`📊 Total: ${totalViolations} violations (${totalErrors} errors, ${totalWarnings} warnings)`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

analyzePR();
