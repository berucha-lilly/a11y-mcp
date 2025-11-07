/**
 * JSX/TSX/JS parser using Babel AST
 */
import * as babelParser from '@babel/parser';
import * as traverse from '@babel/traverse';
import { BaseParser } from './base.js';
export class JavaScriptParser extends BaseParser {
    ast = null;
    errors = [];
    parse() {
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
    parseWithBabel() {
        const fileType = this.getFileType();
        try {
            const parserOptions = this.getBabelParserOptions(fileType);
            this.ast = babelParser.parse(this.content, parserOptions);
        }
        catch (error) {
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
    getFileType() {
        const ext = this.filePath.toLowerCase().split('.').pop();
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
    getBabelParserOptions(fileType) {
        const baseOptions = {
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
    traverse(visitor) {
        if (!this.ast) {
            return;
        }
        traverse.default(this.ast, {
            enter: (path) => {
                visitor(path.node, path.parent);
            }
        });
    }
    /**
     * Find all nodes of a specific type
     */
    findNodes(nodeType) {
        const nodes = [];
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
    findNodesMatching(predicate) {
        const nodes = [];
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
    findJSXElements(elementName, hasAttributes) {
        const elements = [];
        this.traverse((node) => {
            if (node.type === 'JSXElement') {
                const name = this.getJSXElementName(node);
                if (elementName && name !== elementName) {
                    return;
                }
                if (hasAttributes && hasAttributes.length > 0) {
                    const hasRequiredAttributes = hasAttributes.every(attr => this.hasJSXAttribute(node, attr));
                    if (!hasRequiredAttributes) {
                        return;
                    }
                }
                elements.push(node);
            }
        });
        return elements;
    }
    getJSXElementName(node) {
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
    hasJSXAttribute(node, attributeName) {
        if (node.openingElement.type !== 'JSXOpeningElement') {
            return false;
        }
        return node.openingElement.attributes.some((attr) => {
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
    getNodeLocation(node) {
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
    getNodeCode(node) {
        if (node.start !== undefined && node.end !== undefined) {
            return this.content.substring(node.start, node.end);
        }
        return '';
    }
}
