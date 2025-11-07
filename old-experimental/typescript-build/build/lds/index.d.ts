/**
 * Lilly Design System (LDS) Integration
 * Fetches component specifications and validates usage
 */
import { LDSComponent, LDSValidationResult } from '../types/index.js';
export declare class LDSIntegration {
    private storybookUrl;
    private componentCache;
    private cacheTTL;
    private lastCacheUpdate;
    constructor(storybookUrl: string, cacheTTL?: number);
    getComponentSpecs(componentName: string): Promise<LDSComponent | null>;
    validateComponentUsage(componentName: string, props: Record<string, any>): Promise<LDSValidationResult>;
    private fetchComponentFromStorybook;
    private isCacheValid;
    private getMockComponent;
    private getMockComponents;
    private validateAccessibilityRequirements;
    clearCache(): void;
    getCacheStatus(): {
        size: number;
        isValid: boolean;
        lastUpdate: number;
    };
}
