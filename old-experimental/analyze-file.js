#!/usr/bin/env node
/**
 * Production Accessibility File Analyzer
 * Usage: node analyze-file.js <file-to-analyze>
 *
 * Reads the file, detects type, analyzes for accessibility violations, and prints results.
 */

import fs from 'fs';
import path from 'path';

function detectFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.js' || ext === '.jsx') return 'jsx';
  if (ext === '.tsx') return 'tsx';
  if (ext === '.css' || ext === '.scss') return 'css';
  if (ext === '.html' || ext === '.htm') return 'html';
  return 'unknown';
}

function analyzeCode(code, fileType) {
  const violations = [];
  // Check for missing alt attributes in HTML/JSX/TSX
  const imgRegex = /<img[^>]*>/g;
  const imgMatches = code.match(imgRegex);
  if (imgMatches) {
    imgMatches.forEach(img => {
      if (!img.includes('alt=')) {
        violations.push({
          id: 'img-missing-alt',
          severity: 'error',
          line: code.substring(0, code.indexOf(img)).split('\n').length + 1,
          description: 'Image missing alt attribute',
          fix: 'Add alt attribute: <img src="..." alt="Description of image">',
          wcagCriteria: '1.1.1',
          helpUrl: 'https://www.w3.org/WAI/tutorials/images/'
        });
      }
    });
  }

  // Check for div with onClick (JSX) or onclick (HTML) (non-semantic interactive element)
  if ((fileType === 'jsx' || fileType === 'tsx' || fileType === 'html')) {
    const divButtonRegex = /<div[^>]*(onClick|onclick)[^>]*>(.*?)<\/div>/gis;
    let match;
    while ((match = divButtonRegex.exec(code)) !== null) {
      const before = code.substring(0, match.index);
      const line = before.split('\n').length;
      violations.push({
        id: 'div-button',
        severity: 'error',
        line,
        description: 'Div with onClick/onclick should be a semantic button element',
        fix: 'Replace <div onClick> or <div onclick> with <button> for better accessibility',
        wcagCriteria: '1.3.1',
        helpUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/button/'
      });
    }
  }

  // Check for button with no accessible name (empty or only whitespace)
  if ((fileType === 'html' || fileType === 'jsx' || fileType === 'tsx')) {
    const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/g;
    let match;
    while ((match = buttonRegex.exec(code)) !== null) {
      const buttonContent = match[1].replace(/<!--.*?-->/gs, '').trim();
      // If button content is empty after removing comments and whitespace
      if (!buttonContent) {
        const before = code.substring(0, match.index);
        const line = before.split('\n').length;
        violations.push({
          id: 'button-missing-accessible-name',
          severity: 'error',
          line,
          description: 'Button element has no accessible name (text or aria-label)',
          fix: 'Add visible text or aria-label to the button',
          wcagCriteria: '4.1.2',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html'
        });
      }
    }
  }

  // Check for missing focus styles in CSS
  if (fileType === 'css') {
    const hasFocusRegex = /:focus[^}]*/g;
    if (!hasFocusRegex.test(code)) {
      violations.push({
        id: 'missing-focus-styles',
        severity: 'warning',
        line: 1,
        description: 'CSS missing :focus styles for keyboard navigation',
        fix: 'Add :focus and :focus-visible styles for better keyboard accessibility',
        wcagCriteria: '2.4.7',
        helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html'
      });
    }
  }
  return violations;
}

function printResults(filePath, fileType, violations) {
  console.log(`\n📄 File: ${filePath}`);
  console.log(`🗂️  File Type: ${fileType.toUpperCase()}`);
  if (violations.length === 0) {
    console.log('✅ Result: No accessibility violations found! 🎉');
  } else {
    console.log(`❌ Result: Found ${violations.length} accessibility violation(s):`);
    violations.forEach((violation, vIndex) => {
      console.log(`   ${vIndex + 1}. [${violation.severity.toUpperCase()}] ${violation.description}`);
      console.log(`      📍 Line: ${violation.line}`);
      console.log(`      🔧 Fix: ${violation.fix}`);
      console.log(`      📚 WCAG: ${violation.wcagCriteria}`);
      console.log(`      🔗 Help: ${violation.helpUrl}`);
      console.log();
    });
  }
  console.log('─'.repeat(80));
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node analyze-file.js <file-to-analyze>');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(2);
  }
  const code = fs.readFileSync(filePath, 'utf8');
  const fileType = detectFileType(filePath);
  if (fileType === 'unknown') {
    console.warn('Warning: Unknown file type. Some checks may not apply.');
  }
  const violations = analyzeCode(code, fileType);
  printResults(filePath, fileType, violations);
  process.exit(violations.length > 0 ? 3 : 0);
}

main();
