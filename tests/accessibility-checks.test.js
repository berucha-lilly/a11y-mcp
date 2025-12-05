#!/usr/bin/env node
/**
 * Comprehensive Test Suite for Accessibility Checks
 * Tests all WCAG 2.2 AA violation detection
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeFile } from '../src/core/regex-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get analyzer function (from regex-analyzer.js)
// Since analyzeFile is not exported, we'll need to test via CLI or refactor

/**
 * Test runner
 */
class AccessibilityTestSuite {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running Accessibility Check Test Suite\n');
    console.log('='.repeat(80));

    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${this.passed}`);
    console.log(`   ❌ Failed: ${this.failed}`);
    console.log(`   ⏭️  Skipped: ${this.skipped}`);
    console.log(`   📈 Total: ${this.tests.length}\n`);

    return this.failed === 0;
  }
}

const suite = new AccessibilityTestSuite();

// ============================================================================
// TEST CASES
// ============================================================================

// Test 1: Image missing alt
suite.test('Detects images without alt attribute', () => {
  const content = '<img src="logo.png" />';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'img-missing-alt');
  if (!hasViolation) {
    throw new Error('Should detect missing alt attribute');
  }
});

// Test 2: Image with alt (should not violate)
suite.test('Does not flag images with alt attribute', () => {
  const content = '<img src="logo.png" alt="Company logo" />';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'img-missing-alt');
  if (hasViolation) {
    throw new Error('Should not flag images with alt attribute');
  }
});

// Test 3: Div used as button
suite.test('Detects div with onClick handler', () => {
  const content = '<div onClick={() => alert("hi")}>Click me</div>';
  const violations = analyzeFile(content, 'test.jsx');
  const hasViolation = violations.some(v => v.id === 'div-button');
  if (!hasViolation) {
    throw new Error('Should detect div used as button');
  }
});

// Test 4: Div with proper ARIA (should not violate)
suite.test('Does not flag div with proper ARIA role and keyboard support', () => {
  const content = '<div role="button" tabIndex={0} onKeyDown={handler}>Click</div>';
  const violations = analyzeFile(content, 'test.jsx');
  const hasViolation = violations.some(v => v.id === 'div-button');
  if (hasViolation) {
    throw new Error('Should not flag div with proper ARIA');
  }
});

// Test 5: Empty button
suite.test('Detects button without accessible name', () => {
  const content = '<button></button>';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'button-missing-accessible-name');
  if (!hasViolation) {
    throw new Error('Should detect empty button');
  }
});

// Test 6: Button with aria-label (should not violate)
suite.test('Does not flag button with aria-label', () => {
  const content = '<button aria-label="Close dialog"></button>';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'button-missing-accessible-name');
  if (hasViolation) {
    throw new Error('Should not flag button with aria-label');
  }
});

// Test 7: Form input without label
suite.test('Detects input without label', () => {
  const content = '<input type="text" id="username" />';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'input-missing-label' || v.id === 'input-no-id-or-label');
  if (!hasViolation) {
    throw new Error('Should detect input without label');
  }
});

// Test 8: Input with label (should not violate)
suite.test('Does not flag input with associated label', () => {
  const content = '<label for="username">Username</label><input type="text" id="username" />';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'input-missing-label');
  if (hasViolation) {
    throw new Error('Should not flag input with label');
  }
});

// Test 9: Placeholder as label
suite.test('Detects placeholder used as label', () => {
  const content = '<input type="text" placeholder="Enter username" />';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'placeholder-as-label');
  if (!hasViolation) {
    throw new Error('Should detect placeholder used as label');
  }
});

// Test 10: Generic link text
suite.test('Detects generic link text', () => {
  const content = '<a href="/more">Read more</a>';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'link-non-descriptive');
  if (!hasViolation) {
    throw new Error('Should detect generic link text');
  }
});

// Test 11: Missing lang attribute
suite.test('Detects missing lang attribute in HTML', () => {
  const content = '<html><head><title>Test</title></head><body></body></html>';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'html-missing-lang');
  if (!hasViolation) {
    throw new Error('Should detect missing lang attribute');
  }
});

// Test 12: HTML with lang (should not violate)
suite.test('Does not flag HTML with lang attribute', () => {
  const content = '<html lang="en"><head><title>Test</title></head><body></body></html>';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'html-missing-lang');
  if (hasViolation) {
    throw new Error('Should not flag HTML with lang');
  }
});

// Test 13: Missing h1 heading
suite.test('Detects missing h1 heading', () => {
  const content = '<h2>Section</h2><h3>Subsection</h3>';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'missing-h1');
  if (!hasViolation) {
    throw new Error('Should detect missing h1');
  }
});

// Test 14: Skipped heading level
suite.test('Detects skipped heading levels', () => {
  const content = '<h1>Title</h1><h3>Subsection</h3>';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'heading-level-skip');
  if (!hasViolation) {
    throw new Error('Should detect skipped heading level');
  }
});

// Test 15: Duplicate IDs
suite.test('Detects duplicate IDs', () => {
  const content = '<div id="test">One</div><div id="test">Two</div>';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'duplicate-id');
  if (!hasViolation) {
    throw new Error('Should detect duplicate IDs');
  }
});

// Test 16: Invalid aria-labelledby
suite.test('Detects invalid aria-labelledby reference', () => {
  const content = '<button aria-labelledby="nonexistent">Click</button>';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'aria-labelledby-invalid');
  if (!hasViolation) {
    throw new Error('Should detect invalid aria-labelledby');
  }
});

// Test 17: CSS outline: none
suite.test('Detects outline: none without alternative', () => {
  const content = 'button:focus { outline: none; }';
  const violations = analyzeFile(content, 'test.css');
  const hasViolation = violations.some(v => v.id === 'outline-none-no-alternative');
  if (!hasViolation) {
    throw new Error('Should detect outline: none');
  }
});

// Test 18: CSS outline: none with alternative (should not violate)
suite.test('Does not flag outline: none with alternative focus style', () => {
  const content = 'button:focus { outline: none; box-shadow: 0 0 0 3px blue; }';
  const violations = analyzeFile(content, 'test.css');
  const hasViolation = violations.some(v => v.id === 'outline-none-no-alternative');
  if (hasViolation) {
    throw new Error('Should not flag outline: none with alternative');
  }
});

// Test 19: CSS font size too small
suite.test('Detects font size below 10px', () => {
  const content = '.tiny { font-size: 8px; }';
  const violations = analyzeFile(content, 'test.css');
  const hasViolation = violations.some(v => v.id === 'font-size-too-small');
  if (!hasViolation) {
    throw new Error('Should detect font size < 10px');
  }
});

// Test 20: CSS touch target too small
suite.test('Detects touch target below 44px', () => {
  const content = '.tiny-button { width: 20px; height: 20px; }';
  const violations = analyzeFile(content, 'test.css');
  const hasViolation = violations.some(v => v.id === 'touch-target-too-small');
  if (!hasViolation) {
    throw new Error('Should detect touch target < 44px');
  }
});

// Test 21: CSS color transparent
suite.test('Detects transparent text color', () => {
  const content = '.hidden { color: transparent; }';
  const violations = analyzeFile(content, 'test.css');
  const hasViolation = violations.some(v => v.id === 'text-transparent');
  if (!hasViolation) {
    throw new Error('Should detect transparent color');
  }
});

// Test 22: Custom interactive element missing keyboard
suite.test('Detects custom interactive element without keyboard support', () => {
  const content = '<div role="button">Click</div>';
  const violations = analyzeFile(content, 'test.jsx');
  const hasViolation = violations.some(v => v.id === 'custom-interactive-missing-keyboard');
  if (!hasViolation) {
    throw new Error('Should detect missing keyboard support');
  }
});

// Test 23: Iframe without title (HTML only)
suite.test('Detects iframe without title in HTML files', () => {
  const content = '<html><head><title>Test</title></head><body><iframe src="content.html"></iframe></body></html>';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'iframe-missing-title');
  if (!hasViolation) {
    throw new Error('Should detect iframe without title in HTML files');
  }
});

// Test 24: Real-world example file
suite.test('Detects violations in example CSS file', () => {
  const examplePath = path.join(__dirname, '..', 'examples', 'accessibility-violations.css');
  if (fs.existsSync(examplePath)) {
    const content = fs.readFileSync(examplePath, 'utf8');
    const violations = analyzeFile(content, 'accessibility-violations.css');
    
    // Should detect multiple violations
    if (violations.length < 5) {
      throw new Error(`Expected at least 5 violations, found ${violations.length}`);
    }
    
    // Should include outline violations
    const hasOutlineViolation = violations.some(v => v.id === 'outline-none-no-alternative');
    if (!hasOutlineViolation) {
      throw new Error('Should detect outline violations in example file');
    }
  } else {
    suite.skipped++;
    throw new Error('Example file not found (skipping)');
  }
});

// Test 25: Real-world example JSX file
suite.test('Detects violations in example JSX file', () => {
  const examplePath = path.join(__dirname, '..', 'examples', 'AccessibilityViolations.jsx');
  if (fs.existsSync(examplePath)) {
    const content = fs.readFileSync(examplePath, 'utf8');
    const violations = analyzeFile(content, 'AccessibilityViolations.jsx');
    
    // Should detect multiple violations
    if (violations.length < 5) {
      throw new Error(`Expected at least 5 violations, found ${violations.length}`);
    }
    
    // Should include div-button violations
    const hasDivButton = violations.some(v => v.id === 'div-button');
    if (!hasDivButton) {
      throw new Error('Should detect div-button violations in example file');
    }
  } else {
    suite.skipped++;
    throw new Error('Example file not found (skipping)');
  }
});

// Run the test suite
suite.run().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
