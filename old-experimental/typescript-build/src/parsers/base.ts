/**
 * Base file parser with common functionality
 */

import fs from 'fs/promises';
import path from 'path';

export abstract class BaseParser {
  protected content: string;
  protected filePath: string;

  constructor(content: string, filePath: string) {
    this.content = content;
    this.filePath = filePath;
  }

  abstract parse(): any;

  protected getLineFromOffset(offset: number): number {
    if (offset < 0 || offset >= this.content.length) {
      return 1;
    }
    
    const lineEndings = this.content.substring(0, offset).split('\n');
    return lineEndings.length;
  }

  protected getColumnFromOffset(offset: number): number {
    if (offset < 0 || offset >= this.content.length) {
      return 1;
    }

    const lines = this.content.substring(0, offset).split('\n');
    const lastLine = lines[lines.length - 1];
    return lastLine.length + 1;
  }

  protected extractCodeSnippet(startLine: number, endLine: number, contextLines: number = 2): string {
    const lines = this.content.split('\n');
    const start = Math.max(0, startLine - contextLines - 1);
    const end = Math.min(lines.length, endLine + contextLines);
    
    return lines.slice(start, end).join('\n');
  }
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
export class FileUtils {
  static getFileType(filePath: string): 'jsx' | 'tsx' | 'js' | 'css' | 'scss' | 'unknown' {
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

  static shouldIgnoreFile(filePath: string, ignorePatterns: string[]): boolean {
    return ignorePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    });
  }

  static async readFileSafe(filePath: string): Promise<{ content: string; error?: string }> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return { content };
    } catch (error) {
      return {
        content: '',
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}