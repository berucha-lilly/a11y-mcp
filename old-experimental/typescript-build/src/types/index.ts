/**
 * Type definitions for GitHub Accessibility Reviewer MCP Server
 */

export interface WCAGViolation {
  id: string;
  severity: 'error' | 'warning' | 'info';
  wcagCriteria: string[];
  title: string;
  description: string;
  help: string;
  helpUrl?: string;
  line: number;
  column: number;
  element?: string;
  code: string;
  fixSuggestions: FixSuggestion[];
  tags: string[];
}

export interface FixSuggestion {
  title: string;
  description: string;
  code?: string;
  example?: string;
  priority: number;
}

export interface FileAnalysis {
  filePath: string;
  fileType: 'jsx' | 'tsx' | 'js' | 'css' | 'scss';
  content: string;
  violations: WCAGViolation[];
  statistics: {
    totalViolations: number;
    errors: number;
    warnings: number;
    info: number;
    estimatedFixTime: string;
  };
  metadata: {
    lineCount: number;
    componentCount?: number;
    analyzedAt: string;
  };
}

export interface ScanResult {
  files: FileAnalysis[];
  summary: {
    totalFiles: number;
    totalViolations: number;
    filesWithViolations: number;
    complianceScore: number;
    estimatedTotalFixTime: string;
    topCategories: {
      category: string;
      count: number;
    }[];
  };
  suggestions: string[];
}

export interface LDSComponent {
  name: string;
  description: string;
  props: ComponentProp[];
  accessibilityRequirements: AccessibilityRequirement[];
  storyUrl?: string;
  codeExample?: string;
  lastUpdated: string;
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  description: string;
  accessibilityNotes?: string;
}

export interface AccessibilityRequirement {
  criterion: string;
  level: 'A' | 'AA' | 'AAA';
  description: string;
  required: boolean;
  testable: boolean;
}

export interface LDSValidationResult {
  component: string;
  valid: boolean;
  issues: string[];
  suggestions: string[];
  alternatives: string[];
}

export interface ConfigFile {
  $schema?: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  wcagVersion: string;
  strictMode: boolean;
  ldsEnforcement: {
    enabled: boolean;
    storybookUrl?: string;
    requireApprovedComponents: boolean;
    allowedExceptions: string[];
    cacheComponents: boolean;
    cacheTTL: number;
  };
  rules: {
    [ruleId: string]: {
      enabled: boolean;
      severity: 'error' | 'warning' | 'info';
      [key: string]: any;
    };
  };
  excludedRules: string[];
  failureThresholds: {
    error: number;
    warning: number;
  };
  ignore: string[];
}

export interface RuleContext {
  node: any;
  parent?: any;
  ancestors: any[];
  fileType: 'jsx' | 'tsx' | 'js' | 'css' | 'scss';
  config: ConfigFile;
}

export interface RuleResult {
  violations: WCAGViolation[];
  passes?: any[];
  incomplete?: any[];
}

export interface ParserResult {
  ast: any;
  hasErrors: boolean;
  errors: string[];
  tokens?: any[];
}

export interface AccessibilityRule {
  id: string;
  name: string;
  description: string;
  wcagCriteria: string[];
  severity: 'error' | 'warning' | 'info';
  appliesTo: ('jsx' | 'tsx' | 'js' | 'css' | 'scss')[];
  check(context: RuleContext): RuleResult;
}

export interface ViolationFilter {
  severity?: ('error' | 'warning' | 'info')[];
  wcagCriteria?: string[];
  rules?: string[];
  files?: string[];
}

export interface ReportOptions {
  format: 'json' | 'html' | 'markdown';
  includeFixes: boolean;
  groupBy: 'severity' | 'category' | 'file';
  filter?: ViolationFilter;
}

export interface GitHubCheckRunOptions {
  summary: string;
  conclusion: 'success' | 'failure' | 'neutral';
  annotations: Array<{
    path: string;
    start_line: number;
    end_line: number;
    start_column?: number;
    end_column?: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
  check_suite_id?: string;
}

export type ToolInputSchema = {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
};