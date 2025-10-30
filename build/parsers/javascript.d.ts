/**
 * JSX/TSX/JS parser using Babel AST
 */
import { BaseParser } from './base.js';
import { ParserResult } from '../types/index.js';
export declare class JavaScriptParser extends BaseParser {
    private ast;
    private errors;
    parse(): ParserResult;
    private parseWithBabel;
    private getFileType;
    private getBabelParserOptions;
    /**
     * Traverse the AST with a visitor function
     */
    traverse(visitor: (node: any, parent?: any) => void): void;
    /**
     * Find all nodes of a specific type
     */
    findNodes(nodeType: string): any[];
    /**
     * Find nodes matching a custom predicate
     */
    findNodesMatching(predicate: (node: any) => boolean): any[];
    /**
     * Get JSX elements with specific attributes or props
     */
    findJSXElements(elementName?: string, hasAttributes?: string[]): any[];
    private getJSXElementName;
    private hasJSXAttribute;
    /**
     * Get the location (line, column) for a node
     */
    getNodeLocation(node: any): {
        line: number;
        column: number;
    };
    /**
     * Extract source code for a node
     */
    getNodeCode(node: any): string;
}
