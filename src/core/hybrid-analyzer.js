/**
 * Hybrid Analyzer: Uses ESLint with jsx-a11y plugin for comprehensive accessibility checking
 */

import { Linter } from 'eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import babelParser from '@babel/eslint-parser';
import eslintJs from '@eslint/js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ESLint Linter configuration for accessibility checking
 * Must be an array for flat config format
 */
const linterConfig = [
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-react', '@babel/preset-typescript'],
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        // Node globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        // React globals
        React: 'readonly',
      },
    },
    plugins: {
      react,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // Set all jsx-a11y rules to error for strict checking
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/autocomplete-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/control-has-associated-label': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/iframe-has-title': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/media-has-caption': 'error',
      'jsx-a11y/mouse-events-have-key-events': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-autofocus': 'error',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
      'jsx-a11y/no-noninteractive-tabindex': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/scope': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];

/**
 * Maps ESLint rule IDs to WCAG criteria
 */
const ruleToWCAG = {
  'jsx-a11y/alt-text': ['1.1.1'],
  'jsx-a11y/anchor-has-content': ['2.4.4'],
  'jsx-a11y/anchor-is-valid': ['2.4.4'],
  'jsx-a11y/aria-activedescendant-has-tabindex': ['4.1.2'],
  'jsx-a11y/aria-props': ['4.1.2'],
  'jsx-a11y/aria-proptypes': ['4.1.2'],
  'jsx-a11y/aria-role': ['4.1.2'],
  'jsx-a11y/aria-unsupported-elements': ['4.1.2'],
  'jsx-a11y/autocomplete-valid': ['1.3.5'],
  'jsx-a11y/click-events-have-key-events': ['2.1.1'],
  'jsx-a11y/control-has-associated-label': ['4.1.2'],
  'jsx-a11y/heading-has-content': ['2.4.6'],
  'jsx-a11y/html-has-lang': ['3.1.1'],
  'jsx-a11y/iframe-has-title': ['4.1.2'],
  'jsx-a11y/img-redundant-alt': ['1.1.1'],
  'jsx-a11y/interactive-supports-focus': ['2.1.1'],
  'jsx-a11y/label-has-associated-control': ['3.3.2'],
  'jsx-a11y/media-has-caption': ['1.2.2'],
  'jsx-a11y/mouse-events-have-key-events': ['2.1.1'],
  'jsx-a11y/no-access-key': ['2.4.1'],
  'jsx-a11y/no-autofocus': ['2.4.3'],
  'jsx-a11y/no-distracting-elements': ['2.2.2'],
  'jsx-a11y/no-interactive-element-to-noninteractive-role': ['4.1.2'],
  'jsx-a11y/no-noninteractive-element-interactions': ['4.1.2'],
  'jsx-a11y/no-noninteractive-element-to-interactive-role': ['4.1.2'],
  'jsx-a11y/no-noninteractive-tabindex': ['2.1.1'],
  'jsx-a11y/no-redundant-roles': ['4.1.2'],
  'jsx-a11y/no-static-element-interactions': ['4.1.2'],
  'jsx-a11y/role-has-required-aria-props': ['4.1.2'],
  'jsx-a11y/role-supports-aria-props': ['4.1.2'],
  'jsx-a11y/scope': ['1.3.1'],
  'jsx-a11y/tabindex-no-positive': ['2.4.3'],
};

/**
 * Provides fix descriptions and code examples for common violations
 */
const fixDescriptions = {
  'jsx-a11y/alt-text': 'Add alt attribute with meaningful description',
  'jsx-a11y/click-events-have-key-events': 'Add keyboard event handlers (onKeyDown)',
  'jsx-a11y/no-static-element-interactions': 'Replace with semantic button or add role and keyboard support',
  'jsx-a11y/label-has-associated-control': 'Associate label with form control',
  'jsx-a11y/interactive-supports-focus': 'Make interactive element keyboard focusable',
  'jsx-a11y/aria-role': 'Use valid ARIA role from specification',
  'jsx-a11y/media-has-caption': 'Add captions to video/audio elements',
  'jsx-a11y/no-autofocus': 'Remove autoFocus attribute',
  'jsx-a11y/tabindex-no-positive': 'Remove positive tabIndex values',
  'jsx-a11y/aria-props': 'Fix ARIA property name',
  'jsx-a11y/role-has-required-aria-props': 'Add required ARIA properties for this role',
  'jsx-a11y/heading-has-content': 'Add text content to heading element',
  'jsx-a11y/iframe-has-title': 'Add title attribute to iframe',
  'jsx-a11y/no-distracting-elements': 'Remove <marquee> or <blink> elements',
  'jsx-a11y/anchor-has-content': 'Add text content or aria-label to link',
  'jsx-a11y/anchor-is-valid': 'Provide valid href or use button element',
  'jsx-a11y/control-has-associated-label': 'Add accessible label to form control',
  'jsx-a11y/mouse-events-have-key-events': 'Add keyboard equivalents for mouse events',
  'jsx-a11y/img-redundant-alt': 'Remove redundant words like "image" or "picture" from alt text',
  'jsx-a11y/no-access-key': 'Remove accessKey attribute',
  'jsx-a11y/aria-activedescendant-has-tabindex': 'Add tabIndex when using aria-activedescendant',
  'jsx-a11y/aria-proptypes': 'Use correct value type for ARIA property',
  'jsx-a11y/aria-unsupported-elements': 'Remove ARIA from unsupported elements',
  'jsx-a11y/autocomplete-valid': 'Use valid autocomplete value',
  'jsx-a11y/html-has-lang': 'Add lang attribute to <html> element',
  'jsx-a11y/no-interactive-element-to-noninteractive-role': 'Do not override interactive element semantics',
  'jsx-a11y/no-noninteractive-element-interactions': 'Add proper role to non-interactive element with handlers',
  'jsx-a11y/no-noninteractive-element-to-interactive-role': 'Use semantic interactive elements instead',
  'jsx-a11y/no-noninteractive-tabindex': 'Remove tabIndex from non-interactive elements',
  'jsx-a11y/no-redundant-roles': 'Remove redundant role that matches implicit semantics',
  'jsx-a11y/role-supports-aria-props': 'Remove ARIA properties not supported by role',
  'jsx-a11y/scope': 'Use scope attribute only on <th> elements',
};

/**
 * Provides code examples for fixing violations
 */
const fixSuggestions = {
  'jsx-a11y/alt-text': [
    '<img src="/logo.png" alt="Company logo" />',
    '<img src="/decorative.png" alt="" /> // For decorative images',
    'Describe what the image conveys, not just "image of..."',
  ],
  'jsx-a11y/click-events-have-key-events': [
    '<div onClick={handler} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handler(); }} tabIndex={0}>',
    'Or better: <button onClick={handler}>Click me</button>',
    'Keyboard users need Enter/Space key support',
  ],
  'jsx-a11y/no-static-element-interactions': [
    'Replace: <button onClick={handler}>Click me</button>',
    'Or add: <div role="button" tabIndex={0} onClick={handler} onKeyDown={keyHandler}>',
    'const keyHandler = (e) => { if (e.key === "Enter" || e.key === " ") handler(); }',
  ],
  'jsx-a11y/label-has-associated-control': [
    '<label htmlFor="email">Email</label><input id="email" type="email" />',
    'Or wrap: <label>Email <input type="email" /></label>',
    'Or use: <input type="email" aria-label="Email" />',
  ],
  'jsx-a11y/interactive-supports-focus': [
    '<div role="button" tabIndex={0} onClick={handler}>',
    'Add tabIndex={0} to make element focusable',
    'Consider using <button> instead for better semantics',
  ],
  'jsx-a11y/aria-role': [
    'Valid roles: button, link, menuitem, tab, checkbox, radio, dialog',
    '<div role="button" tabIndex={0}>Click me</div>',
    'See: https://www.w3.org/TR/wai-aria-1.2/#role_definitions',
  ],
  'jsx-a11y/media-has-caption': [
    '<video controls><track kind="captions" src="captions.vtt" /></video>',
    '<audio controls><track kind="captions" src="captions.vtt" /></audio>',
    'Always provide captions for accessibility',
  ],
  'jsx-a11y/no-autofocus': [
    'Remove: autoFocus={true}',
    'Let users control focus flow naturally',
    'Exception: When explicitly needed (e.g., search on page load)',
  ],
  'jsx-a11y/tabindex-no-positive': [
    'Remove: tabIndex={1}, tabIndex={5}, etc.',
    'Use: tabIndex={0} for natural tab order',
    'Use: tabIndex={-1} for programmatic focus only',
  ],
  'jsx-a11y/aria-props': [
    'Check spelling: aria-labelledby (not aria-labeledby)',
    'Valid props: aria-label, aria-describedby, aria-hidden, etc.',
    'See: https://www.w3.org/TR/wai-aria-1.2/#state_prop_def',
  ],
  'jsx-a11y/role-has-required-aria-props': [
    'role="checkbox" requires: aria-checked',
    'role="slider" requires: aria-valuemin, aria-valuemax, aria-valuenow',
    'Check MDN or W3C ARIA spec for role requirements',
  ],
  'jsx-a11y/heading-has-content': [
    '<h1>Page Title</h1>',
    '<h2>{dynamicTitle}</h2>',
    'Headings must not be empty',
  ],
  'jsx-a11y/iframe-has-title': [
    '<iframe src="..." title="YouTube video player" />',
    '<iframe src="..." title="External content from example.com" />',
    'Title helps users understand iframe purpose',
  ],
  'jsx-a11y/no-distracting-elements': [
    'Remove: <marquee> and <blink>',
    'Use CSS: animation or transition instead',
    'Provide controls to pause/stop animations',
  ],
  'jsx-a11y/anchor-has-content': [
    '<a href="/about">About Us</a>',
    '<a href="/contact" aria-label="Contact page">📧</a>',
    'Links need visible text or aria-label',
  ],
  'jsx-a11y/anchor-is-valid': [
    '<a href="/page">Go to page</a> // Valid navigation',
    '<button onClick={handler}>Do action</button> // For actions',
    'Avoid: href="#" or href="javascript:void(0)"',
  ],
  'jsx-a11y/control-has-associated-label': [
    '<label htmlFor="name">Name</label><input id="name" />',
    '<input aria-label="Search" type="search" />',
    '<button aria-label="Close">×</button>',
  ],
  'jsx-a11y/mouse-events-have-key-events': [
    'onMouseEnter + onFocus',
    'onMouseLeave + onBlur',
    '<div onMouseEnter={show} onFocus={show} onMouseLeave={hide} onBlur={hide}>',
  ],
  'jsx-a11y/img-redundant-alt': [
    'Avoid: alt="image of logo" or alt="picture of product"',
    'Better: alt="Acme Company logo" or alt="Blue t-shirt product"',
    'Screen readers already announce "image"',
  ],
  'jsx-a11y/no-access-key': [
    'Remove: accessKey="s"',
    'accessKey conflicts with screen readers and browser shortcuts',
    'Use visible keyboard shortcuts instead',
  ],
  'jsx-a11y/aria-activedescendant-has-tabindex': [
    '<div role="combobox" aria-activedescendant={activeId} tabIndex={0}>',
    'Element using aria-activedescendant must be focusable',
    'Add tabIndex={0} or ensure element is naturally focusable',
  ],
  'jsx-a11y/aria-proptypes': [
    'aria-hidden="true" (not "yes" or 1)',
    'aria-checked="true" or "false" (not "checked")',
    'aria-expanded="true" or "false" (boolean as string)',
  ],
  'jsx-a11y/aria-unsupported-elements': [
    'Remove ARIA from: <meta>, <html>, <style>, <script>',
    'These elements do not support ARIA attributes',
    'Use ARIA only on visible, interactive elements',
  ],
  'jsx-a11y/autocomplete-valid': [
    '<input type="email" autoComplete="email" />',
    '<input type="tel" autoComplete="tel" />',
    'See: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill',
  ],
  'jsx-a11y/html-has-lang': [
    '<html lang="en">',
    '<html lang="es">',
    'Helps screen readers use correct pronunciation',
  ],
  'jsx-a11y/no-interactive-element-to-noninteractive-role': [
    'Avoid: <button role="article">',
    'Do not override button, a, input, etc. with non-interactive roles',
    'Use semantic HTML as intended',
  ],
  'jsx-a11y/no-noninteractive-element-interactions': [
    '<li onClick={handler}> → <li role="button" tabIndex={0} onClick={handler}>',
    'Non-interactive elements need role and keyboard support',
    'Or use: <button onClick={handler}>Item</button>',
  ],
  'jsx-a11y/no-noninteractive-element-to-interactive-role': [
    'Avoid: <h1 role="button">',
    'Use interactive elements: <button>, <a>, <input>',
    'Headings, paragraphs should not be interactive',
  ],
  'jsx-a11y/no-noninteractive-tabindex': [
    'Remove: <div tabIndex={0}> (without interactive role)',
    'Add: <div role="button" tabIndex={0}>',
    'Only focusable elements should have tabIndex',
  ],
  'jsx-a11y/no-redundant-roles': [
    'Remove: <button role="button">',
    'Remove: <nav role="navigation">',
    'Semantic HTML already has implicit roles',
  ],
  'jsx-a11y/role-supports-aria-props': [
    'Avoid: <div role="button" aria-placeholder="...">',
    'Check ARIA spec for role-specific properties',
    'Each role supports only certain ARIA attributes',
  ],
  'jsx-a11y/scope': [
    '<th scope="col">Header</th> // For column headers',
    '<th scope="row">Label</th> // For row headers',
    'Do not use scope on <td> elements',
  ],
};

/**
 * Analyze file using ESLint Linter with jsx-a11y plugin
 */
export async function analyzeFileHybrid(content, filePath = 'temp.jsx') {
  const linter = new Linter({ configType: 'flat' });
  
  try {
    // Lint the content using the Linter API
    const messages = linter.verify(content, linterConfig, { filename: filePath });
    
    // Transform Linter messages to our violation format
    const violations = messages
      .filter(msg => msg.ruleId && msg.ruleId.startsWith('jsx-a11y/'))
      .map(msg => ({
        id: msg.ruleId,
        severity: msg.severity === 2 ? 'error' : 'warning',
        message: msg.message,
        description: msg.message,
        line: msg.line,
        column: msg.column,
        endLine: msg.endLine,
        endColumn: msg.endColumn,
        wcagCriteria: ruleToWCAG[msg.ruleId] || [],
        fix: fixDescriptions[msg.ruleId] || 'Review WCAG 2.2 documentation',
        suggestions: fixSuggestions[msg.ruleId] || [
          'Review WCAG 2.2 documentation',
          'Consult accessibility team for guidance',
        ],
      }));

    return violations;
  } catch (error) {
    console.error('ESLint analysis error:', error);
    // Fallback to empty array if linting fails
    return [];
  }
}
