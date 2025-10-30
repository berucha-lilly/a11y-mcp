/**
 * Base file parser with common functionality
 */
import fs from 'fs/promises';
import path from 'path';
export class BaseParser {
    content;
    filePath;
    constructor(content, filePath) {
        this.content = content;
        this.filePath = filePath;
    }
    getLineFromOffset(offset) {
        if (offset < 0 || offset >= this.content.length) {
            return 1;
        }
        const lineEndings = this.content.substring(0, offset).split('\n');
        return lineEndings.length;
    }
    getColumnFromOffset(offset) {
        if (offset < 0 || offset >= this.content.length) {
            return 1;
        }
        const lines = this.content.substring(0, offset).split('\n');
        const lastLine = lines[lines.length - 1];
        return lastLine.length + 1;
    }
    extractCodeSnippet(startLine, endLine, contextLines = 2) {
        const lines = this.content.split('\n');
        const start = Math.max(0, startLine - contextLines - 1);
        const end = Math.min(lines.length, endLine + contextLines);
        return lines.slice(start, end).join('\n');
    }
}
/**
 * Utility functions for file operations
 */
export class FileUtils {
    static getFileType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.jsx':
                return 'jsx';
            case '.tsx':
                return 'tsx';
            case '.js':
                return 'js';
            case '.css':
                return 'css';
            case '.scss':
                return 'scss';
            default:
                return 'unknown';
        }
    }
    static shouldIgnoreFile(filePath, ignorePatterns) {
        return ignorePatterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
            return regex.test(filePath);
        });
    }
    static async readFileSafe(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return { content };
        }
        catch (error) {
            return {
                content: '',
                error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
