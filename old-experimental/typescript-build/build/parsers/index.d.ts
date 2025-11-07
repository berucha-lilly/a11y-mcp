/**
 * Parser factory for different file types
 */
import { BaseParser } from './base.js';
export declare class ParserFactory {
    static createParser(content: string, filePath: string): BaseParser | null;
    static getFileType(filePath: string): 'jsx' | 'tsx' | 'js' | 'css' | 'scss' | 'unknown';
    static canParse(filePath: string): boolean;
}
