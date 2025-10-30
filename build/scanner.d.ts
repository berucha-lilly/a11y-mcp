/**
 * Main accessibility scanner that orchestrates file parsing and rule checking
 */
import { FileAnalysis, ScanResult, ConfigFile } from '../types/index.js';
export declare class AccessibilityScanner {
    private configManager;
    private ruleEngine;
    private ldsIntegration;
    constructor(configDir?: string);
    initialize(): Promise<void>;
    /**
     * Scan a single file for accessibility issues
     */
    scanFile(filePath: string, content: string): Promise<FileAnalysis>;
    /**
     * Scan multiple files
     */
    scanFiles(files: Array<{
        path: string;
        content: string;
    }>): Promise<ScanResult>;
    /**
     * Scan a directory for accessibility issues
     */
    scanDirectory(dirPath: string, ignorePatterns?: string[]): Promise<ScanResult>;
    private createFileAnalysis;
    private createScanResult;
    private getViolationCategory;
    private countComponents;
    private checkLDSComponents;
    private isNonStandardComponent;
    private generateSuggestions;
    getConfig(): ConfigFile;
    setConfig(config: ConfigFile): Promise<void>;
    subscribeToConfigChanges(callback: (config: ConfigFile) => void): () => void;
}
