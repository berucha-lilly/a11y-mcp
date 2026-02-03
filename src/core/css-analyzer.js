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
  'focus-styles-missing': ['2.4.7'],
  'low-contrast-text': ['1.4.3'],
  'small-text-size': ['1.4.4'],
  'hidden-content-accessible': ['1.3.2'],
  'contrast-mode-missing': ['1.4.1'],
  'text-spacing': ['1.4.12'],
  'forced-colors-override': ['1.4.1'],
  'animation-no-reduced-motion': ['2.3.3'],
  'insufficient-touch-target': ['2.5.5'],
  'text-justify': ['1.4.8'],
  'text-all-caps': ['1.4.8'],
  'insufficient-focus-indicator': ['2.4.7'],
  'hover-only-interaction': ['1.4.13'],
  'text-indent-hiding': ['1.3.2'],
  'transparent-text': ['1.4.3'],
  'pointer-events-disabled': ['2.1.1'],
  'viewport-font-size': ['1.4.4'],
  'important-overuse': ['1.4.12'],
  'horizontal-scrolling': ['1.4.10'],
  'fixed-width-no-scale': ['1.4.10'],
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
  'focus-styles-missing': [
    'Add focus styles to interactive elements',
    'Use :focus or :focus-visible pseudo-classes',
    'Ensure minimum 2px outline or visible indicator',
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
  'animation-no-reduced-motion': [
    'Add @media (prefers-reduced-motion: reduce) query',
    'Disable or reduce animations for users who prefer less motion',
    'Example: @media (prefers-reduced-motion: reduce) { .animated { animation: none; } }',
  ],
  'insufficient-touch-target': [
    'Interactive elements should be at least 44x44 pixels',
    'Increase padding or dimensions to meet minimum touch target size',
    'Example: button { min-height: 44px; min-width: 44px; padding: 12px; }',
  ],
  'text-justify': [
    'Avoid text-align: justify',
    'Justified text creates uneven spacing that is hard to read',
    'Use text-align: left or right instead',
  ],
  'text-all-caps': [
    'Avoid text-transform: uppercase for long text',
    'All caps text is harder to read',
    'Use sparingly, only for short labels or buttons',
  ],
  'insufficient-focus-indicator': [
    'Focus indicators should be at least 2px thick',
    'Ensure sufficient contrast between indicator and background',
    'Example: button:focus { outline: 2px solid blue; outline-offset: 2px; }',
  ],
  'hover-only-interaction': [
    'Interactive elements should not rely solely on :hover',
    'Add :focus styles to support keyboard navigation',
    'Example: .button:hover, .button:focus { background: blue; }',
  ],
  'text-indent-hiding': [
    'Avoid using text-indent to hide text',
    'Use proper accessibility techniques for off-screen text',
    'Example: .sr-only { position: absolute; left: -10000px; }',
  ],
  'transparent-text': [
    'Do not use transparent text',
    'Text must be visible to all users',
    'Use proper hiding techniques if content should not be displayed',
  ],
  'pointer-events-disabled': [
    'Avoid pointer-events: none on interactive elements',
    'This prevents keyboard and assistive technology interaction',
    'Find alternative solutions that maintain accessibility',
  ],
  'viewport-font-size': [
    'Avoid viewport units (vw, vh) for font sizes',
    'Viewport units do not respect user zoom settings',
    'Use rem or em units instead',
  ],
  'important-overuse': [
    'Avoid !important on typography and color properties',
    '!important prevents user stylesheets from overriding',
    'Refactor CSS specificity instead',
  ],
  'horizontal-scrolling': [
    'Avoid horizontal scrolling',
    'Content should reflow for narrow viewports',
    'Use overflow-x: auto only when necessary with proper ARIA labels',
  ],
  'fixed-width-no-scale': [
    'Avoid large fixed pixel widths',
    'Use max-width with percentage or rem units',
    'Allow content to reflow at different zoom levels',
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

  // Track interactive selectors for focus styles check
  const interactiveSelectors = new Set();
  const focusSelectors = new Set();

  try {
    const result = await postcss([]).process(content, {
      from: filePath,
      syntax: isScss ? postcssScss : undefined,
    });

    // First pass: collect interactive and focus selectors
    result.root.walkRules(rule => {
      const selector = rule.selector.toLowerCase();
      
      // Track interactive elements
      if (/^(a|button|input|select|textarea|\[role=["']?button["']?\])/i.test(selector) ||
          /\.(btn|button|link)/i.test(selector)) {
        interactiveSelectors.add(selector.split(':')[0].trim());
      }
      
      // Track focus styles
      if (selector.includes(':focus')) {
        focusSelectors.add(selector.split(':focus')[0].trim());
      }
    });

    // Check for missing focus styles
    for (const selector of interactiveSelectors) {
      if (!focusSelectors.has(selector)) {
        violations.push({
          ruleId: 'focus-styles-missing',
          severity: 'warning',
          line: 1,
          column: 1,
          message: `Interactive element "${selector}" is missing focus styles`,
          wcag: violationToWCAG['focus-styles-missing'],
          fix: fixSuggestions['focus-styles-missing'],
        });
      }
    }

    // Second pass: check individual rules
    result.root.walkRules(rule => {
      const line = rule.source?.start?.line || 1;
      const selector = rule.selector.toLowerCase();

      // Check for focus outline removal
      rule.walkDecls('outline', decl => {
        const value = decl.value.toLowerCase();
        if (value === 'none' || value === '0') {
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
        } else if (selector.includes(':focus')) {
          // Check for insufficient focus indicator
          const widthMatch = value.match(/(\d+)px/);
          if (widthMatch && parseInt(widthMatch[1]) < 2) {
            violations.push({
              ruleId: 'insufficient-focus-indicator',
              severity: 'warning',
              line: decl.source?.start?.line || line,
              column: decl.source?.start?.column || 1,
              message: `Focus outline ${widthMatch[1]}px is too thin. Use at least 2px`,
              wcag: violationToWCAG['insufficient-focus-indicator'],
              fix: fixSuggestions['insufficient-focus-indicator'],
            });
          }
        }
      });

      // Check for hover-only interactions
      if (selector.includes(':hover') && !selector.includes(':focus')) {
        rule.walkDecls(decl => {
          // Check if this is an interactive property (not just cosmetic)
          const interactiveProps = ['display', 'visibility', 'opacity', 'transform', 'background', 'color'];
          if (interactiveProps.some(prop => decl.prop.includes(prop))) {
            violations.push({
              ruleId: 'hover-only-interaction',
              severity: 'warning',
              line: decl.source?.start?.line || line,
              column: decl.source?.start?.column || 1,
              message: 'Interactive styles should not rely solely on :hover - add :focus styles',
              wcag: violationToWCAG['hover-only-interaction'],
              fix: fixSuggestions['hover-only-interaction'],
            });
          }
        });
      }

      // Check for contrast issues (simplified - checks explicit color pairs)
      let colorValue = null;
      let backgroundColorValue = null;

      rule.walkDecls('color', decl => {
        const val = decl.value.toLowerCase();
        colorValue = parseColor(val);
        
        // Check for transparent text
        if (val === 'transparent') {
          violations.push({
            ruleId: 'transparent-text',
            severity: 'error',
            line: decl.source?.start?.line || line,
            column: decl.source?.start?.column || 1,
            message: 'Text color should not be transparent',
            wcag: violationToWCAG['transparent-text'],
            fix: fixSuggestions['transparent-text'],
          });
        }
      });

      rule.walkDecls('background-color', decl => {
        backgroundColorValue = parseColor(decl.value);
      });

      if (colorValue && backgroundColorValue) {
        const ratio = getContrastRatio(colorValue, backgroundColorValue);
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

      // Check for small font sizes and viewport units
      rule.walkDecls('font-size', decl => {
        const value = decl.value.toLowerCase();
        
        // Check for viewport units
        if (/\d+v[wh]/.test(value)) {
          violations.push({
            ruleId: 'viewport-font-size',
            severity: 'warning',
            line: decl.source?.start?.line || line,
            column: decl.source?.start?.column || 1,
            message: 'Avoid viewport units (vw, vh) for font sizes - they don\'t respect zoom settings',
            wcag: violationToWCAG['viewport-font-size'],
            fix: fixSuggestions['viewport-font-size'],
          });
        }
        
        // Check for small pixel sizes
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
      let ruleHasDisplayNone = false;
      let ruleHasVisibilityHidden = false;

      rule.walkDecls('display', decl => {
        if (decl.value === 'none') {
          ruleHasDisplayNone = true;
        }
      });

      rule.walkDecls('visibility', decl => {
        if (decl.value === 'hidden') {
          ruleHasVisibilityHidden = true;
        }
      });

      // Check if this might be screen reader only content
      const isSROnly = selector.includes('sr-only') || 
                       selector.includes('screen-reader') ||
                       selector.includes('visually-hidden');

      if (isSROnly && (ruleHasDisplayNone || ruleHasVisibilityHidden)) {
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

      // Check for text-indent hiding
      rule.walkDecls('text-indent', decl => {
        const value = parseFloat(decl.value);
        if (value < -999) {
          violations.push({
            ruleId: 'text-indent-hiding',
            severity: 'warning',
            line: decl.source?.start?.line || line,
            column: decl.source?.start?.column || 1,
            message: 'Large negative text-indent used for hiding - use proper accessibility techniques',
            wcag: violationToWCAG['text-indent-hiding'],
            fix: fixSuggestions['text-indent-hiding'],
          });
        }
      });

      // Check for pointer-events disabled on interactive elements
      rule.walkDecls('pointer-events', decl => {
        if (decl.value === 'none') {
          const isInteractive = /button|link|input|select|textarea|a\b/i.test(selector) ||
                               /\[role=["']?(button|link)["']?\]/.test(selector);
          if (isInteractive) {
            violations.push({
              ruleId: 'pointer-events-disabled',
              severity: 'error',
              line: decl.source?.start?.line || line,
              column: decl.source?.start?.column || 1,
              message: 'pointer-events: none on interactive elements prevents keyboard and AT interaction',
              wcag: violationToWCAG['pointer-events-disabled'],
              fix: fixSuggestions['pointer-events-disabled'],
            });
          }
        }
      });

      // Check for text justification
      rule.walkDecls('text-align', decl => {
        if (decl.value === 'justify') {
          violations.push({
            ruleId: 'text-justify',
            severity: 'warning',
            line: decl.source?.start?.line || line,
            column: decl.source?.start?.column || 1,
            message: 'text-align: justify creates uneven spacing that is harder to read',
            wcag: violationToWCAG['text-justify'],
            fix: fixSuggestions['text-justify'],
          });
        }
      });

      // Check for all-caps text
      rule.walkDecls('text-transform', decl => {
        if (decl.value === 'uppercase') {
          violations.push({
            ruleId: 'text-all-caps',
            severity: 'warning',
            line: decl.source?.start?.line || line,
            column: decl.source?.start?.column || 1,
            message: 'text-transform: uppercase makes text harder to read - use sparingly',
            wcag: violationToWCAG['text-all-caps'],
            fix: fixSuggestions['text-all-caps'],
          });
        }
      });

      // Check for !important overuse on accessibility-critical properties
      rule.walkDecls(decl => {
        if (decl.important) {
          const criticalProps = ['color', 'font-size', 'line-height', 'letter-spacing', 'word-spacing'];
          if (criticalProps.includes(decl.prop)) {
            violations.push({
              ruleId: 'important-overuse',
              severity: 'warning',
              line: decl.source?.start?.line || line,
              column: decl.source?.start?.column || 1,
              message: `!important on ${decl.prop} prevents user stylesheets from overriding`,
              wcag: violationToWCAG['important-overuse'],
              fix: fixSuggestions['important-overuse'],
            });
          }
        }
      });

      // Check for insufficient touch targets
      let widthValue = null;
      let heightValue = null;
      let minWidthValue = null;
      let minHeightValue = null;

      rule.walkDecls(/^(width|min-width)$/, decl => {
        const pxMatch = decl.value.match(/(\d+)px/);
        if (pxMatch) {
          const size = parseInt(pxMatch[1]);
          if (decl.prop === 'width') widthValue = size;
          if (decl.prop === 'min-width') minWidthValue = size;
        }
      });

      rule.walkDecls(/^(height|min-height)$/, decl => {
        const pxMatch = decl.value.match(/(\d+)px/);
        if (pxMatch) {
          const size = parseInt(pxMatch[1]);
          if (decl.prop === 'height') heightValue = size;
          if (decl.prop === 'min-height') minHeightValue = size;
        }
      });

      const isInteractive = /button|link|input|select|textarea|a\b/i.test(selector) ||
                           /\[role=["']?(button|link)["']?\]/.test(selector) ||
                           /\.(btn|button|link)/i.test(selector);

      if (isInteractive) {
        const effectiveWidth = minWidthValue || widthValue;
        const effectiveHeight = minHeightValue || heightValue;

        if (effectiveWidth && effectiveWidth < 44) {
          violations.push({
            ruleId: 'insufficient-touch-target',
            severity: 'warning',
            line: line,
            column: 1,
            message: `Touch target width ${effectiveWidth}px is too small. WCAG requires minimum 44x44px`,
            wcag: violationToWCAG['insufficient-touch-target'],
            fix: fixSuggestions['insufficient-touch-target'],
          });
        }

        if (effectiveHeight && effectiveHeight < 44) {
          violations.push({
            ruleId: 'insufficient-touch-target',
            severity: 'warning',
            line: line,
            column: 1,
            message: `Touch target height ${effectiveHeight}px is too small. WCAG requires minimum 44x44px`,
            wcag: violationToWCAG['insufficient-touch-target'],
            fix: fixSuggestions['insufficient-touch-target'],
          });
        }
      }

      // Check for large fixed widths
      rule.walkDecls('width', decl => {
        const pxMatch = decl.value.match(/(\d+)px/);
        if (pxMatch) {
          const size = parseInt(pxMatch[1]);
          if (size >= 600) {
            violations.push({
              ruleId: 'fixed-width-no-scale',
              severity: 'warning',
              line: decl.source?.start?.line || line,
              column: decl.source?.start?.column || 1,
              message: `Fixed width ${size}px may not scale properly - use max-width with relative units`,
              wcag: violationToWCAG['fixed-width-no-scale'],
              fix: fixSuggestions['fixed-width-no-scale'],
            });
          }
        }
      });

      // Check for horizontal scrolling
      rule.walkDecls('overflow-x', decl => {
        if (decl.value === 'scroll' || decl.value === 'auto') {
          violations.push({
            ruleId: 'horizontal-scrolling',
            severity: 'warning',
            line: decl.source?.start?.line || line,
            column: decl.source?.start?.column || 1,
            message: 'Horizontal scrolling should be avoided - content should reflow',
            wcag: violationToWCAG['horizontal-scrolling'],
            fix: fixSuggestions['horizontal-scrolling'],
          });
        }
      });

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
          const selectorLower = selector.toLowerCase();
          // Skip common layout containers
          if (!selectorLower.includes('container') && !selectorLower.includes('wrapper')) {
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
          const selectorLower = selector.toLowerCase();
          const isTextContainer = selectorLower.includes('text') || 
                                 selectorLower.includes('content') || 
                                 selectorLower.includes('paragraph') ||
                                 selectorLower.includes('p');
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

    // Check for animations without reduced motion support
    const hasAnimation = /@keyframes|animation:|transition:/i.test(content);
    const hasReducedMotion = /@media\s*\(\s*prefers-reduced-motion/i.test(content);

    if (hasAnimation && !hasReducedMotion) {
      violations.push({
        ruleId: 'animation-no-reduced-motion',
        severity: 'warning',
        line: 1,
        column: 1,
        message: 'Animations detected but no @media (prefers-reduced-motion) query found',
        wcag: violationToWCAG['animation-no-reduced-motion'],
        fix: fixSuggestions['animation-no-reduced-motion'],
      });
    }

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
