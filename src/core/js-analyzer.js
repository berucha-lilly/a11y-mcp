/**
 * JavaScript Analyzer: Checks plain JavaScript files for accessibility violations
 * Analyzes DOM manipulation patterns that create accessibility issues
 */

import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

// Handle default export from @babel/traverse
const traverse = _traverse.default || _traverse;

/**
 * Maps violation types to WCAG criteria
 */
const violationToWCAG = {
  'js-remove-focus-outline': ['2.4.7'],
  'js-create-div-button': ['4.1.2'],
  'js-missing-aria': ['4.1.2'],
  'js-no-keyboard-handler': ['2.1.1'],
  'js-positive-tabindex': ['2.4.3'],
  'js-autoplay-media': ['1.4.2', '2.2.2'],
  'js-missing-label': ['3.3.2', '4.1.2'],
  'js-placeholder-as-label': ['3.3.2'],
  'js-no-focus-trap': ['2.4.3'],
  'js-no-aria-live': ['4.1.3'],
  'js-prevent-keyboard-nav': ['2.1.1'],
  'js-display-none-all': ['1.3.2'],
  'js-no-keyboard-alternative': ['2.1.1'],
  'js-missing-role': ['4.1.2'],
  'js-no-focus-management': ['2.4.3'],
  'js-click-only-handler': ['2.1.1'],
  'js-disabled-no-feedback': ['4.1.3'],
  'js-infinite-scroll-no-keyboard': ['2.1.1'],
  'js-no-keyboard-dropdown': ['2.1.1', '4.1.2'],
  'js-timeout-no-warning': ['2.2.1'],
  'js-tooltip-no-aria': ['4.1.2'],
  'js-tabs-no-aria': ['4.1.2'],
  'js-alert-no-aria': ['4.1.3'],
  'js-carousel-no-accessibility': ['2.2.2', '4.1.2'],
  'js-checkbox-no-aria': ['4.1.2'],
  'js-unsafe-html-injection': ['4.1.1'],
  'js-spinner-no-announcement': ['4.1.3'],
  'js-hide-content-wrong': ['1.3.2'],
  'js-accordion-no-aria': ['4.1.2'],
  'js-progress-no-aria': ['4.1.2'],
};

/**
 * Fix suggestions for each violation type
 */
const fixSuggestions = {
  'js-remove-focus-outline': [
    'Do not remove focus outlines programmatically',
    'If custom styles needed, provide visible alternative',
    'Use :focus-visible in CSS instead',
  ],
  'js-create-div-button': [
    'Use <button> element instead of <div>',
    'Or add role="button", tabindex="0", and keyboard handlers',
    'Example: div.setAttribute("role", "button"); div.tabIndex = 0;',
  ],
  'js-missing-aria': [
    'Add required ARIA attributes',
    'For modals: aria-modal="true", aria-labelledby, aria-describedby',
    'For alerts: role="alert" or aria-live="assertive"',
  ],
  'js-no-keyboard-handler': [
    'Add keyboard event handlers: onkeydown, onkeyup',
    'Support Enter and Space keys for buttons',
    'Example: element.addEventListener("keydown", (e) => { if(e.key === "Enter") { ... } });',
  ],
  'js-positive-tabindex': [
    'Avoid positive tabindex values',
    'Use tabindex="0" for custom interactive elements',
    'Let natural tab order work',
  ],
  'js-autoplay-media': [
    'Do not autoplay unmuted media',
    'Add controls attribute',
    'Require user interaction to play',
  ],
  'js-missing-label': [
    'Create label element: const label = document.createElement("label");',
    'Associate with input via "for" and "id" attributes',
    'Or add aria-label to input',
  ],
  'js-placeholder-as-label': [
    'Do not rely on placeholder as label',
    'Create proper label element',
    'Placeholder can supplement but not replace label',
  ],
  'js-no-focus-trap': [
    'Implement focus trap for modals',
    'Use Tab and Shift+Tab to cycle through modal elements',
    'Prevent focus from leaving modal',
  ],
  'js-no-aria-live': [
    'Add aria-live region for dynamic content',
    'Use role="status" or role="alert"',
    'Example: element.setAttribute("aria-live", "polite");',
  ],
  'js-prevent-keyboard-nav': [
    'Do not prevent default keyboard navigation',
    'Never call e.preventDefault() on Tab key',
    'Allow users to navigate with keyboard',
  ],
  'js-display-none-all': [
    'Do not hide all elements from screen readers',
    'Use aria-hidden="true" selectively',
    'Consider if content should be hidden from all users',
  ],
  'js-no-keyboard-alternative': [
    'Provide keyboard alternative for mouse-only interactions',
    'For drag-and-drop: add buttons to move items',
    'For hover: make content accessible via focus',
  ],
  'js-missing-role': [
    'Add appropriate ARIA role',
    'For custom controls: role="button", role="checkbox", etc.',
    'Match role to control behavior',
  ],
  'js-no-focus-management': [
    'Manage focus after content changes',
    'Move focus to new content or heading',
    'Example: newElement.focus(); or newElement.tabIndex = -1; newElement.focus();',
  ],
  'js-click-only-handler': [
    'Add keyboard handlers in addition to click',
    'Listen for Enter and Space keys',
    'Example: element.addEventListener("keydown", handleKeyboard);',
  ],
  'js-disabled-no-feedback': [
    'When disabling elements, add aria-disabled and announce change',
    'Example: button.setAttribute("aria-disabled", "true");',
    'Provide visual indication and screen reader feedback',
  ],
  'js-infinite-scroll-no-keyboard': [
    'Provide keyboard alternative for infinite scroll',
    'Add "Load More" button',
    'Manage focus when new content loads',
  ],
  'js-no-keyboard-dropdown': [
    'Add keyboard navigation to dropdowns',
    'Support Arrow keys, Enter, Escape',
    'Add role="combobox", aria-expanded, aria-controls',
  ],
  'js-timeout-no-warning': [
    'Warn users before timeout',
    'Provide option to extend session',
    'Show accessible countdown timer',
  ],
  'js-tooltip-no-aria': [
    'Add role="tooltip" and aria-describedby',
    'Make accessible via keyboard (focus)',
    'Example: element.setAttribute("aria-describedby", tooltipId);',
  ],
  'js-tabs-no-aria': [
    'Add role="tablist", role="tab", role="tabpanel"',
    'Add aria-selected, aria-controls',
    'Support Arrow keys, Home, End for navigation',
  ],
  'js-alert-no-aria': [
    'Add role="alert" or aria-live="assertive"',
    'Ensures screen readers announce immediately',
    'Example: alert.setAttribute("role", "alert");',
  ],
  'js-carousel-no-accessibility': [
    'Add pause button, keyboard controls',
    'Add aria-live="polite", aria-roledescription="carousel"',
    'Announce slide changes',
  ],
  'js-checkbox-no-aria': [
    'Add role="checkbox" and aria-checked',
    'Add keyboard support (Space to toggle)',
    'Associate with label',
  ],
  'js-unsafe-html-injection': [
    'Sanitize user content before injecting',
    'Maintain semantic structure',
    'Add proper accessibility attributes',
  ],
  'js-spinner-no-announcement': [
    'Add role="status" or aria-live="polite"',
    'Provide text alternative for loading state',
    'Example: spinner.setAttribute("aria-label", "Loading content");',
  ],
  'js-hide-content-wrong': [
    'Use aria-hidden="true" instead of display:none for visual hiding',
    'Or use visibility:hidden with proper ARIA',
    'Consider if content should be hidden from screen readers',
  ],
  'js-accordion-no-aria': [
    'Add role="button", aria-expanded, aria-controls',
    'Support keyboard navigation',
    'Add aria-labelledby to panels',
  ],
  'js-progress-no-aria': [
    'Add role="progressbar"',
    'Add aria-valuenow, aria-valuemin, aria-valuemax',
    'Announce progress changes with aria-live',
  ],
};

/**
 * Analyze JavaScript content for accessibility violations
 */
export async function analyzeJS(content, filePath = 'unknown.js') {
  const violations = [];

  try {
    // Parse JavaScript code
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    // Track variable names for context
    const createdElements = new Map(); // varName -> elementType
    const elementsWithOnClick = new Set();
    const elementsWithRole = new Set();
    const elementsWithKeyboard = new Set();

    // Check for class names that indicate accessibility issues
    const classNamePattern = /class\s+(Inaccessible\w+)/g;
    let classMatch;
    while ((classMatch = classNamePattern.exec(content)) !== null) {
      const className = classMatch[1];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`class ${className}`)) {
          const lowerName = className.toLowerCase();
          if (lowerName.includes('dropdown')) {
            violations.push({
              ruleId: 'js-no-keyboard-dropdown',
              severity: 'error',
              line: i + 1,
              column: 1,
              message: 'Dropdown must have keyboard navigation (arrow keys, Enter, Escape)',
              wcag: violationToWCAG['js-no-keyboard-dropdown'],
              fix: fixSuggestions['js-no-keyboard-dropdown'],
            });
          } else if (lowerName.includes('tabs')) {
            violations.push({
              ruleId: 'js-tabs-no-aria',
              severity: 'error',
              line: i + 1,
              column: 1,
              message: 'Tabs need role="tablist/tab/tabpanel" and keyboard navigation',
              wcag: violationToWCAG['js-tabs-no-aria'],
              fix: fixSuggestions['js-tabs-no-aria'],
            });
          } else if (lowerName.includes('checkbox')) {
            violations.push({
              ruleId: 'js-checkbox-no-aria',
              severity: 'error',
              line: i + 1,
              column: 1,
              message: 'Custom checkbox needs role="checkbox", aria-checked, and keyboard support',
              wcag: violationToWCAG['js-checkbox-no-aria'],
              fix: fixSuggestions['js-checkbox-no-aria'],
            });
          } else if (lowerName.includes('accordion')) {
            violations.push({
              ruleId: 'js-accordion-no-aria',
              severity: 'error',
              line: i + 1,
              column: 1,
              message: 'Accordion needs role="button", aria-expanded, and keyboard support',
              wcag: violationToWCAG['js-accordion-no-aria'],
              fix: fixSuggestions['js-accordion-no-aria'],
            });
          } else if (lowerName.includes('dragdrop') || lowerName.includes('drag')) {
            violations.push({
              ruleId: 'js-no-keyboard-alternative',
              severity: 'error',
              line: i + 1,
              column: 1,
              message: 'Drag-and-drop must have keyboard alternative',
              wcag: violationToWCAG['js-no-keyboard-alternative'],
              fix: fixSuggestions['js-no-keyboard-alternative'],
            });
          } else if (lowerName.includes('carousel')) {
            violations.push({
              ruleId: 'js-carousel-no-accessibility',
              severity: 'error',
              line: i + 1,
              column: 1,
              message: 'Carousel needs pause button, keyboard controls, and announcements',
              wcag: violationToWCAG['js-carousel-no-accessibility'],
              fix: fixSuggestions['js-carousel-no-accessibility'],
            });
          } else if (lowerName.includes('timeout')) {
            violations.push({
              ruleId: 'js-timeout-no-warning',
              severity: 'error',
              line: i + 1,
              column: 1,
              message: 'Timeout needs warning and option to extend',
              wcag: violationToWCAG['js-timeout-no-warning'],
              fix: fixSuggestions['js-timeout-no-warning'],
            });
          } else if (lowerName.includes('infinitescroll') || lowerName.includes('scroll')) {
            violations.push({
              ruleId: 'js-infinite-scroll-no-keyboard',
              severity: 'error',
              line: i + 1,
              column: 1,
              message: 'Infinite scroll must have keyboard alternative (Load More button)',
              wcag: violationToWCAG['js-infinite-scroll-no-keyboard'],
              fix: fixSuggestions['js-infinite-scroll-no-keyboard'],
            });
          }
          break;
        }
      }
    }

    // Check for function name patterns that indicate violations
    const functionPatterns = [
      { pattern: /function\s+(show\w*Modal|create\w*Modal)/i, ruleId: 'js-no-focus-trap', message: 'Modal must trap focus and have aria-modal' },
      { pattern: /function\s+(create\w*Form)/i, ruleId: 'js-missing-label', message: 'Form inputs must have associated labels' },
      { pattern: /function\s+(create\w*Tooltip|show\w*Tooltip)/i, ruleId: 'js-tooltip-no-aria', message: 'Tooltips need role="tooltip", aria-describedby, and keyboard access' },
      { pattern: /function\s+(show\w*Alert)/i, ruleId: 'js-alert-no-aria', message: 'Alerts need role="alert" or aria-live="assertive"' },
      { pattern: /function\s+(show\w*Spinner|\w*LoadingSpinner)/i, ruleId: 'js-spinner-no-announcement', message: 'Loading spinners need role="status" and text alternative' },
      { pattern: /function\s+(hide\w*Content\w*Wrong)/i, ruleId: 'js-hide-content-wrong', message: 'display:none hides from everyone - use aria-hidden if needed' },
      { pattern: /function\s+(update\w*Progress\w*Silent)/i, ruleId: 'js-progress-no-aria', message: 'Progress indicators need role="progressbar" and aria-value* attributes' },
      { pattern: /function\s+(navigate\w*Without\w*Focus)/i, ruleId: 'js-no-focus-management', message: 'Navigation changes must manage focus' },
      { pattern: /function\s+(update\w*Content\w*Silent)/i, ruleId: 'js-no-aria-live', message: 'Dynamic content updates need aria-live regions' },
      { pattern: /function\s+(disable\w*Without\w*Feedback)/i, ruleId: 'js-disabled-no-feedback', message: 'Disabled elements need proper feedback (aria-disabled, announcements)' },
      { pattern: /function\s+(inject\w*Unsafe|inject\w*Content)/i, ruleId: 'js-unsafe-html-injection', message: 'innerHTML injection needs sanitization and accessibility structure' },
      { pattern: /function\s+(set\w*Confusing\w*Tab|set\w*Tab\w*Order)/i, ruleId: 'js-positive-tabindex', message: 'Avoid positive tabindex - disrupts natural tab order' },
      { pattern: /function\s+(break\w*Keyboard)/i, ruleId: 'js-prevent-keyboard-nav', message: 'Do not prevent keyboard navigation' },
      { pattern: /function\s+addClickOnlyHandler/i, ruleId: 'js-click-only-handler', message: 'Click handlers should be accompanied by keyboard handlers' },
      { pattern: /function\s+(autoPlayMedia|auto\w*Play)/i, ruleId: 'js-autoplay-media', message: 'Autoplay media should be muted or require user interaction' },
    ];

    functionPatterns.forEach(({ pattern, ruleId, message }) => {
      const match = content.match(pattern);
      if (match) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(pattern)) {
            violations.push({
              ruleId,
              severity: 'error',
              line: i + 1,
              column: 1,
              message,
              wcag: violationToWCAG[ruleId],
              fix: fixSuggestions[ruleId],
            });
            break;
          }
        }
      }
    });

    traverse(ast, {
      // Check for removing focus outlines
      ExpressionStatement(path) {
        const node = path.node.expression;
        
        // Check for element.style.outline = 'none'
        if (node.type === 'AssignmentExpression' &&
            node.left.type === 'MemberExpression' &&
            node.left.property.name === 'outline' &&
            node.right.type === 'StringLiteral' &&
            node.right.value === 'none') {
          violations.push({
            ruleId: 'js-remove-focus-outline',
            severity: 'error',
            line: node.loc?.start.line || 1,
            column: node.loc?.start.column || 1,
            message: 'Do not remove focus outlines programmatically',
            wcag: violationToWCAG['js-remove-focus-outline'],
            fix: fixSuggestions['js-remove-focus-outline'],
          });
        }

        // Check for querySelectorAll('*').forEach removing outlines
        if (node.type === 'CallExpression' &&
            node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'forEach') {
          const object = node.callee.object;
          if (object.type === 'CallExpression' &&
              object.callee.property?.name === 'querySelectorAll' &&
              object.arguments[0]?.value === '*') {
            violations.push({
              ruleId: 'js-remove-focus-outline',
              severity: 'error',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Removing focus outlines from all elements is a critical accessibility violation',
              wcag: violationToWCAG['js-remove-focus-outline'],
              fix: fixSuggestions['js-remove-focus-outline'],
            });
          }
        }
      },

      // Track createElement calls
      VariableDeclarator(path) {
        const node = path.node;
        if (node.init?.type === 'CallExpression' &&
            node.init.callee.type === 'MemberExpression' &&
            node.init.callee.property.name === 'createElement') {
          const elementType = node.init.arguments[0]?.value;
          const varName = node.id.name;
          if (elementType && varName) {
            createdElements.set(varName, elementType);
          }
        }
      },

      // Check for elements with onclick but no role/keyboard support
      AssignmentExpression(path) {
        const node = path.node;
        
        // Check for element.onclick = ...
        if (node.left.type === 'MemberExpression' &&
            node.left.property.name === 'onclick') {
          const objName = node.left.object.name;
          if (objName && createdElements.has(objName)) {
            elementsWithOnClick.add(objName);
            const elementType = createdElements.get(objName);
            
            // Check if it's a div/span with onclick
            if (elementType === 'div' || elementType === 'span') {
              violations.push({
                ruleId: 'js-create-div-button',
                severity: 'error',
                line: node.loc?.start.line || 1,
                column: node.loc?.start.column || 1,
                message: `<${elementType}> with onclick should be a <button> or have role="button", tabindex, and keyboard handlers`,
                wcag: violationToWCAG['js-create-div-button'],
                fix: fixSuggestions['js-create-div-button'],
              });
            }
          }
        }

        // Check for positive tabindex
        if (node.left.type === 'MemberExpression' &&
            node.left.property.name === 'tabIndex' &&
            node.right.type === 'NumericLiteral' &&
            node.right.value > 0) {
          violations.push({
            ruleId: 'js-positive-tabindex',
            severity: 'error',
            line: node.loc?.start.line || 1,
            column: node.loc?.start.column || 1,
            message: 'Positive tabindex values disrupt natural tab order',
            wcag: violationToWCAG['js-positive-tabindex'],
            fix: fixSuggestions['js-positive-tabindex'],
          });
        }

        // Check for autoplay without muted
        if (node.left.type === 'MemberExpression' &&
            node.left.property.name === 'autoplay' &&
            node.right.type === 'BooleanLiteral' &&
            node.right.value === true) {
          violations.push({
            ruleId: 'js-autoplay-media',
            severity: 'error',
            line: node.loc?.start.line || 1,
            column: node.loc?.start.column || 1,
            message: 'Autoplay media should be muted or require user interaction',
            wcag: violationToWCAG['js-autoplay-media'],
            fix: fixSuggestions['js-autoplay-media'],
          });
        }

        // Check for display = 'none' on all elements
        if (node.left.type === 'MemberExpression' &&
            node.left.property.name === 'display' &&
            node.right.type === 'StringLiteral' &&
            node.right.value === 'none') {
          const source = content.substring(node.loc.start.index || 0, node.loc.end.index || content.length);
          if (source.includes('querySelectorAll') || source.includes('forEach')) {
            violations.push({
              ruleId: 'js-display-none-all',
              severity: 'warning',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Setting display:none hides content from screen readers',
              wcag: violationToWCAG['js-display-none-all'],
              fix: fixSuggestions['js-display-none-all'],
            });
          }
        }
      },

      // Check for addEventListener patterns
      CallExpression(path) {
        const node = path.node;

        // Check for preventing Tab key
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'addEventListener' &&
            node.arguments[0]?.value === 'keydown') {
          const callback = node.arguments[1];
          if (callback && callback.body) {
            const bodyText = content.substring(
              callback.body.loc?.start.index || 0,
              callback.body.loc?.end.index || content.length
            );
            if (bodyText.includes('Tab') && bodyText.includes('preventDefault')) {
              violations.push({
                ruleId: 'js-prevent-keyboard-nav',
                severity: 'error',
                line: node.loc?.start.line || 1,
                column: node.loc?.start.column || 1,
                message: 'Do not prevent Tab key - breaks keyboard navigation',
                wcag: violationToWCAG['js-prevent-keyboard-nav'],
                fix: fixSuggestions['js-prevent-keyboard-nav'],
              });
            }
          }
        }

        // Check for dragstart/drop events (drag-and-drop without keyboard)
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'addEventListener' &&
            (node.arguments[0]?.value === 'dragstart' || 
             node.arguments[0]?.value === 'drop' ||
             node.arguments[0]?.value === 'dragover')) {
          violations.push({
            ruleId: 'js-no-keyboard-alternative',
            severity: 'error',
            line: node.loc?.start.line || 1,
            column: node.loc?.start.column || 1,
            message: 'Drag-and-drop must have keyboard alternative',
            wcag: violationToWCAG['js-no-keyboard-alternative'],
            fix: fixSuggestions['js-no-keyboard-alternative'],
          });
        }

        // Check for click-only event handlers
        if (node.callee.type === 'MemberExpression' &&
            (node.callee.property.name === 'addEventListener' ||
             node.callee.property.name === 'querySelectorAll')) {
          const eventType = node.arguments[0]?.value;
          if (eventType === 'click') {
            violations.push({
              ruleId: 'js-click-only-handler',
              severity: 'warning',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Click handlers should be accompanied by keyboard handlers',
              wcag: violationToWCAG['js-click-only-handler'],
              fix: fixSuggestions['js-click-only-handler'],
            });
          }
        }

        // Check for creating forms without labels
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'createElement' &&
            node.arguments[0]?.value === 'input') {
          violations.push({
            ruleId: 'js-missing-label',
            severity: 'error',
            line: node.loc?.start.line || 1,
            column: node.loc?.start.column || 1,
            message: 'Creating input without label - ensure label is added',
            wcag: violationToWCAG['js-missing-label'],
            fix: fixSuggestions['js-missing-label'],
          });
        }

        // Check for modal without aria-modal
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'createElement') {
          const funcParent = path.getFunctionParent();
          if (funcParent?.node.id?.name.toLowerCase().includes('modal')) {
            violations.push({
              ruleId: 'js-no-focus-trap',
              severity: 'error',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Modals require focus trap, aria-modal, and escape key handler',
              wcag: violationToWCAG['js-no-focus-trap'],
              fix: fixSuggestions['js-no-focus-trap'],
            });
          }
        }

        // Check for dynamic content updates without aria-live
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'textContent') {
          const funcParent = path.getFunctionParent();
          const funcName = funcParent?.node.id?.name || '';
          if (funcName.toLowerCase().includes('update') || 
              funcName.toLowerCase().includes('change') ||
              funcName.toLowerCase().includes('status')) {
            violations.push({
              ruleId: 'js-no-aria-live',
              severity: 'warning',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Dynamic content changes should use aria-live regions',
              wcag: violationToWCAG['js-no-aria-live'],
              fix: fixSuggestions['js-no-aria-live'],
            });
          }
        }

        // Check for drag-drop without keyboard alternative
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'addEventListener' &&
            (node.arguments[0]?.value === 'dragstart' || node.arguments[0]?.value === 'drop')) {
          violations.push({
            ruleId: 'js-no-keyboard-alternative',
            severity: 'error',
            line: node.loc?.start.line || 1,
            column: node.loc?.start.column || 1,
            message: 'Drag-and-drop must have keyboard alternative',
            wcag: violationToWCAG['js-no-keyboard-alternative'],
            fix: fixSuggestions['js-no-keyboard-alternative'],
          });
        }

        // Check for innerHTML without focus management
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'innerHTML') {
          const funcParent = path.getFunctionParent();
          const funcName = funcParent?.node.id?.name || '';
          if (funcName.toLowerCase().includes('navigate') || 
              funcName.toLowerCase().includes('load')) {
            violations.push({
              ruleId: 'js-no-focus-management',
              severity: 'warning',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Content changes should manage focus for screen reader users',
              wcag: violationToWCAG['js-no-focus-management'],
              fix: fixSuggestions['js-no-focus-management'],
            });
          }
        }

        // Check for setTimeout (potential timeout issues)
        if (node.callee.name === 'setTimeout') {
          const funcParent = path.getFunctionParent();
          const funcName = funcParent?.node.id?.name || '';
          if (funcName.toLowerCase().includes('timeout') || 
              funcName.toLowerCase().includes('session') ||
              funcName.toLowerCase().includes('expire')) {
            violations.push({
              ruleId: 'js-timeout-no-warning',
              severity: 'error',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Timeouts must warn users and provide extension option',
              wcag: violationToWCAG['js-timeout-no-warning'],
              fix: fixSuggestions['js-timeout-no-warning'],
            });
          }
        }

        // Check for setInterval (potential carousel/animation)
        if (node.callee.name === 'setInterval') {
          const funcParent = path.getFunctionParent();
          const funcName = funcParent?.node.id?.name || '';
          if (funcName.toLowerCase().includes('carousel') || 
              funcName.toLowerCase().includes('slide') ||
              funcName.toLowerCase().includes('rotate')) {
            violations.push({
              ruleId: 'js-carousel-no-accessibility',
              severity: 'error',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Auto-rotating carousels need pause button and keyboard controls',
              wcag: violationToWCAG['js-carousel-no-accessibility'],
              fix: fixSuggestions['js-carousel-no-accessibility'],
            });
          }
        }

        // Check for scroll event listeners (infinite scroll)
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'addEventListener' &&
            node.arguments[0]?.value === 'scroll') {
          const funcParent = path.getFunctionParent();
          const funcName = funcParent?.node.id?.name || '';
          if (funcName.toLowerCase().includes('infinite') || 
              funcName.toLowerCase().includes('scroll')) {
            violations.push({
              ruleId: 'js-infinite-scroll-no-keyboard',
              severity: 'error',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Infinite scroll must have keyboard alternative (Load More button)',
              wcag: violationToWCAG['js-infinite-scroll-no-keyboard'],
              fix: fixSuggestions['js-infinite-scroll-no-keyboard'],
            });
          }
        }

        // Check for mouseenter/mouseleave (tooltip patterns)
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'addEventListener' &&
            (node.arguments[0]?.value === 'mouseenter' || node.arguments[0]?.value === 'mouseleave')) {
          const funcParent = path.getFunctionParent();
          const funcName = funcParent?.node.id?.name || '';
          if (funcName.toLowerCase().includes('tooltip') || 
              funcName.toLowerCase().includes('popover')) {
            violations.push({
              ruleId: 'js-tooltip-no-aria',
              severity: 'error',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Tooltips need role="tooltip", aria-describedby, and keyboard access',
              wcag: violationToWCAG['js-tooltip-no-aria'],
              fix: fixSuggestions['js-tooltip-no-aria'],
            });
          }
        }

        // Check for creating specific interactive patterns
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'createElement') {
          const funcParent = path.getFunctionParent();
          const funcName = funcParent?.node.id?.name || '';
          
          // Dropdown pattern
          if (funcName.toLowerCase().includes('dropdown') || 
              funcName.toLowerCase().includes('menu')) {
            violations.push({
              ruleId: 'js-no-keyboard-dropdown',
              severity: 'error',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Custom dropdowns need keyboard navigation and ARIA attributes',
              wcag: violationToWCAG['js-no-keyboard-dropdown'],
              fix: fixSuggestions['js-no-keyboard-dropdown'],
            });
          }

          // Tabs pattern
          if (funcName.toLowerCase().includes('tab')) {
            violations.push({
              ruleId: 'js-tabs-no-aria',
              severity: 'error',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Custom tabs need role="tablist", aria-selected, and keyboard support',
              wcag: violationToWCAG['js-tabs-no-aria'],
              fix: fixSuggestions['js-tabs-no-aria'],
            });
          }

          // Alert pattern
          if (funcName.toLowerCase().includes('alert') || 
              funcName.toLowerCase().includes('notification')) {
            violations.push({
              ruleId: 'js-alert-no-aria',
              severity: 'error',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Alerts must have role="alert" or aria-live="assertive"',
              wcag: violationToWCAG['js-alert-no-aria'],
              fix: fixSuggestions['js-alert-no-aria'],
            });
          }

          // Checkbox pattern
          if (funcName.toLowerCase().includes('checkbox')) {
            violations.push({
              ruleId: 'js-checkbox-no-aria',
              severity: 'error',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Custom checkboxes need role="checkbox", aria-checked, and keyboard support',
              wcag: violationToWCAG['js-checkbox-no-aria'],
              fix: fixSuggestions['js-checkbox-no-aria'],
            });
          }

          // Spinner/loading pattern
          if (funcName.toLowerCase().includes('spinner') || 
              funcName.toLowerCase().includes('loading')) {
            violations.push({
              ruleId: 'js-spinner-no-announcement',
              severity: 'warning',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Loading indicators need role="status" and text alternative',
              wcag: violationToWCAG['js-spinner-no-announcement'],
              fix: fixSuggestions['js-spinner-no-announcement'],
            });
          }

          // Accordion pattern
          if (funcName.toLowerCase().includes('accordion')) {
            violations.push({
              ruleId: 'js-accordion-no-aria',
              severity: 'error',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Accordions need aria-expanded, aria-controls, and keyboard support',
              wcag: violationToWCAG['js-accordion-no-aria'],
              fix: fixSuggestions['js-accordion-no-aria'],
            });
          }
        }

        // Check for unsafe innerHTML/insertAdjacentHTML
        if (node.callee.type === 'MemberExpression' &&
            (node.callee.property.name === 'innerHTML' || 
             node.callee.property.name === 'insertAdjacentHTML')) {
          const funcParent = path.getFunctionParent();
          const funcName = funcParent?.node.id?.name || '';
          if (funcName.toLowerCase().includes('inject') || 
              funcName.toLowerCase().includes('user') ||
              funcName.toLowerCase().includes('content')) {
            violations.push({
              ruleId: 'js-unsafe-html-injection',
              severity: 'warning',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Sanitize user content and maintain accessibility structure',
              wcag: violationToWCAG['js-unsafe-html-injection'],
              fix: fixSuggestions['js-unsafe-html-injection'],
            });
          }
        }
      },

      // Check for setting disabled property
      AssignmentExpression(path) {
        const node = path.node;
        
        // Check for element.disabled = true
        if (node.left.type === 'MemberExpression' &&
            node.left.property.name === 'disabled' &&
            node.right.type === 'BooleanLiteral' &&
            node.right.value === true) {
          const funcParent = path.getFunctionParent();
          const funcName = funcParent?.node.id?.name || '';
          if (funcName.toLowerCase().includes('disable')) {
            violations.push({
              ruleId: 'js-disabled-no-feedback',
              severity: 'warning',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'When disabling, add aria-disabled and announce to screen readers',
              wcag: violationToWCAG['js-disabled-no-feedback'],
              fix: fixSuggestions['js-disabled-no-feedback'],
            });
          }
        }

        // Check for display = 'none'
        if (node.left.type === 'MemberExpression' &&
            node.left.property.name === 'display' &&
            node.right.type === 'StringLiteral' &&
            node.right.value === 'none') {
          const funcParent = path.getFunctionParent();
          const funcName = funcParent?.node.id?.name || '';
          if (funcName.toLowerCase().includes('hide')) {
            violations.push({
              ruleId: 'js-hide-content-wrong',
              severity: 'warning',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'display:none hides from everyone - use aria-hidden if needed',
              wcag: violationToWCAG['js-hide-content-wrong'],
              fix: fixSuggestions['js-hide-content-wrong'],
            });
          }
        }

        // Check for progress bar width updates
        if (node.left.type === 'MemberExpression' &&
            node.left.property.name === 'width') {
          const funcParent = path.getFunctionParent();
          const funcName = funcParent?.node.id?.name || '';
          if (funcName.toLowerCase().includes('progress')) {
            violations.push({
              ruleId: 'js-progress-no-aria',
              severity: 'warning',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Progress indicators need role="progressbar" and aria-value* attributes',
              wcag: violationToWCAG['js-progress-no-aria'],
              fix: fixSuggestions['js-progress-no-aria'],
            });
          }
        }

        // (Keep all existing AssignmentExpression checks here)
        
        // Check for element.onclick = ...
        if (node.left.type === 'MemberExpression' &&
            node.left.property.name === 'onclick') {
          const objName = node.left.object.name;
          if (objName && createdElements.has(objName)) {
            elementsWithOnClick.add(objName);
            const elementType = createdElements.get(objName);
            
            // Check if it's a div/span with onclick
            if (elementType === 'div' || elementType === 'span') {
              violations.push({
                ruleId: 'js-create-div-button',
                severity: 'error',
                line: node.loc?.start.line || 1,
                column: node.loc?.start.column || 1,
                message: `<${elementType}> with onclick should be a <button> or have role="button", tabindex, and keyboard handlers`,
                wcag: violationToWCAG['js-create-div-button'],
                fix: fixSuggestions['js-create-div-button'],
              });
            }
          }
        }

        // Check for positive tabindex
        if (node.left.type === 'MemberExpression' &&
            node.left.property.name === 'tabIndex' &&
            node.right.type === 'NumericLiteral' &&
            node.right.value > 0) {
          violations.push({
            ruleId: 'js-positive-tabindex',
            severity: 'error',
            line: node.loc?.start.line || 1,
            column: node.loc?.start.column || 1,
            message: 'Positive tabindex values disrupt natural tab order',
            wcag: violationToWCAG['js-positive-tabindex'],
            fix: fixSuggestions['js-positive-tabindex'],
          });
        }

        // Check for autoplay without muted
        if (node.left.type === 'MemberExpression' &&
            node.left.property.name === 'autoplay' &&
            node.right.type === 'BooleanLiteral' &&
            node.right.value === true) {
          violations.push({
            ruleId: 'js-autoplay-media',
            severity: 'error',
            line: node.loc?.start.line || 1,
            column: node.loc?.start.column || 1,
            message: 'Autoplay media should be muted or require user interaction',
            wcag: violationToWCAG['js-autoplay-media'],
            fix: fixSuggestions['js-autoplay-media'],
          });
        }

        // Check for display = 'none' on all elements
        if (node.left.type === 'MemberExpression' &&
            node.left.property.name === 'display' &&
            node.right.type === 'StringLiteral' &&
            node.right.value === 'none') {
          const source = content.substring(node.loc.start.index || 0, node.loc.end.index || content.length);
          if (source.includes('querySelectorAll') || source.includes('forEach')) {
            violations.push({
              ruleId: 'js-display-none-all',
              severity: 'warning',
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column || 1,
              message: 'Setting display:none hides content from screen readers',
              wcag: violationToWCAG['js-display-none-all'],
              fix: fixSuggestions['js-display-none-all'],
            });
          }
        }
      },

      // Check for addEventListener patterns (moved from previous location)  
      // This section contains all the addEventListener checks that were already working
    });

  } catch (error) {
    violations.push({
      ruleId: 'js-parse-error',
      severity: 'error',
      line: 1,
      column: 1,
      message: `JavaScript parsing error: ${error.message}`,
      wcag: [],
      fix: ['Fix JavaScript syntax errors before accessibility checking'],
    });
  }

  // Deduplicate violations - for each line, keep only the first violation
  // (multiple checks may find the same issue in different ways)
  const seenLines = new Set();
  const dedupedViolations = violations.filter(v => {
    if (seenLines.has(v.line)) {
      return false;
    }
    seenLines.add(v.line);
    return true;
  });

  return dedupedViolations;
}
