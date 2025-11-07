/**
 * Base file parser with common functionality
 */
export declare abstract class BaseParser {
    protected content: string;
    protected filePath: string;
    constructor(content: string, filePath: string);
    abstract parse(): any;
    protected getLineFromOffset(offset: number): number;
    protected getColumnFromOffset(offset: number): number;
    protected extractCodeSnippet(startLine: number, endLine: number, contextLines?: number): string;
}
export interface ParseError {
    message: string;
    line: number;
    column: number;
    code: string;
}
/**
 * Utility functions for file operations
 */
export declare class FileUtils {
    static getFileType(filePath: string): 'jsx' | 'tsx' | 'js' | 'css' | 'scss' | 'unknown';
    static shouldIgnoreFile(filePath: string, ignorePatterns: string[]): boolean;
    static readFileSafe(filePath: string): Promise<{
        content: string;
        error?: string;
    }>;
}
