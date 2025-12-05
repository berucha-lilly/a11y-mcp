/**
 * Regex-based Accessibility Analyzer
 * Fast pattern matching for common WCAG 2.2 AA violations
 * Used as the fast path in the hybrid analyzer
 */

import path from 'path';

/**
 * Analyze a file for accessibility violations using regex pattern matching
 * @param {string} content - File content to analyze
 * @param {string} filePath - Path to the file (used for extension detection)
 * @returns {Array} Array of violation objects
 */
export function analyzeFile(content, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const violations = [];
  let line = 1;
  let match;
  
  // JSX/TSX/JS/HTML analysis
  if (['.jsx', '.tsx', '.js', '.html', '.htm'].includes(ext)) {
    
    // 1. Missing alt attributes
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
          'Add role="button" tabIndex="0" and keyboard handlers'
        ],
        tags: ['wcag-a', 'semantic-html']
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
          fixSuggestions: ['Add text inside button', 'Add aria-label="description"'],
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
            fixSuggestions: [`Add <label for="${inputId}">Label</label>`],
            tags: ['wcag-a', 'forms']
          });
        }
      }
    }

    // 5. Links with non-descriptive text
    const linkRegex = /<a[^>]*>(.*?)<\/a>/gi;
    while ((match = linkRegex.exec(content)) !== null) {
      const linkText = match[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
      const badTexts = ['click here', 'here', 'read more', 'more', 'link', 'learn more', 'see more'];
      const hasAriaLabel = match[0].includes('aria-label');
      
      if (!hasAriaLabel && badTexts.includes(linkText)) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'link-non-descriptive',
          severity: 'warning',
          wcagCriteria: ['2.4.4'],
          title: 'Link text not descriptive',
          description: `Link text "${linkText}" is not meaningful out of context`,
          help: 'Use descriptive link text',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: ['Use descriptive text instead of "' + linkText + '"'],
          tags: ['wcag-aa', 'links']
        });
      }
    }

    // 6. Placeholder used as label
    const inputWithPlaceholderRegex = /<input[^>]*placeholder=["']([^"']+)["'][^>]*>/gi;
    while ((match = inputWithPlaceholderRegex.exec(content)) !== null) {
      const hasAriaLabel = match[0].includes('aria-label');
      const hasAriaLabelledBy = match[0].includes('aria-labelledby');
      const hasId = /id=["']([^"']+)["']/.exec(match[0]);
      
      if (!hasAriaLabel && !hasAriaLabelledBy) {
        let hasLabel = false;
        if (hasId) {
          const labelRegex = new RegExp(`<label[^>]*for=["']${hasId[1]}["']`, 'i');
          hasLabel = labelRegex.test(content);
        }
        
        if (!hasLabel) {
          line = content.substring(0, match.index).split('\n').length;
          violations.push({
            id: 'placeholder-as-label',
            severity: 'error',
            wcagCriteria: ['3.3.2'],
            title: 'Placeholder used as label',
            description: 'Placeholders disappear when user types and are not accessible to screen readers',
            help: 'Use proper <label> element instead of placeholder',
            line,
            column: 1,
            code: match[0],
            fixSuggestions: [
              'Add <label> element with for attribute',
              'Keep placeholder as hint, but add proper label'
            ],
            tags: ['wcag-a', 'forms']
          });
        }
      }
    }

    // 7. Heading hierarchy check
    const headingRegex = /<h([1-6])[^>]*>/gi;
    const headings = [];
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    if (headings.length > 0) {
      // Check if h1 exists
      const hasH1 = headings.some(h => h.level === 1);
      if (!hasH1) {
        violations.push({
          id: 'missing-h1',
          severity: 'warning',
          wcagCriteria: ['1.3.1', '2.4.6'],
          title: 'Missing h1 heading',
          description: 'Page should have a single h1 heading for main content',
          help: 'Add an h1 heading for the main page title',
          line: headings[0]?.line || 1,
          column: 1,
          code: '',
          fixSuggestions: ['Add <h1>Main Page Title</h1>'],
          tags: ['wcag-aa', 'headings']
        });
      }
      
      // Check for skipped heading levels
      for (let i = 1; i < headings.length; i++) {
        if (headings[i].level > headings[i-1].level + 1) {
          violations.push({
            id: 'heading-level-skip',
            severity: 'warning',
            wcagCriteria: ['1.3.1'],
            title: 'Skipped heading level',
            description: `Heading level jumps from h${headings[i-1].level} to h${headings[i].level}`,
            help: 'Use sequential heading levels (h1, h2, h3, etc.)',
            line: headings[i].line,
            column: 1,
            code: '',
            fixSuggestions: [`Change to h${headings[i-1].level + 1} or adjust previous heading`],
            tags: ['wcag-aa', 'headings']
          });
        }
      }
    }

    // 8. Duplicate IDs
    const idRegex = /id=["']([^"']+)["']/gi;
    const ids = new Map();
    while ((match = idRegex.exec(content)) !== null) {
      const id = match[1];
      if (ids.has(id)) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'duplicate-id',
          severity: 'error',
          wcagCriteria: ['4.1.1'],
          title: 'Duplicate ID found',
          description: `ID "${id}" is used multiple times. IDs must be unique.`,
          help: 'Ensure each ID is unique',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            `Change one of the duplicate IDs to a unique value`,
            'Use class instead of id if uniqueness is not required'
          ],
          tags: ['wcag-a', 'html']
        });
      } else {
        ids.set(id, line);
      }
    }

    // 9. ARIA labelledby references
    const ariaLabelledByRegex = /aria-labelledby=["']([^"']+)["']/gi;
    while ((match = ariaLabelledByRegex.exec(content)) !== null) {
      const id = match[1];
      const idRegex = new RegExp(`id=["']${id}["']`, 'i');
      if (!idRegex.test(content)) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'aria-labelledby-invalid',
          severity: 'error',
          wcagCriteria: ['4.1.2'],
          title: 'aria-labelledby references non-existent element',
          description: `aria-labelledby="${id}" references an element that doesn't exist`,
          help: 'Ensure the referenced id exists in the document',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            `Add id="${id}" to the element that should label this`,
            'Or use aria-label instead'
          ],
          tags: ['wcag-a', 'aria']
        });
      }
    }

    // 10. Custom interactive elements missing keyboard support
    const customInteractiveRegex = /<(div|span)[^>]*(role=["'](button|link|tab|menuitem)["'])[^>]*>/gi;
    while ((match = customInteractiveRegex.exec(content)) !== null) {
      const hasOnKeyDown = match[0].includes('onKeyDown') || match[0].includes('onkeydown');
      const hasTabIndex = match[0].includes('tabIndex') || match[0].includes('tabindex');
      
      if (!hasOnKeyDown || !hasTabIndex) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'custom-interactive-missing-keyboard',
          severity: 'error',
          wcagCriteria: ['2.1.1', '2.1.2'],
          title: 'Custom interactive element missing keyboard support',
          description: 'Elements with ARIA roles must support keyboard interaction',
          help: 'Add onKeyDown handler and tabIndex',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            'Add tabIndex={0} for keyboard focus',
            'Add onKeyDown handler for Enter and Space keys'
          ],
          tags: ['wcag-a', 'keyboard']
        });
      }
    }
  }

  // HTML-only checks
  if (['.html', '.htm'].includes(ext)) {
    if (!/<html[^>]*lang=/i.test(content)) {
      violations.push({
        id: 'html-missing-lang',
        severity: 'error',
        wcagCriteria: ['3.1.1'],
        title: 'HTML missing lang attribute',
        description: 'The <html> element must have a lang attribute',
        help: 'Add lang attribute',
        line: 1,
        column: 1,
        code: '<html>',
        fixSuggestions: ['Add lang="en" to <html> tag'],
        tags: ['wcag-a']
      });
    }

    // Iframe missing title
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

  // CSS/SCSS checks
  if (['.css', '.scss'].includes(ext)) {
    // 1. Missing focus styles (only warn if no focus styles at all)
    if (!/:focus[^}]*/g.test(content)) {
      violations.push({
        id: 'missing-focus-styles',
        severity: 'warning',
        wcagCriteria: ['2.4.7'],
        title: 'No focus styles defined',
        description: 'CSS should include :focus styles for keyboard navigation',
        help: 'Add :focus styles',
        line: 1,
        column: 1,
        code: '',
        fixSuggestions: ['Add :focus styles for interactive elements'],
        tags: ['wcag-aa', 'focus']
      });
    }

    // 2. outline: none or outline: 0 without alternative
    const outlineNoneRegex = /outline\s*:\s*(none|0)(\s*!important)?\s*[;!]/gi;
    while ((match = outlineNoneRegex.exec(content)) !== null) {
      line = content.substring(0, match.index).split('\n').length;
      
      // Find the CSS rule block this belongs to
      const ruleStart = content.lastIndexOf('{', match.index);
      const ruleEnd = content.indexOf('}', match.index);
      let ruleBlock = '';
      if (ruleStart !== -1 && ruleEnd !== -1 && ruleEnd > ruleStart) {
        ruleBlock = content.substring(ruleStart, ruleEnd);
      } else {
        // Fallback: check nearby context
        const contextStart = Math.max(0, match.index - 200);
        const contextEnd = Math.min(content.length, match.index + 200);
        ruleBlock = content.substring(contextStart, contextEnd);
      }
      
      // Check if there's an alternative focus indicator in the same rule
      const hasAlternative = /(box-shadow\s*:|border\s*[:\-]|outline\s*:\s*(2|3|4|5|auto|dotted|dashed|solid|double|groove|ridge|inset|outset|\d+px))/i.test(ruleBlock);
      const isInFocusRule = /:focus[^}]*\{[^}]*outline\s*:\s*(none|0)/i.test(ruleBlock);
      
      if (!hasAlternative || isInFocusRule) {
        violations.push({
          id: 'outline-none-no-alternative',
          severity: 'error',
          wcagCriteria: ['2.4.7'],
          title: 'Removed focus outline without alternative',
          description: 'outline: none or outline: 0 removes keyboard focus indicator without providing an alternative',
          help: 'Provide alternative focus indicator (box-shadow, border, etc.)',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            'Add custom focus style: button:focus { box-shadow: 0 0 0 3px rgba(0,0,255,0.3); }',
            'Or remove outline: none to keep default focus indicator'
          ],
          tags: ['wcag-aa', 'focus']
        });
      }
    }

    // 3. Very small font sizes
    const fontSizeRegex = /font-size\s*:\s*(\d+(?:\.\d+)?)\s*px/gi;
    while ((match = fontSizeRegex.exec(content)) !== null) {
      const fontSize = parseFloat(match[1]);
      if (fontSize < 10) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'font-size-too-small',
          severity: 'error',
          wcagCriteria: ['1.4.4'],
          title: 'Font size too small for readability',
          description: `Font size ${fontSize}px is below minimum readable size (12px minimum, 16px recommended)`,
          help: 'Increase font size to at least 12px, preferably 16px',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            `Change font-size to at least 12px: font-size: 12px;`,
            'For body text, use 16px or larger',
            'Use relative units (rem, em) for better scalability'
          ],
          tags: ['wcag-aa', 'typography']
        });
      } else if (fontSize < 12) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'font-size-small',
          severity: 'warning',
          wcagCriteria: ['1.4.4'],
          title: 'Font size may be too small',
          description: `Font size ${fontSize}px is below recommended minimum (12px minimum, 16px recommended)`,
          help: 'Consider increasing font size for better readability',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            `Increase to at least 12px: font-size: 12px;`,
            'For body text, use 16px or larger'
          ],
          tags: ['wcag-aa', 'typography']
        });
      }
    }

    // 4. Very small touch targets
    const sizeRegex = /(width|height|min-width|min-height)\s*:\s*(\d+(?:\.\d+)?)\s*px/gi;
    while ((match = sizeRegex.exec(content)) !== null) {
      const size = parseFloat(match[2]);
      if (size < 44 && (match[1].includes('width') || match[1].includes('height'))) {
        line = content.substring(0, match.index).split('\n').length;
        const lines = content.substring(0, match.index).split('\n');
        const currentLine = lines[lines.length - 1];
        const selectorMatch = currentLine.match(/([.#]?[\w-]+)\s*\{/);
        const selector = selectorMatch ? selectorMatch[1] : 'unknown';
        
        if (selector.includes('button') || selector.includes('btn') || 
            selector.includes('link') || selector.includes('a') ||
            selector.includes('input') || selector.includes('click')) {
          violations.push({
            id: 'touch-target-too-small',
            severity: 'error',
            wcagCriteria: ['2.5.5'],
            title: 'Touch target too small',
            description: `${match[1]} of ${size}px is below WCAG minimum of 44x44px for touch targets`,
            help: 'Increase touch target size to at least 44x44px',
            line,
            column: 1,
            code: match[0],
            fixSuggestions: [
              `Increase ${match[1]} to at least 44px: ${match[1]}: 44px;`,
              'Add padding to increase effective touch target size',
              'Ensure both width and height meet 44px minimum'
            ],
            tags: ['wcag-aa', 'touch-targets']
          });
        }
      }
    }

    // 5. display: none on potentially interactive elements
    const displayNoneRegex = /\.([\w-]+)\s*\{[^}]*display\s*:\s*none/gi;
    while ((match = displayNoneRegex.exec(content)) !== null) {
      const className = match[1];
      if (className.includes('button') || className.includes('btn') || 
          className.includes('link') || className.includes('menu') ||
          className.includes('nav') || className.includes('interactive')) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'display-none-on-interactive',
          severity: 'warning',
          wcagCriteria: ['2.1.1', '4.1.2'],
          title: 'display: none may hide interactive content from screen readers',
          description: `Using display: none on "${className}" may hide content from assistive technologies`,
          help: 'Use visually-hidden technique instead of display: none for screen reader content',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            'Use .sr-only or visually-hidden class instead',
            'Example: .visually-hidden { position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0); overflow: hidden; }'
          ],
          tags: ['wcag-a', 'screen-readers']
        });
      }
    }

    // 6. color: transparent
    const transparentRegex = /color\s*:\s*transparent/gi;
    while ((match = transparentRegex.exec(content)) !== null) {
      line = content.substring(0, match.index).split('\n').length;
      violations.push({
        id: 'text-transparent',
        severity: 'error',
        wcagCriteria: ['1.4.3'],
        title: 'Text color is transparent',
        description: 'Transparent text color makes content invisible',
        help: 'Use visible text color or ensure content is accessible via other means',
        line,
        column: 1,
        code: match[0],
        fixSuggestions: [
          'Use a visible color: color: #333;',
          'If hiding text visually, ensure it\'s available to screen readers'
        ],
        tags: ['wcag-aa', 'color']
      });
    }

    // 7. pointer-events: none on interactive elements
    const pointerEventsRegex = /(button|a|input|select|textarea)[^}]*\{[^}]*pointer-events\s*:\s*none/gi;
    if (pointerEventsRegex.test(content)) {
      const pointerMatch = content.match(/(button|a|input|select|textarea)[^}]*\{[^}]*pointer-events\s*:\s*none/gi);
      if (pointerMatch) {
        const matchIndex = content.indexOf(pointerMatch[0]);
        line = content.substring(0, matchIndex).split('\n').length;
        violations.push({
          id: 'pointer-events-none',
          severity: 'error',
          wcagCriteria: ['2.1.1', '2.5.3'],
          title: 'pointer-events: none disables keyboard interaction',
          description: 'pointer-events: none on interactive elements prevents keyboard and touch interaction',
          help: 'Remove pointer-events: none or use alternative method',
          line,
          column: 1,
          code: pointerMatch[0].substring(0, 100),
          fixSuggestions: [
            'Remove pointer-events: none from interactive elements',
            'Use disabled attribute for form elements instead',
            'Ensure keyboard navigation still works'
          ],
          tags: ['wcag-a', 'keyboard']
        });
      }
    }
  }

  return violations;
}

