#!/usr/bin/env node
/**
 * CLI Scanner for GitHub Actions Integration  
 * Comprehensive accessibility checker for all file types
 * Supports: .js, .jsx, .ts, .tsx, .html, .htm, .css, .scss
 */

import fs from 'fs';
import path from 'path';

/**
 * Comprehensive accessibility analyzer
 */
function analyzeFile(content, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const violations = [];
  let line = 1;
  let match;
  
  // === JSX/TSX/JS/HTML CHECKS ===
  if (['.jsx', '.tsx', '.js', '.html', '.htm'].includes(ext)) {
    
    // 1. Missing alt attributes on images
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
          'Add role="button" tabIndex="0" and keyboard handlers if div is required'
        ],
        tags: ['wcag-a', 'semantic-html', 'keyboard']
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
          fixSuggestions: [
            'Add text inside the button',
            'Add aria-label="description" attribute'
          ],
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
      
      // Skip hidden and submit/button inputs
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
            fixSuggestions: [
              `Add <label for="${inputId}">Label text</label>`,
              'Add aria-label="description" to the input'
            ],
            tags: ['wcag-a', 'forms']
          });
        }
      } else if (!hasId && !hasAriaLabel && !hasAriaLabelledBy) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'input-no-id-or-label',
          severity: 'error',
          wcagCriteria: ['1.3.1', '3.3.2'],
          title: 'Form input has no label or id',
          description: 'Input needs an id with matching label or aria-label',
          help: 'Add id and <label for> or aria-label',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            'Add id="inputId" and <label for="inputId">Label</label>',
            'Add aria-label="description"'
          ],
          tags: ['wcag-a', 'forms']
        });
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
          help: 'Use descriptive link text that makes sense when read alone',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            'Use descriptive text like "Read the full article" instead of "Read more"',
            'Add aria-label with descriptive text'
          ],
          tags: ['wcag-aa', 'links']
        });
      }
    }
  }

  // === HTML-ONLY CHECKS ===
  if (['.html', '.htm'].includes(ext)) {
    
    // 6. Missing page language
    if (!/<html[^>]*lang=/i.test(content)) {
      violations.push({
        id: 'html-missing-lang',
        severity: 'error',
        wcagCriteria: ['3.1.1'],
        title: 'HTML missing lang attribute',
        description: 'The <html> element must have a lang attribute',
        help: 'Add lang attribute to specify page language',
        line: 1,
        column: 1,
        code: content.match(/<html[^>]*>/i)?.[0] || '<html>',
        fixSuggestions: ['Add lang="en" to <html> tag'],
        tags: ['wcag-a', 'language']
      });
    }

    // 7. Missing page title
    if (!/<title[^>]*>[\s\S]*?<\/title>/i.test(content)) {
      violations.push({
        id: 'html-missing-title',
        severity: 'error',
        wcagCriteria: ['2.4.2'],
        title: 'Page missing title',
        description: 'Every HTML page must have a descriptive <title>',
        help: 'Add <title> element in <head>',
        line: 1,
        column: 1,
        code: '<head>',
        fixSuggestions: ['Add <title>Page Title</title> in the <head> section'],
        tags: ['wcag-a', 'title']
      });
    }

    // 8. Iframe missing title
    const iframeRegex = /<iframe[^>]*>/gi;
    while ((match = iframeRegex.exec(content)) !== null) {
      if (!match[0].includes('title=')) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'iframe-missing-title',
          severity: 'error',
          wcagCriteria: ['2.4.1', '4.1.2'],
          title: 'Iframe missing title',
          description: 'All iframes must have a title attribute',
          help: 'Add title attribute describing iframe content',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: ['Add title="description" to iframe'],
          tags: ['wcag-a', 'iframe']
        });
      }
    }
  }

  // === CSS/SCSS CHECKS ===
  if (['.css', '.scss'].includes(ext)) {
    
    // 9. Missing focus styles
    if (!/:focus[^}]*/g.test(content)) {
      violations.push({
        id: 'missing-focus-styles',
        severity: 'warning',
        wcagCriteria: ['2.4.7'],
        title: 'No focus styles defined',
        description: 'CSS should include :focus styles for keyboard navigation',
        help: 'Add :focus and :focus-visible styles',
        line: 1,
        column: 1,
        code: '',
        fixSuggestions: [
          'Add :focus styles for interactive elements',
          'Use :focus-visible for better UX'
        ],
        tags: ['wcag-aa', 'focus', 'keyboard']
      });
    }

    // 10. outline: none without alternative
    const outlineNoneRegex = /outline\s*:\s*none/gi;
    while ((match = outlineNoneRegex.exec(content)) !== null) {
      line = content.substring(0, match.index).split('\n').length;
      violations.push({
        id: 'outline-none-no-alternative',
        severity: 'error',
        wcagCriteria: ['2.4.7'],
        title: 'Removed focus outline without alternative',
        description: 'outline: none removes keyboard focus indicator',
        help: 'Provide alternative focus indicator if removing outline',
        line,
        column: 1,
        code: match[0],
        fixSuggestions: [
          'Add custom focus style (border, box-shadow, etc.)',
          'Remove outline: none to keep default focus indicator'
        ],
        tags: ['wcag-aa', 'focus']
      });
    }
  }

  return violations;
}

/**
 * Scan a file and return results
 */
function scanFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const violations = analyzeFile(content, filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  let fileType = 'unknown';
  if (['.jsx'].includes(ext)) fileType = 'jsx';
  else if (['.tsx'].includes(ext)) fileType = 'tsx';
  else if (['.js'].includes(ext)) fileType = 'js';
  else if (['.ts'].includes(ext)) fileType = 'ts';
  else if (['.html', '.htm'].includes(ext)) fileType = 'html';
  else if (['.css'].includes(ext)) fileType = 'css';
  else if (['.scss'].includes(ext)) fileType = 'scss';

  return {
    filePath,
    fileType,
    content,
    violations,
    statistics: {
      totalViolations: violations.length,
      errors: violations.filter(v => v.severity === 'error').length,
      warnings: violations.filter(v => v.severity === 'warning').length,
      info: violations.filter(v => v.severity === 'info').length,
      estimatedFixTime: `${Math.max(violations.length * 2, 1)} minutes`
    },
    metadata: {
      lineCount: content.split('\n').length,
      analyzedAt: new Date().toISOString()
    }
  };
}

/**
 * Format and print human-readable results
 */
function printResults(result) {
  console.log(`\n📄 File: ${result.filePath}`);
  console.log(`🗂️  File Type: ${result.fileType.toUpperCase()}`);
  console.log(`📊 Lines: ${result.metadata.lineCount}`);
  
  if (result.violations.length === 0) {
    console.log('✅ Result: No accessibility violations found! 🎉');
  } else {
    console.log(`❌ Result: Found ${result.violations.length} accessibility violation(s):\n`);
    
    result.violations.forEach((violation, index) => {
      console.log(`   ${index + 1}. [${violation.severity.toUpperCase()}] ${violation.title}`);
      console.log(`      📍 Line: ${violation.line}`);
      console.log(`      📝 ${violation.description}`);
      console.log(`      🔧 ${violation.help}`);
      console.log(`      📚 WCAG: ${violation.wcagCriteria.join(', ')}`);
      if (violation.fixSuggestions && violation.fixSuggestions.length > 0) {
        console.log(`      💡 Suggestions:`);
        violation.fixSuggestions.forEach(suggestion => {
          console.log(`         - ${suggestion}`);
        });
      }
      console.log();
    });
    
    console.log(`\n📈 Statistics:`);
    console.log(`   Errors: ${result.statistics.errors}`);
    console.log(`   Warnings: ${result.statistics.warnings}`);
    console.log(`   Estimated fix time: ${result.statistics.estimatedFixTime}`);
  }
  
  console.log('─'.repeat(80));
}

/**
 * Format results as JSON for CI/CD
 */
function formatAsJSON(result) {
  return JSON.stringify({
    file: result.filePath,
    type: result.fileType,
    violations: result.violations.map(v => ({
      id: v.id,
      severity: v.severity,
      title: v.title,
      description: v.description,
      line: v.line,
      wcag: v.wcagCriteria,
      fix: v.help
    })),
    summary: result.statistics
  }, null, 2);
}

/**
 * Main CLI entry point
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node cli-scanner.js <file-path> [--json]');
    console.log('');
    console.log('  Analyze a file for accessibility violations');
    console.log('  Supports: .js, .jsx, .ts, .tsx, .html, .htm, .css, .scss');
    console.log('');
    console.log('Options:');
    console.log('  --json    Output results in JSON format for CI/CD integration');
    console.log('');
    console.log('Exit codes:');
    console.log('  0 = No violations');
    console.log('  3 = Violations found');
    console.log('  1 = Error (file not found, etc.)');
    process.exit(0);
  }

  const jsonOutput = args.includes('--json');
  const filePath = args.find(arg => !arg.startsWith('--'));

  if (!filePath) {
    console.error('Error: No file path provided');
    process.exit(1);
  }

  try {
    const result = scanFile(filePath);
    
    if (jsonOutput) {
      console.log(formatAsJSON(result));
    } else {
      printResults(result);
    }
    
    // Exit with code 3 if violations found (so PR checks fail)
    process.exit(result.violations.length > 0 ? 3 : 0);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
