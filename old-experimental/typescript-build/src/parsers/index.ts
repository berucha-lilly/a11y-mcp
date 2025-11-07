/**
 * Parser factory for different file types
 */

import { JavaScriptParser } from './javascript.js';
import { CSSParser } from './css.js';
import { BaseParser } from './base.js';
import { ParserResult } from '../types/index.js';

export class ParserFactory {
  static createParser(content: string, filePath: string): BaseParser | null {
    const fileType = this.getFileType(filePath);

    switch (fileType) {
      case 'jsx':
      case 'tsx':
      case 'js':
        return new JavaScriptParser(content, filePath);
      
      case 'css':
      case 'scss':
        return new CSSParser(content, filePath);
      
      default:
        return null;
    }
  }

  static getFileType(filePath: string): 'jsx' | 'tsx' | 'js' | 'css' | 'scss' | 'unknown' {
    const ext = filePath.toLowerCase().split('.').pop()!;
    
    switch (ext) {
      case 'jsx':
        return 'jsx';
      case 'tsx':
        return 'tsx';
      case 'js':
        return 'js';
      case 'css':
        return 'css';
      case 'scss':
        return 'scss';
      default:
        return 'unknown';
    }
  }

  static canParse(filePath: string): boolean {
    const fileType = this.getFileType(filePath);
    return fileType !== 'unknown';
  }
}