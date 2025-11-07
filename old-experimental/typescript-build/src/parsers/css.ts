/**
 * CSS/SCSS parser using PostCSS
 */

import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import { BaseParser, ParseError } from './base.js';
import { ParserResult } from '../types/index.js';

export class CSSParser extends BaseParser {
  private ast: postcss.Root = null;
  private errors: ParseError[] = [];

  parse(): ParserResult {
    return this.parseWithPostCSS();
  }

  private parseWithPostCSS(): ParserResult {
    const fileType = this.getFileType();

    try {
      let result: postcss.Result;

      if (fileType === 'scss') {
        // Parse SCSS with postcss-scss
        result = postcss().process(this.content, {
          from: this.filePath,
          parser: postcssScss,
          syntax: postcssScss
        });
      } else {
        // Parse CSS
        result = postcss().process(this.content, {
          from: this.filePath,
          parser: postcss
        });
      }

      this.ast = result.root;

      // Collect any warnings as errors for our purposes
      result.warnings().forEach(warning => {
        this.errors.push({
          message: warning.text,
          line: warning.source && warning.source.start 
            ? warning.source.start.line 
            : 1,
          column: warning.source && warning.source.start 
            ? warning.source.start.column 
            : 1,
          code: this.extractCodeSnippet(
            warning.source?.start?.line || 1,
            warning.source?.end?.line || 1
          )
        });
      });

      return {
        ast: this.ast,
        hasErrors: this.errors.length > 0,
        errors: this.errors.map(e => e.message)
      };

    } catch (error: any) {
      this.errors.push({
        message: error.message,
        line: error.line || 1,
        column: error.column || 1,
        code: this.extractCodeSnippet(error.line || 1, error.line || 1)
      });

      return {
        ast: null,
        hasErrors: true,
        errors: this.errors.map(e => e.message)
      };
    }
  }

  private getFileType(): 'css' | 'scss' {
    const ext = this.filePath.toLowerCase().split('.').pop()!;
    return ext === 'scss' ? 'scss' : 'css';
  }

  /**
   * Find all CSS rules
   */
  getAllRules(): postcss.Rule[] {
    if (!this.ast) {
      return [];
    }

    return this.ast.find(postcss.rule);
  }

  /**
   * Find CSS rules by selector
   */
  getRulesBySelector(selector: string): postcss.Rule[] {
    return this.getAllRules().filter(rule => {
      return rule.selector === selector;
    });
  }

  /**
   * Find rules that contain specific selectors
   */
  getRulesContaining(selectorPattern: RegExp): postcss.Rule[] {
    return this.getAllRules().filter(rule => {
      return selectorPattern.test(rule.selector);
    });
  }

  /**
   * Find all CSS declarations (properties and values)
   */
  getAllDeclarations(): postcss.Declaration[] {
    if (!this.ast) {
      return [];
    }

    const declarations: postcss.Declaration[] = [];
    this.ast.walkDecls(decl => {
      declarations.push(decl);
    });

    return declarations;
  }

  /**
   * Find declarations by property name
   */
  getDeclarationsByProperty(property: string): postcss.Declaration[] {
    return this.getAllDeclarations().filter(decl => {
      return decl.prop === property;
    });
  }

  /**
   * Check if focus styles are defined
   */
  hasFocusStyles(): { hasFocus: boolean; hasFocusVisible: boolean; hasFocusWithin: boolean } {
    const rules = this.getAllRules();
    
    let hasFocus = false;
    let hasFocusVisible = false;
    let hasFocusWithin = false;

    rules.forEach(rule => {
      const selector = rule.selector.toLowerCase();
      
      if (selector.includes(':focus')) {
        hasFocus = true;
      }
      
      if (selector.includes(':focus-visible')) {
        hasFocusVisible = true;
      }
      
      if (selector.includes(':focus-within')) {
        hasFocusWithin = true;
      }
    });

    return { hasFocus, hasFocusVisible, hasFocusWithin };
  }

  /**
   * Find color-related declarations
   */
  getColorDeclarations(): {
    color: postcss.Declaration[];
    backgroundColor: postcss.Declaration[];
    borderColor: postcss.Declaration[];
  } {
    const declarations = this.getAllDeclarations();

    return {
      color: declarations.filter(d => d.prop === 'color'),
      backgroundColor: declarations.filter(d => d.prop === 'background-color'),
      borderColor: declarations.filter(d => d.prop.startsWith('border'))
    };
  }

  /**
   * Get all media queries
   */
  getMediaQueries(): postcss.AtRule[] {
    if (!this.ast) {
      return [];
    }

    return this.ast.find(postcss.atRule);
  }

  /**
   * Check if prefers-reduced-motion is respected
   */
  checkPrefersReducedMotion(): {
    hasPrefersReducedMotion: boolean;
    hasAnimationOrTransition: boolean;
    mediaQueries: string[];
  } {
    const atRules = this.getMediaQueries();
    const declarations = this.getAllDeclarations();

    const hasPrefersReducedMotion = atRules.some(rule => 
      rule.params.includes('prefers-reduced-motion')
    );

    const hasAnimationOrTransition = declarations.some(decl => 
      decl.prop.includes('animation') || 
      decl.prop.includes('transition') ||
      decl.prop === 'animation' ||
      decl.prop === 'transition'
    );

    const mediaQueries = atRules
      .filter(rule => rule.type === 'atrule')
      .map(rule => rule.params);

    return {
      hasPrefersReducedMotion,
      hasAnimationOrTransition,
      mediaQueries
    };
  }

  /**
   * Extract CSS code snippet for a node
   */
  getNodeCSSCode(node: any): string {
    if (node.source && node.source.input && node.source.selector) {
      // For rules
      if (node.selector) {
        return `${node.selector} { ${node.nodes?.map((n: any) => n.toString()).join(' ') || ''} }`;
      }
    }
    return node.toString();
  }
}