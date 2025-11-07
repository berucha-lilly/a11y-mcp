/**
 * JSX/TSX/JS parser using Babel AST
 */

import * as babel from '@babel/core';
import * as babelParser from '@babel/parser';
import * as traverse from '@babel/traverse';
import { BaseParser, ParseError } from './base.js';
import { ParserResult } from '../types/index.js';

export class JavaScriptParser extends BaseParser {
  private ast: any = null;
  private errors: ParseError[] = [];

  parse(): ParserResult {
    this.parseWithBabel();
    
    if (this.errors.length > 0) {
      return {
        ast: null,
        hasErrors: true,
        errors: this.errors.map(e => e.message)
      };
    }

    return {
      ast: this.ast,
      hasErrors: false,
      errors: []
    };
  }

  private parseWithBabel(): void {
    const fileType = this.getFileType();

    try {
      const parserOptions = this.getBabelParserOptions(fileType);

      this.ast = babelParser.parse(this.content, parserOptions);

    } catch (error: any) {
      // Handle parser errors
      if (error.lineNumber && error.column) {
        this.errors.push({
          message: error.message,
          line: error.lineNumber,
          column: error.column,
          code: this.extractCodeSnippet(error.lineNumber, error.lineNumber)
        });
      }
    }
  }

  private getFileType(): 'jsx' | 'tsx' | 'js' {
    const ext = this.filePath.toLowerCase().split('.').pop()!;
    
    switch (ext) {
      case 'jsx':
        return 'jsx';
      case 'tsx':
        return 'tsx';
      case 'js':
      default:
        return 'js';
    }
  }

  private getBabelParserOptions(fileType: 'jsx' | 'tsx' | 'js'): babelParser.ParserOptions {
    const baseOptions: babelParser.ParserOptions = {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      strictMode: false,
      plugins: []
    };

    switch (fileType) {
      case 'jsx':
        baseOptions.plugins = [
          'jsx',
          'flow',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread',
          'dynamicImport',
          'importMeta'
        ];
        break;
      
      case 'tsx':
        baseOptions.plugins = [
          'jsx',
          'typescript',
          'flow',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread',
          'dynamicImport',
          'importMeta'
        ];
        break;
      
      case 'js':
      default:
        baseOptions.plugins = [
          'flow',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread',
          'dynamicImport',
          'importMeta'
        ];
        break;
    }

    return baseOptions;
  }

  /**
   * Traverse the AST with a visitor function
   */
  traverse(visitor: (node: any, parent?: any) => void): void {
    if (!this.ast) {
      return;
    }

    traverse.default(this.ast, {
      enter: (path: any) => {
        visitor(path.node, path.parent);
      }
    });
  }

  /**
   * Find all nodes of a specific type
   */
  findNodes(nodeType: string): any[] {
    const nodes: any[] = [];
    
    this.traverse((node) => {
      if (node.type === nodeType) {
        nodes.push(node);
      }
    });

    return nodes;
  }

  /**
   * Find nodes matching a custom predicate
   */
  findNodesMatching(predicate: (node: any) => boolean): any[] {
    const nodes: any[] = [];
    
    this.traverse((node) => {
      if (predicate(node)) {
        nodes.push(node);
      }
    });

    return nodes;
  }

  /**
   * Get JSX elements with specific attributes or props
   */
  findJSXElements(
    elementName?: string,
    hasAttributes?: string[]
  ): any[] {
    const elements: any[] = [];
    
    this.traverse((node) => {
      if (node.type === 'JSXElement') {
        const name = this.getJSXElementName(node);
        
        if (elementName && name !== elementName) {
          return;
        }

        if (hasAttributes && hasAttributes.length > 0) {
          const hasRequiredAttributes = hasAttributes.every(attr => 
            this.hasJSXAttribute(node, attr)
          );
          
          if (!hasRequiredAttributes) {
            return;
          }
        }

        elements.push(node);
      }
    });

    return elements;
  }

  private getJSXElementName(node: any): string {
    if (node.openingElement.type !== 'JSXOpeningElement') {
      return '';
    }

    const nameNode = node.openingElement.name;
    
    if (nameNode.type === 'JSXIdentifier') {
      return nameNode.name;
    }

    if (nameNode.type === 'JSXMemberExpression') {
      return `${nameNode.object.name}.${nameNode.property.name}`;
    }

    return '';
  }

  private hasJSXAttribute(node: any, attributeName: string): boolean {
    if (node.openingElement.type !== 'JSXOpeningElement') {
      return false;
    }

    return node.openingElement.attributes.some((attr: any) => {
      if (attr.type === 'JSXIdentifier' && attr.name.name === attributeName) {
        return true;
      }
      
      if (attr.type === 'JSXAttribute' && 
          attr.name.type === 'JSXIdentifier' && 
          attr.name.name === attributeName) {
        return true;
      }

      return false;
    });
  }

  /**
   * Get the location (line, column) for a node
   */
  getNodeLocation(node: any): { line: number; column: number } {
    if (node.loc && node.loc.start) {
      return {
        line: node.loc.start.line,
        column: node.loc.start.column
      };
    }

    return { line: 1, column: 1 };
  }

  /**
   * Extract source code for a node
   */
  getNodeCode(node: any): string {
    if (node.start !== undefined && node.end !== undefined) {
      return this.content.substring(node.start, node.end);
    }
    return '';
  }
}