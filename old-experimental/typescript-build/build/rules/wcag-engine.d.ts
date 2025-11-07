/**
 * WCAG 2.2 AA Rule Engine
 * Implements comprehensive accessibility rule checking
 */
import { AccessibilityRule, RuleResult } from '../types/index.js';
/**
 * Rule metadata interface for rule registration
 */
interface RuleMetadata {
    id: string;
    name: string;
    description: string;
    wcagCriteria: string[];
    severity: 'error' | 'warning' | 'info';
    appliesTo: ('jsx' | 'tsx' | 'js' | 'css' | 'scss')[];
}
export declare class WCAGRuleEngine {
    private rules;
    private ruleMetadata;
    constructor();
    private initializeRules;
    registerRule(rule: AccessibilityRule): void;
    getRule(id: string): AccessibilityRule | undefined;
    getAllRules(): AccessibilityRule[];
    getRuleMetadata(id: string): RuleMetadata | undefined;
    getAllRuleMetadata(): RuleMetadata[];
    getRulesForFileType(fileType: 'jsx' | 'tsx' | 'js' | 'css' | 'scss'): AccessibilityRule[];
    checkFile(parser: any, fileType: 'jsx' | 'tsx' | 'js' | 'css' | 'scss', config: any): Promise<RuleResult>;
    private createAriaRequiredRule;
    private createKeyboardNavRule;
    private createSemanticHtmlRule;
    private createAltTextRule;
    private createHeadingHierarchyRule;
    private createFormLabelsRule;
    private createSkipLinksRule;
    private createFocusVisibleRule;
    private createLDSComponentsRule;
}
export {};
