/**
 * Main accessibility scanner that orchestrates file parsing and rule checking
 */

import path from 'path';
import { ConfigManager } from '../config/index.js';
import { ParserFactory } from '../parsers/index.js';
import { WCAGRuleEngine } from '../rules/wcag-engine.js';
import { LDSIntegration } from '../lds/index.js';
import { 
  FileAnalysis, 
  ScanResult, 
  WCAGViolation, 
  ConfigFile 
} from '../types/index.js';

export class AccessibilityScanner {
  private configManager: ConfigManager;
  private ruleEngine: WCAGRuleEngine;
  private ldsIntegration: LDSIntegration;

  constructor(configDir?: string) {
    this.configManager = new ConfigManager(configDir);
    this.ruleEngine = new WCAGRuleEngine();
    this.ldsIntegration = new LDSIntegration(
      'https://storybook.lilly.internal',
      3600
    );
  }

  async initialize(): Promise<void> {
    await this.configManager.initialize();
  }

  /**
   * Scan a single file for accessibility issues
   */
  async scanFile(filePath: string, content: string): Promise<FileAnalysis> {
    const fileType = ParserFactory.getFileType(filePath);
    
    if (fileType === 'unknown') {
      return {
        filePath,
        fileType: 'jsx',
        content,
        violations: [],
        statistics: {
          totalViolations: 0,
          errors: 0,
          warnings: 0,
          info: 0,
          estimatedFixTime: '0 minutes'
        },
        metadata: {
          lineCount: content.split('\n').length,
          analyzedAt: new Date().toISOString()
        }
      };
    }

    // Create appropriate parser
    const parser = ParserFactory.createParser(content, filePath);
    if (!parser) {
      throw new Error(`No parser available for file type: ${fileType}`);
    }

    // Parse the file
    const parseResult = parser.parse();
    
    // Get configuration
    const config = this.configManager.getConfig();

    // Check for parse errors
    if (parseResult.hasErrors) {
      const violations: WCAGViolation[] = parseResult.errors.map((error, index) => ({
        id: `parse-error-${index}`,
        severity: 'error',
        wcagCriteria: [],
        title: 'Parse Error',
        description: `Failed to parse file: ${error}`,
        help: 'Check file syntax and structure',
        line: 1,
        column: 1,
        code: content,
        fixSuggestions: [],
        tags: ['parse-error']
      }));

      return this.createFileAnalysis(filePath, fileType, content, violations, config);
    }

    // Run WCAG rule checks
    const ruleResult = await this.ruleEngine.checkFile(parser, fileType, config);
    
    // If this is a JSX/TSX file and LDS is enabled, check component usage
    if ((fileType === 'jsx' || fileType === 'tsx') && config.ldsEnforcement.enabled) {
      const ldsViolations = await this.checkLDSComponents(parser, filePath, config);
      ruleResult.violations.push(...ldsViolations);
    }

    return this.createFileAnalysis(filePath, fileType, content, ruleResult.violations, config);
  }

  /**
   * Scan multiple files
   */
  async scanFiles(files: Array<{ path: string; content: string }>): Promise<ScanResult> {
    const analyses: FileAnalysis[] = [];
    
    for (const file of files) {
      try {
        const analysis = await this.scanFile(file.path, file.content);
        analyses.push(analysis);
      } catch (error) {
        console.warn(`Failed to scan file ${file.path}:`, error);
        
        // Create error analysis
        const errorAnalysis: FileAnalysis = {
          filePath: file.path,
          fileType: ParserFactory.getFileType(file.path),
          content: file.content,
          violations: [
            {
              id: 'scan-error',
              severity: 'error',
              wcagCriteria: [],
              title: 'Scan Error',
              description: `Failed to scan file: ${error instanceof Error ? error.message : 'Unknown error'}`,
              help: 'Check file structure and syntax',
              line: 1,
              column: 1,
              code: file.content,
              fixSuggestions: [],
              tags: ['scan-error']
            }
          ],
          statistics: {
            totalViolations: 1,
            errors: 1,
            warnings: 0,
            info: 0,
            estimatedFixTime: '5 minutes'
          },
          metadata: {
            lineCount: file.content.split('\n').length,
            analyzedAt: new Date().toISOString()
          }
        };
        
        analyses.push(errorAnalysis);
      }
    }

    return this.createScanResult(analyses);
  }

  /**
   * Scan a directory for accessibility issues
   */
  async scanDirectory(dirPath: string, ignorePatterns?: string[]): Promise<ScanResult> {
    // This would be implemented to recursively scan files in a directory
    // For now, return a placeholder
    throw new Error('Directory scanning not yet implemented');
  }

  private createFileAnalysis(
    filePath: string,
    fileType: 'jsx' | 'tsx' | 'js' | 'css' | 'scss',
    content: string,
    violations: WCAGViolation[],
    config: ConfigFile
  ): FileAnalysis {
    // Calculate statistics
    const errors = violations.filter(v => v.severity === 'error').length;
    const warnings = violations.filter(v => v.severity === 'warning').length;
    const info = violations.filter(v => v.severity === 'info').length;
    const totalViolations = violations.length;

    // Calculate estimated fix time (rough estimate)
    const estimatedMinutes = errors * 5 + warnings * 2 + info * 1;
    const estimatedFixTime = estimatedMinutes === 0 ? 
      '0 minutes' : 
      estimatedMinutes < 60 ? 
        `${estimatedMinutes} minutes` : 
        `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`;

    // Group violations by category
    const categories = new Map<string, number>();
    violations.forEach(v => {
      const category = this.getViolationCategory(v);
      categories.set(category, (categories.get(category) || 0) + 1);
    });

    return {
      filePath,
      fileType,
      content,
      violations,
      statistics: {
        totalViolations,
        errors,
        warnings,
        info,
        estimatedFixTime
      },
      metadata: {
        lineCount: content.split('\n').length,
        componentCount: this.countComponents(content, fileType),
        analyzedAt: new Date().toISOString()
      }
    };
  }

  private createScanResult(analyses: FileAnalysis[]): ScanResult {
    const totalFiles = analyses.length;
    const filesWithViolations = analyses.filter(a => a.violations.length > 0).length;
    
    const allViolations = analyses.flatMap(a => a.violations);
    const totalViolations = allViolations.length;
    
    // Calculate overall compliance score (simplified)
    const errorCount = allViolations.filter(v => v.severity === 'error').length;
    const warningCount = allViolations.filter(v => v.severity === 'warning').length;
    
    // Simple scoring: 100% - (errors * 5% + warnings * 1%)
    const complianceScore = Math.max(0, 100 - (errorCount * 5 + warningCount * 1));

    // Calculate total estimated fix time
    const totalMinutes = analyses.reduce((sum, a) => {
      const match = a.statistics.estimatedFixTime.match(/(\d+)h?\s*(\d+)?m?/);
      if (match) {
        const hours = match[1] ? parseInt(match[1]) : 0;
        const minutes = match[2] ? parseInt(match[2]) : 0;
        return sum + (hours * 60 + minutes);
      }
      return sum;
    }, 0);

    const estimatedTotalFixTime = totalMinutes === 0 ? 
      '0 minutes' : 
      totalMinutes < 60 ? 
        `${totalMinutes} minutes` : 
        `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

    // Get top categories
    const categoryMap = new Map<string, number>();
    allViolations.forEach(v => {
      const category = this.getViolationCategory(v);
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    const topCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Generate general suggestions
    const suggestions = this.generateSuggestions(allViolations);

    return {
      files: analyses,
      summary: {
        totalFiles,
        totalViolations,
        filesWithViolations,
        complianceScore,
        estimatedTotalFixTime,
        topCategories
      },
      suggestions
    };
  }

  private getViolationCategory(violation: WCAGViolation): string {
    if (violation.tags.includes('aria')) return 'ARIA';
    if (violation.tags.includes('keyboard')) return 'Keyboard Navigation';
    if (violation.tags.includes('alt-text')) return 'Alternative Text';
    if (violation.tags.includes('semantic')) return 'Semantic HTML';
    if (violation.tags.includes('heading')) return 'Heading Structure';
    if (violation.tags.includes('form')) return 'Form Labels';
    if (violation.tags.includes('focus')) return 'Focus Management';
    if (violation.tags.includes('lds-components')) return 'LDS Components';
    if (violation.tags.includes('parse-error')) return 'Parse Errors';
    if (violation.tags.includes('scan-error')) return 'Scan Errors';
    
    return 'Other';
  }

  private countComponents(content: string, fileType: string): number {
    if (fileType === 'jsx' || fileType === 'tsx') {
      // Count JSX elements (basic heuristic)
      const componentMatches = content.match(/<[A-Z][a-zA-Z]*\b/g);
      return componentMatches ? componentMatches.length : 0;
    }
    return 0;
  }

  private async checkLDSComponents(parser: any, filePath: string, config: ConfigFile): Promise<WCAGViolation[]> {
    const violations: WCAGViolation[] = [];

    if (!parser.findNodesMatching) {
      return violations;
    }

    // Find JSX elements that might be LDS components
    const elements = parser.findNodesMatching((node: any) => {
      if (node.type !== 'JSXElement') return false;
      
      const name = parser.getJSXElementName(node);
      
      // Check if it looks like an LDS component (starts with capital letter)
      return /^[A-Z]/.test(name) && name.length > 1;
    });

    for (const element of elements) {
      const componentName = parser.getJSXElementName(element);
      const location = parser.getNodeLocation(element);
      const code = parser.getNodeCode(element);

      // Extract props from the JSX element
      const props: Record<string, any> = {};
      element.openingElement?.attributes?.forEach((attr: any) => {
        if (attr.type === 'JSXAttribute') {
          const propName = attr.name?.name;
          let propValue = null;
          
          if (attr.value) {
            if (attr.value.type === 'StringLiteral') {
              propValue = attr.value.value;
            } else if (attr.value.type === 'JSXExpressionContainer') {
              // For expressions, we can't determine the actual value
              // but we can note that it exists
              propValue = '[expression]';
            }
          } else if (attr.value === null) {
            propValue = true;
          }
          
          if (propName) {
            props[propName] = propValue;
          }
        }
      });

      // Validate component usage with LDS
      try {
        const validationResult = await this.ldsIntegration.validateComponentUsage(
          componentName,
          props
        );

        if (!validationResult.valid) {
          validationResult.issues.forEach(issue => {
            violations.push({
              id: 'lds-component-error',
              severity: 'error',
              wcagCriteria: ['4.1.2'],
              title: `LDS Component Issue: ${componentName}`,
              description: issue,
              help: validationResult.suggestions.find(s => s.includes(issue)) || 
                    'Review LDS component documentation',
              helpUrl: `https://storybook.lilly.internal/?path=/docs/${componentName.toLowerCase()}`,
              line: location.line,
              column: location.column,
              element: componentName,
              code: code,
              fixSuggestions: validationResult.suggestions
                .filter(s => s !== issue)
                .map(suggestion => ({
                  title: 'LDS Component Fix',
                  description: suggestion,
                  priority: 1
                })),
              tags: ['lds-components', 'wcag-4.1.2']
            });
          });
        }

        // Check for deprecated or non-standard components
        if (this.isNonStandardComponent(componentName)) {
          violations.push({
            id: 'lds-non-standard-component',
            severity: 'warning',
            wcagCriteria: [],
            title: `Non-standard LDS Component: ${componentName}`,
            description: `${componentName} is not part of the approved LDS component library`,
            help: 'Use approved LDS components for consistency and accessibility compliance',
            helpUrl: 'https://storybook.lilly.internal/',
            line: location.line,
            column: location.column,
            element: componentName,
            code: code,
            fixSuggestions: [
              {
                title: 'Use approved LDS component',
                description: 'Replace with equivalent component from LDS library',
                priority: 2
              }
            ],
            tags: ['lds-components', 'deprecated']
          });
        }

      } catch (error) {
        console.warn(`Failed to validate LDS component "${componentName}":`, error);
        
        violations.push({
          id: 'lds-validation-error',
          severity: 'info',
          wcagCriteria: [],
          title: `LDS Validation Error: ${componentName}`,
          description: `Unable to validate component against LDS standards`,
          help: 'Check LDS integration and component availability',
          line: location.line,
          column: location.column,
          element: componentName,
          code: code,
          fixSuggestions: [],
          tags: ['lds-components', 'validation-error']
        });
      }
    }

    return violations;
  }

  private isNonStandardComponent(componentName: string): boolean {
    // List of approved LDS components
    const approvedComponents = [
      'Button', 'Input', 'Modal', 'Select', 'Checkbox', 'Radio',
      'Switch', 'Textarea', 'Label', 'ErrorMessage', 'Icon',
      'Tooltip', 'Popover', 'Dropdown', 'Tabs', 'Accordion'
    ];

    return !approvedComponents.includes(componentName);
  }

  private generateSuggestions(violations: WCAGViolation[]): string[] {
    const suggestions: string[] = [];

    // Count issues by category
    const categoryCount = new Map<string, number>();
    violations.forEach(v => {
      const category = this.getViolationCategory(v);
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    });

    // Generate category-specific suggestions
    if (categoryCount.get('ARIA')! > 0) {
      suggestions.push('Review ARIA attribute usage to ensure proper accessibility roles and relationships');
    }

    if (categoryCount.get('Alternative Text')! > 0) {
      suggestions.push('Add descriptive alt text to images or mark decorative images appropriately');
    }

    if (categoryCount.get('Keyboard Navigation')! > 0) {
      suggestions.push('Ensure all interactive elements are keyboard accessible with proper focus management');
    }

    if (categoryCount.get('Semantic HTML')! > 0) {
      suggestions.push('Use semantic HTML elements instead of generic divs/buttons for better accessibility');
    }

    if (categoryCount.get('LDS Components')! > 0) {
      suggestions.push('Use approved Lilly Design System components to ensure accessibility compliance');
    }

    // Add general accessibility suggestions
    suggestions.push('Consider running automated accessibility testing as part of your development workflow');
    suggestions.push('Review WCAG 2.2 AA guidelines for comprehensive accessibility best practices');

    return suggestions;
  }

  // Configuration management
  getConfig(): ConfigFile {
    return this.configManager.getConfig();
  }

  async setConfig(config: ConfigFile): Promise<void> {
    await this.configManager.saveConfig(config);
  }

  subscribeToConfigChanges(callback: (config: ConfigFile) => void): () => void {
    return this.configManager.subscribe(callback);
  }
}