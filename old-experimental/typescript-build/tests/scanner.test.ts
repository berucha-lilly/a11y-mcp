/**
 * Jest tests for the accessibility scanner
 */

import { AccessibilityScanner } from '../src/scanner.js';
import { ConfigManager } from '../src/config/index.js';

describe('AccessibilityScanner', () => {
  let scanner: AccessibilityScanner;

  beforeEach(async () => {
    scanner = new AccessibilityScanner();
    await scanner.initialize();
  });

  describe('JSX/TSX Analysis', () => {
    test('should detect missing alt attributes on images', async () => {
      const code = `<img src="test.jpg" />`;
      const result = await scanner.scanFile('test.tsx', code);
      
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.id === 'img-missing-alt')).toBe(true);
    });

    test('should detect div used as button', async () => {
      const code = `<div onClick={handleClick}>Click me</div>`;
      const result = await scanner.scanFile('test.tsx', code);
      
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.id === 'non-semantic-interactive')).toBe(true);
    });

    test('should detect missing labels for form inputs', async () => {
      const code = `<input type="text" />`;
      const result = await scanner.scanFile('test.tsx', code);
      
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.id === 'form-labels')).toBe(true);
    });

    test('should detect heading hierarchy issues', async () => {
      const code = `<div><h1>Title</h1><h3>Subtitle</h3></div>`;
      const result = await scanner.scanFile('test.tsx', code);
      
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.id === 'heading-hierarchy')).toBe(true);
    });

    test('should detect icon buttons without accessible names', async () => {
      const code = `<button onClick={close}>×</button>`;
      const result = await scanner.scanFile('test.tsx', code);
      
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.id === 'icon-button-missing-aria')).toBe(true);
    });
  });

  describe('CSS Analysis', () => {
    test('should detect missing focus styles', async () => {
      const css = `
        .button {
          background: blue;
          color: white;
        }
      `;
      const result = await scanner.scanFile('test.css', css);
      
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.id === 'focus-visible')).toBe(true);
    });

    test('should detect animations without prefers-reduced-motion', async () => {
      const css = `
        .animated {
          animation: spin 1s infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      const result = await scanner.scanFile('test.css', css);
      
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    test('should load and apply configuration', async () => {
      const config = scanner.getConfig();
      expect(config.wcagLevel).toBe('AA');
      expect(config.wcagVersion).toBe('2.2');
    });

    test('should validate configuration', async () => {
      const config = scanner.getConfig();
      const validation = await scanner.getConfig();
      expect(validation).toBeDefined();
    });
  });

  describe('Statistics and Reporting', () => {
    test('should calculate violation statistics', async () => {
      const code = `<div onClick={handleClick}><img src="test.jpg" /></div>`;
      const result = await scanner.scanFile('test.tsx', code);
      
      expect(result.statistics.totalViolations).toBeGreaterThan(0);
      expect(result.statistics.errors).toBeGreaterThan(0);
      expect(result.statistics.estimatedFixTime).toBeDefined();
    });

    test('should provide meaningful fix suggestions', async () => {
      const code = `<img src="test.jpg" />`;
      const result = await scanner.scanFile('test.tsx', code);
      
      const imgViolation = result.violations.find(v => v.id === 'img-missing-alt');
      expect(imgViolation?.fixSuggestions.length).toBeGreaterThan(0);
      expect(imgViolation?.fixSuggestions[0].title).toBeDefined();
    });
  });

  describe('LDS Integration', () => {
    test('should validate LDS component usage', async () => {
      const code = `<Button variant="primary" onClick={handleClick}>Click Me</Button>`;
      const result = await scanner.scanFile('test.tsx', code);
      
      // Should have LDS-specific validation
      expect(result.violations.some(v => v.tags.includes('lds-components'))).toBe(true);
    });

    test('should suggest alternatives for non-standard components', async () => {
      const code = `<CustomButton onClick={handleClick}>Click</CustomButton>`;
      const result = await scanner.scanFile('test.tsx', code);
      
      expect(result.violations.some(v => v.id === 'lds-non-standard-component')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty files gracefully', async () => {
      const result = await scanner.scanFile('empty.tsx', '');
      
      expect(result.violations.length).toBe(0);
      expect(result.statistics.totalViolations).toBe(0);
    });

    test('should handle invalid code without crashing', async () => {
      const result = await scanner.scanFile('invalid.tsx', '<div<unclosed');
      
      expect(result.violations.some(v => v.id === 'parse-error')).toBe(true);
      expect(result.statistics.errors).toBeGreaterThan(0);
    });

    test('should handle unknown file types', async () => {
      const result = await scanner.scanFile('unknown.xyz', 'some content');
      
      expect(result.violations.length).toBe(0);
      expect(result.statistics.totalViolations).toBe(0);
    });
  });
});