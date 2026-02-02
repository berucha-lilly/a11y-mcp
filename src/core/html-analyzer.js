/**
 * HTML Analyzer: Checks HTML/HTM files for accessibility violations
 * Uses htmlparser2 to parse HTML and check WCAG 2.2 AA compliance
 */

import { Parser } from 'htmlparser2';
import { DomHandler } from 'domhandler';

/**
 * Maps our violation types to WCAG criteria
 */
const violationToWCAG = {
  'img-missing-alt': ['1.1.1'],
  'img-empty-alt-not-decorative': ['1.1.1'],
  'img-redundant-alt': ['1.1.1'],
  'form-input-missing-label': ['3.3.2', '4.1.2'],
  'button-empty': ['4.1.2'],
  'link-empty': ['2.4.4'],
  'iframe-missing-title': ['4.1.2'],
  'div-as-button': ['4.1.2'],
  'click-without-keyboard': ['2.1.1'],
  'positive-tabindex': ['2.4.3'],
  'missing-lang': ['3.1.1'],
  'heading-empty': ['2.4.6'],
  'table-missing-headers': ['1.3.1'],
  'autoplay-media': ['1.4.2', '2.2.2'],
  'redundant-role': ['4.1.2'],
  'invalid-aria-role': ['4.1.2'],
  'missing-aria-required': ['4.1.2'],
  'focus-outline-removed': ['2.4.7'],
};

/**
 * Fix suggestions for each violation type
 */
const fixSuggestions = {
  'img-missing-alt': [
    'Add alt attribute: <img src="logo.png" alt="Company logo">',
    'For decorative images: <img src="decoration.png" alt="">',
    'Describe the image content, not just "image of..."',
  ],
  'img-empty-alt-not-decorative': [
    'If image is informative, add meaningful alt text',
    'If image is decorative, use alt="" and role="presentation"',
  ],
  'img-redundant-alt': [
    'Remove words like "image", "picture", "photo" from alt text',
    'Focus on describing the content/purpose',
  ],
  'form-input-missing-label': [
    '<label for="username">Username</label><input id="username" type="text">',
    'Or use aria-label: <input type="text" aria-label="Username">',
    'Or aria-labelledby: <span id="label">Username</span><input aria-labelledby="label">',
  ],
  'button-empty': [
    'Add text content: <button>Click me</button>',
    'Or aria-label: <button aria-label="Close dialog">×</button>',
  ],
  'link-empty': [
    'Add link text: <a href="/page">Read more</a>',
    'Or aria-label: <a href="/page" aria-label="Read more about accessibility">→</a>',
  ],
  'iframe-missing-title': [
    'Add title attribute: <iframe src="..." title="Embedded video player"></iframe>',
    'Title should describe the iframe content',
  ],
  'div-as-button': [
    'Use <button> element: <button onclick="handler()">Click me</button>',
    'Or add proper ARIA: <div role="button" tabindex="0" onkeydown="keyHandler()">',
  ],
  'click-without-keyboard': [
    'Add keyboard support: <div onclick="handler()" onkeydown="keyHandler()" tabindex="0">',
    'Or use semantic element: <button onclick="handler()">',
  ],
  'positive-tabindex': [
    'Remove positive tabindex values',
    'Use tabindex="0" for custom interactive elements',
    'Let natural tab order work for native elements',
  ],
  'missing-lang': [
    'Add lang attribute to <html>: <html lang="en">',
    'Use appropriate language code',
  ],
  'heading-empty': [
    'Add text content: <h1>Page Title</h1>',
    'Or aria-label: <h1 aria-label="Section title"><span class="icon"></span></h1>',
  ],
  'table-missing-headers': [
    'Use <thead> and <th>: <thead><tr><th>Name</th><th>Age</th></tr></thead>',
    'Add scope: <th scope="col">Name</th>',
  ],
  'autoplay-media': [
    'Remove autoplay: <video src="..." controls></video>',
    'Or add muted for background: <video autoplay muted loop></video>',
  ],
  'redundant-role': [
    'Remove redundant role that matches implicit semantics',
    'Example: <button role="button"> should be just <button>',
  ],
  'invalid-aria-role': [
    'Use valid ARIA role from specification',
    'Check: https://www.w3.org/TR/wai-aria/#role_definitions',
  ],
  'missing-aria-required': [
    'Add required ARIA properties for this role',
    'Example: role="checkbox" requires aria-checked',
  ],
  'focus-outline-removed': [
    'Do not remove focus outlines globally',
    'Provide custom visible focus styles if removing default',
  ],
};

/**
 * Valid ARIA roles
 */
const validAriaRoles = new Set([
  'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
  'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
  'contentinfo', 'definition', 'dialog', 'directory', 'document',
  'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
  'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
  'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
  'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
  'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
  'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
  'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel',
  'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid',
  'treeitem',
]);

/**
 * Required ARIA properties for certain roles
 */
const roleRequiredAria = {
  'checkbox': ['aria-checked'],
  'combobox': ['aria-expanded', 'aria-controls'],
  'radio': ['aria-checked'],
  'scrollbar': ['aria-controls', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  'slider': ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  'spinbutton': ['aria-valuenow'],
  'switch': ['aria-checked'],
  'tab': ['aria-selected'],
  'progressbar': ['aria-valuenow'],
};

/**
 * Elements with implicit roles
 */
const implicitRoles = {
  'button': 'button',
  'a': 'link',
  'nav': 'navigation',
  'main': 'main',
  'header': 'banner',
  'footer': 'contentinfo',
  'aside': 'complementary',
  'section': 'region',
  'article': 'article',
  'form': 'form',
  'table': 'table',
  'ul': 'list',
  'ol': 'list',
  'li': 'listitem',
  'h1': 'heading',
  'h2': 'heading',
  'h3': 'heading',
  'h4': 'heading',
  'h5': 'heading',
  'h6': 'heading',
  'img': 'img',
  'input[type="checkbox"]': 'checkbox',
  'input[type="radio"]': 'radio',
  'select': 'combobox',
  'textarea': 'textbox',
};

/**
 * Analyze HTML content for accessibility violations
 */
export async function analyzeHTML(content, filePath = 'unknown.html') {
  const violations = [];
  let lineNumber = 1;
  const lines = content.split('\n');

  // Helper to find line number for a specific index in content
  function getLineNumber(index) {
    let currentIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      currentIndex += lines[i].length + 1; // +1 for newline
      if (currentIndex >= index) {
        return i + 1;
      }
    }
    return lines.length;
  }

  // Check for html lang attribute
  if (!/<html[^>]*\slang=/i.test(content)) {
    violations.push({
      ruleId: 'missing-lang',
      severity: 'error',
      line: 1,
      column: 1,
      message: 'The <html> element must have a lang attribute',
      wcag: violationToWCAG['missing-lang'],
      fix: fixSuggestions['missing-lang'],
    });
  }

  const handler = new DomHandler((error, dom) => {
    if (error) {
      console.error('HTML parsing error:', error);
      return;
    }

    // Recursive function to traverse DOM
    function traverse(nodes, depth = 0) {
      if (!nodes) return;

      for (const node of nodes) {
        if (node.type === 'tag') {
          const tagName = node.name.toLowerCase();
          const attrs = node.attribs || {};
          
          // Find approximate line number (this is approximate since htmlparser2 doesn't provide positions)
          const tagText = `<${tagName}`;
          const index = content.indexOf(tagText, lineNumber > 1 ? lines.slice(0, lineNumber - 1).join('\n').length : 0);
          if (index !== -1) {
            lineNumber = getLineNumber(index);
          }

          // Check images
          if (tagName === 'img') {
            if (!attrs.alt && attrs.alt !== '') {
              violations.push({
                ruleId: 'img-missing-alt',
                severity: 'error',
                line: lineNumber,
                column: 1,
                message: 'Image elements must have an alt attribute',
                wcag: violationToWCAG['img-missing-alt'],
                fix: fixSuggestions['img-missing-alt'],
              });
            } else if (attrs.alt) {
              // Check for redundant alt text
              const redundantWords = /\b(image|picture|photo|graphic)\s+(of|depicting)\b/i;
              if (redundantWords.test(attrs.alt)) {
                violations.push({
                  ruleId: 'img-redundant-alt',
                  severity: 'warning',
                  line: lineNumber,
                  column: 1,
                  message: 'Alt text should not include redundant words like "image of" or "picture of"',
                  wcag: violationToWCAG['img-redundant-alt'],
                  fix: fixSuggestions['img-redundant-alt'],
                });
              }
            }
          }

          // Check form inputs
          if (tagName === 'input' && attrs.type !== 'hidden' && attrs.type !== 'submit' && attrs.type !== 'button') {
            const hasLabel = attrs['aria-label'] || attrs['aria-labelledby'] || attrs.id;
            if (!hasLabel) {
              violations.push({
                ruleId: 'form-input-missing-label',
                severity: 'error',
                line: lineNumber,
                column: 1,
                message: 'Form input must have an associated label',
                wcag: violationToWCAG['form-input-missing-label'],
                fix: fixSuggestions['form-input-missing-label'],
              });
            }
          }

          // Check buttons
          if (tagName === 'button') {
            const hasContent = node.children && node.children.some(child => 
              (child.type === 'text' && child.data.trim()) || child.type === 'tag'
            );
            const hasLabel = attrs['aria-label'] || attrs['aria-labelledby'];
            if (!hasContent && !hasLabel) {
              violations.push({
                ruleId: 'button-empty',
                severity: 'error',
                line: lineNumber,
                column: 1,
                message: 'Button must have text content or aria-label',
                wcag: violationToWCAG['button-empty'],
                fix: fixSuggestions['button-empty'],
              });
            }
          }

          // Check links
          if (tagName === 'a') {
            const hasContent = node.children && node.children.some(child => 
              (child.type === 'text' && child.data.trim()) || 
              (child.type === 'tag' && child.name === 'img' && child.attribs?.alt)
            );
            const hasLabel = attrs['aria-label'] || attrs['aria-labelledby'];
            if (!hasContent && !hasLabel) {
              violations.push({
                ruleId: 'link-empty',
                severity: 'error',
                line: lineNumber,
                column: 1,
                message: 'Link must have text content or aria-label',
                wcag: violationToWCAG['link-empty'],
                fix: fixSuggestions['link-empty'],
              });
            }
          }

          // Check iframes
          if (tagName === 'iframe' && !attrs.title) {
            violations.push({
              ruleId: 'iframe-missing-title',
              severity: 'error',
              line: lineNumber,
              column: 1,
              message: 'Iframe elements must have a title attribute',
              wcag: violationToWCAG['iframe-missing-title'],
              fix: fixSuggestions['iframe-missing-title'],
            });
          }

          // Check for divs/spans used as buttons
          if ((tagName === 'div' || tagName === 'span') && attrs.onclick) {
            const hasRole = attrs.role === 'button';
            const hasTabindex = attrs.tabindex !== undefined;
            const hasKeyboard = attrs.onkeydown || attrs.onkeypress || attrs.onkeyup;
            
            if (!hasRole || !hasTabindex || !hasKeyboard) {
              violations.push({
                ruleId: 'div-as-button',
                severity: 'error',
                line: lineNumber,
                column: 1,
                message: 'Interactive div/span must have role="button", tabindex, and keyboard handlers',
                wcag: violationToWCAG['div-as-button'],
                fix: fixSuggestions['div-as-button'],
              });
            }
          }

          // Check for positive tabindex
          if (attrs.tabindex && parseInt(attrs.tabindex) > 0) {
            violations.push({
              ruleId: 'positive-tabindex',
              severity: 'error',
              line: lineNumber,
              column: 1,
              message: 'Avoid positive tabindex values as they disrupt natural tab order',
              wcag: violationToWCAG['positive-tabindex'],
              fix: fixSuggestions['positive-tabindex'],
            });
          }

          // Check headings
          if (/^h[1-6]$/.test(tagName)) {
            const hasContent = node.children && node.children.some(child => 
              (child.type === 'text' && child.data.trim()) || child.type === 'tag'
            );
            const hasLabel = attrs['aria-label'] || attrs['aria-labelledby'];
            if (!hasContent && !hasLabel) {
              violations.push({
                ruleId: 'heading-empty',
                severity: 'error',
                line: lineNumber,
                column: 1,
                message: 'Heading must have text content or aria-label',
                wcag: violationToWCAG['heading-empty'],
                fix: fixSuggestions['heading-empty'],
              });
            }
          }

          // Check tables for headers
          if (tagName === 'table') {
            // Check if there are thead or th elements by traversing children
            function hasHeaderElements(nodes) {
              if (!nodes) return false;
              for (const child of nodes) {
                if (child.type === 'tag') {
                  if (child.name === 'thead' || child.name === 'th') return true;
                  if (hasHeaderElements(child.children)) return true;
                }
              }
              return false;
            }
            
            if (!hasHeaderElements(node.children)) {
              violations.push({
                ruleId: 'table-missing-headers',
                severity: 'error',
                line: lineNumber,
                column: 1,
                message: 'Table must have <thead> and <th> elements',
                wcag: violationToWCAG['table-missing-headers'],
                fix: fixSuggestions['table-missing-headers'],
              });
            }
          }

          // Check video/audio for autoplay
          if ((tagName === 'video' || tagName === 'audio') && attrs.autoplay !== undefined) {
            if (!attrs.muted && !attrs.controls) {
              violations.push({
                ruleId: 'autoplay-media',
                severity: 'error',
                line: lineNumber,
                column: 1,
                message: 'Autoplaying media must be muted or have controls',
                wcag: violationToWCAG['autoplay-media'],
                fix: fixSuggestions['autoplay-media'],
              });
            }
          }

          // Check for redundant roles
          if (attrs.role) {
            const implicitRole = implicitRoles[tagName];
            if (implicitRole === attrs.role) {
              violations.push({
                ruleId: 'redundant-role',
                severity: 'warning',
                line: lineNumber,
                column: 1,
                message: `Redundant role="${attrs.role}" on <${tagName}> element`,
                wcag: violationToWCAG['redundant-role'],
                fix: fixSuggestions['redundant-role'],
              });
            }

            // Check for invalid ARIA role
            if (!validAriaRoles.has(attrs.role)) {
              violations.push({
                ruleId: 'invalid-aria-role',
                severity: 'error',
                line: lineNumber,
                column: 1,
                message: `Invalid ARIA role: "${attrs.role}"`,
                wcag: violationToWCAG['invalid-aria-role'],
                fix: fixSuggestions['invalid-aria-role'],
              });
            }

            // Check for required ARIA properties
            const required = roleRequiredAria[attrs.role];
            if (required) {
              for (const prop of required) {
                if (!attrs[prop]) {
                  violations.push({
                    ruleId: 'missing-aria-required',
                    severity: 'error',
                    line: lineNumber,
                    column: 1,
                    message: `Role "${attrs.role}" requires ${prop} attribute`,
                    wcag: violationToWCAG['missing-aria-required'],
                    fix: fixSuggestions['missing-aria-required'],
                  });
                }
              }
            }
          }

          // Recurse into children
          if (node.children) {
            traverse(node.children, depth + 1);
          }
        }
      }
    }

    traverse(dom);
  });

  const parser = new Parser(handler, {
    lowerCaseAttributeNames: false,
    lowerCaseTags: true,
  });

  parser.write(content);
  parser.end();

  // Wait for parsing to complete
  await new Promise(resolve => setTimeout(resolve, 0));

  // Check for focus outline removal in inline styles
  const outlineNoneRegex = /style=["'][^"']*outline:\s*none/gi;
  let match;
  while ((match = outlineNoneRegex.exec(content)) !== null) {
    const line = getLineNumber(match.index);
    violations.push({
      ruleId: 'focus-outline-removed',
      severity: 'error',
      line,
      column: 1,
      message: 'Do not remove focus outlines without providing custom visible focus styles',
      wcag: violationToWCAG['focus-outline-removed'],
      fix: fixSuggestions['focus-outline-removed'],
    });
  }

  return violations;
}
