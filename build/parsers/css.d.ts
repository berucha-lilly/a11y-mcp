/**
 * CSS/SCSS parser using PostCSS
 */
import postcss from 'postcss';
import { BaseParser } from './base.js';
import { ParserResult } from '../types/index.js';
export declare class CSSParser extends BaseParser {
    private ast;
    private errors;
    parse(): ParserResult;
    private parseWithPostCSS;
    private getFileType;
    /**
     * Find all CSS rules
     */
    getAllRules(): postcss.Rule[];
    /**
     * Find CSS rules by selector
     */
    getRulesBySelector(selector: string): postcss.Rule[];
    /**
     * Find rules that contain specific selectors
     */
    getRulesContaining(selectorPattern: RegExp): postcss.Rule[];
    /**
     * Find all CSS declarations (properties and values)
     */
    getAllDeclarations(): postcss.Declaration[];
    /**
     * Find declarations by property name
     */
    getDeclarationsByProperty(property: string): postcss.Declaration[];
    /**
     * Check if focus styles are defined
     */
    hasFocusStyles(): {
        hasFocus: boolean;
        hasFocusVisible: boolean;
        hasFocusWithin: boolean;
    };
    /**
     * Find color-related declarations
     */
    getColorDeclarations(): {
        color: postcss.Declaration[];
        backgroundColor: postcss.Declaration[];
        borderColor: postcss.Declaration[];
    };
    /**
     * Get all media queries
     */
    getMediaQueries(): postcss.AtRule[];
    /**
     * Check if prefers-reduced-motion is respected
     */
    checkPrefersReducedMotion(): {
        hasPrefersReducedMotion: boolean;
        hasAnimationOrTransition: boolean;
        mediaQueries: string[];
    };
    /**
     * Extract CSS code snippet for a node
     */
    getNodeCSSCode(node: any): string;
}
