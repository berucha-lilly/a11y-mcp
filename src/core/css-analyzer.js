/**
 * CSS Analyzer: Checks CSS/SCSS files for accessibility violations
 * Uses postcss to parse CSS and check WCAG 2.2 AA compliance
 */

import postcss from 'postcss';
import postcssScss from 'postcss-scss';

/**
 * Maps violation types to WCAG criteria
 */
const violationToWCAG = {
  'focus-outline-removed': ['2.4.7'],
  'low-contrast-text': ['1.4.3'],
  'small-text-size': ['1.4.4'],
  'hidden-content-accessible': ['1.3.2'],
  'contrast-mode-missing': ['1.4.1'],
  'text-spacing': ['1.4.12'],
  'forced-colors-override': ['1.4.1'],
};

/**
 * Fix suggestions for each violation type
 */
const fixSuggestions = {
  'focus-outline-removed': [
    'Do not remove focus outlines globally',
    'Provide custom visible focus styles: button:focus { outline: 2px solid blue; }',
    'Use :focus-visible for modern browsers: button:focus-visible { outline: 2px solid blue; }',
  ],
  'low-contrast-text': [
    'Ensure text has sufficient contrast against background',
    'WCAG AA requires 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold)',
    'Use online tools to check contrast ratios',
  ],
  'small-text-size': [
    'Avoid setting font-size below 16px for body text',
    'Allow users to zoom text up to 200% without layout breaking',
    'Use relative units (rem, em) instead of fixed pixels',
  ],
  'hidden-content-accessible': [
    'Use proper hiding techniques for screen readers',
    'Keep content accessible: .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; }',
    'Avoid display: none or visibility: hidden for screen reader content',
  ],
  'contrast-mode-missing': [
    'Support high contrast mode with @media (prefers-contrast: high)',
    'Avoid using background images for important content',
    'Test in Windows High Contrast Mode',
  ],
  'text-spacing': [
    'Do not restrict text spacing properties',
    'Allow: line-height: 1.5, letter-spacing, word-spacing',
    'Content must be readable with increased spacing',
  ],
  'forced-colors-override': [
    'Do not override forced-colors mode',
    'Respect user color preferences: @media (forced-colors: active)',
  ],
};

/**
 * Calculate relative luminance for contrast checking
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(rgb1, rgb2) {
  const lum1 = getLuminance(...rgb1);
  const lum2 = getLuminance(...rgb2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse color to RGB
 */
function parseColor(color) {
  // Simple color parsing (hex and rgb)
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    } else if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
    }
  }
  
  // Named colors (common ones)
  const namedColors = {
    'white': [255, 255, 255],
    'black': [0, 0, 0],
    'red': [255, 0, 0],
    'green': [0, 128, 0],
    'blue': [0, 0, 255],
    'gray': [128, 128, 128],
    'grey': [128, 128, 128],
    'yellow': [255, 255, 0],
    'orange': [255, 165, 0],
    'purple': [128, 0, 128],
    'pink': [255, 192, 203],
  };
  
  return namedColors[color.toLowerCase()] || null;
}

/**
 * Analyze CSS content for accessibility violations
 */
export async function analyzeCSS(content, filePath = 'unknown.css') {
  const violations = [];
  const isScss = filePath.endsWith('.scss');

  try {
    const result = await postcss([]).process(content, {
      from: filePath,
      syntax: isScss ? postcssScss : undefined,
    });

    result.root.walkRules(rule => {
      const line = rule.source?.start?.line || 1;

      // Check for focus outline removal
      rule.walkDecls('outline', decl => {
        const value = decl.value.toLowerCase();
        if (value === 'none' || value === '0') {
          // Check if this is inside a focus selector
          const selector = rule.selector.toLowerCase();
          if (selector.includes(':focus')) {
            violations.push({
              ruleId: 'focus-outline-removed',
              severity: 'error',
              line: decl.source?.start?.line || line,
              column: decl.source?.start?.column || 1,
              message: 'Do not remove focus outlines without providing custom visible focus styles',
              wcag: violationToWCAG['focus-outline-removed'],
              fix: fixSuggestions['focus-outline-removed'],
            });
          }
        }
      });

      // Check for contrast issues (simplified - checks explicit color pairs)
      let color = null;
      let backgroundColor = null;

      rule.walkDecls('color', decl => {
        color = parseColor(decl.value);
      });

      rule.walkDecls('background-color', decl => {
        backgroundColor = parseColor(decl.value);
      });

      if (color && backgroundColor) {
        const ratio = getContrastRatio(color, backgroundColor);
        // WCAG AA requires 4.5:1 for normal text
        if (ratio < 4.5) {
          violations.push({
            ruleId: 'low-contrast-text',
            severity: 'error',
            line: line,
            column: 1,
            message: `Low contrast ratio (${ratio.toFixed(2)}:1). WCAG AA requires 4.5:1 for normal text`,
            wcag: violationToWCAG['low-contrast-text'],
            fix: fixSuggestions['low-contrast-text'],
          });
        }
      }

      // Check for small font sizes
      rule.walkDecls('font-size', decl => {
        const value = decl.value.toLowerCase();
        const pxMatch = value.match(/(\d+)px/);
        if (pxMatch) {
          const size = parseInt(pxMatch[1]);
          if (size < 14) {
            violations.push({
              ruleId: 'small-text-size',
              severity: 'warning',
              line: decl.source?.start?.line || line,
              column: decl.source?.start?.column || 1,
              message: `Font size ${size}px is too small. Minimum recommended is 14px`,
              wcag: violationToWCAG['small-text-size'],
              fix: fixSuggestions['small-text-size'],
            });
          }
        }
      });

      // Check for improper hiding techniques
      let hasDisplayNone = false;
      let hasVisibilityHidden = false;

      rule.walkDecls('display', decl => {
        if (decl.value === 'none') {
          hasDisplayNone = true;
        }
      });

      rule.walkDecls('visibility', decl => {
        if (decl.value === 'hidden') {
          hasVisibilityHidden = true;
        }
      });

      // Check if this might be screen reader only content
      const selector = rule.selector.toLowerCase();
      const isSROnly = selector.includes('sr-only') || 
                       selector.includes('screen-reader') ||
                       selector.includes('visually-hidden');

      if (isSROnly && (hasDisplayNone || hasVisibilityHidden)) {
        violations.push({
          ruleId: 'hidden-content-accessible',
          severity: 'error',
          line: line,
          column: 1,
          message: 'Screen reader content should not use display:none or visibility:hidden',
          wcag: violationToWCAG['hidden-content-accessible'],
          fix: fixSuggestions['hidden-content-accessible'],
        });
      }

      // Check for line-height restrictions
      rule.walkDecls('line-height', decl => {
        const value = parseFloat(decl.value);
        if (!isNaN(value) && value < 1.4) {
          violations.push({
            ruleId: 'text-spacing',
            severity: 'warning',
            line: decl.source?.start?.line || line,
            column: decl.source?.start?.column || 1,
            message: `Line height ${value} is too tight. WCAG recommends at least 1.5`,
            wcag: violationToWCAG['text-spacing'],
            fix: fixSuggestions['text-spacing'],
          });
        }
      });

      // Check for max-height/max-width restrictions that might break with text spacing
      rule.walkDecls(/^(max-height|max-width)$/, decl => {
        const value = decl.value.toLowerCase();
        if (/^\d+(px|em|rem)$/.test(value)) {
          const selector = rule.selector;
          // Skip common layout containers
          if (!selector.includes('container') && !selector.includes('wrapper')) {
            violations.push({
              ruleId: 'text-spacing',
              severity: 'warning',
              line: decl.source?.start?.line || line,
              column: decl.source?.start?.column || 1,
              message: 'Fixed max dimensions might break with increased text spacing',
              wcag: violationToWCAG['text-spacing'],
              fix: fixSuggestions['text-spacing'],
            });
          }
        }
      });

      // Check for overflow: hidden on text containers
      rule.walkDecls('overflow', decl => {
        if (decl.value === 'hidden') {
          // Check if selector might be a text container
          const selector = rule.selector.toLowerCase();
          const isTextContainer = selector.includes('text') || 
                                 selector.includes('content') || 
                                 selector.includes('paragraph') ||
                                 selector.includes('p');
          if (isTextContainer) {
            violations.push({
              ruleId: 'text-spacing',
              severity: 'warning',
              line: decl.source?.start?.line || line,
              column: decl.source?.start?.column || 1,
              message: 'overflow:hidden on text containers may clip content with increased spacing',
              wcag: violationToWCAG['text-spacing'],
              fix: fixSuggestions['text-spacing'],
            });
          }
        }
      });
    });

    // Check for global outline removal
    const globalOutlineNone = /:focus\s*\{\s*outline:\s*none/i;
    if (globalOutlineNone.test(content) || /\*:focus\s*\{\s*outline:\s*none/i.test(content)) {
      violations.push({
        ruleId: 'focus-outline-removed',
        severity: 'error',
        line: 1,
        column: 1,
        message: 'Global removal of focus outlines is a critical accessibility violation',
        wcag: violationToWCAG['focus-outline-removed'],
        fix: fixSuggestions['focus-outline-removed'],
      });
    }

  } catch (error) {
    // If parsing fails, return error as violation
    violations.push({
      ruleId: 'css-parse-error',
      severity: 'error',
      line: 1,
      column: 1,
      message: `CSS parsing error: ${error.message}`,
      wcag: [],
      fix: ['Fix CSS syntax errors before accessibility checking'],
    });
  }

  return violations;
}
