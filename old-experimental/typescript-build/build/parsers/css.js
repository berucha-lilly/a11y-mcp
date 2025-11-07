/**
 * CSS/SCSS parser using PostCSS
 */
import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import { BaseParser } from './base.js';
export class CSSParser extends BaseParser {
    ast = null;
    errors = [];
    parse() {
        return this.parseWithPostCSS();
    }
    parseWithPostCSS() {
        const fileType = this.getFileType();
        try {
            let result;
            if (fileType === 'scss') {
                // Parse SCSS with postcss-scss
                result = postcss().process(this.content, {
                    from: this.filePath,
                    parser: postcssScss,
                    syntax: postcssScss
                });
            }
            else {
                // Parse CSS
                result = postcss().process(this.content, {
                    from: this.filePath,
                    parser: postcss
                });
            }
            this.ast = result.root;
            // Collect any warnings as errors for our purposes
            result.warnings().forEach(warning => {
                this.errors.push({
                    message: warning.text,
                    line: warning.source && warning.source.start
                        ? warning.source.start.line
                        : 1,
                    column: warning.source && warning.source.start
                        ? warning.source.start.column
                        : 1,
                    code: this.extractCodeSnippet(warning.source?.start?.line || 1, warning.source?.end?.line || 1)
                });
            });
            return {
                ast: this.ast,
                hasErrors: this.errors.length > 0,
                errors: this.errors.map(e => e.message)
            };
        }
        catch (error) {
            this.errors.push({
                message: error.message,
                line: error.line || 1,
                column: error.column || 1,
                code: this.extractCodeSnippet(error.line || 1, error.line || 1)
            });
            return {
                ast: null,
                hasErrors: true,
                errors: this.errors.map(e => e.message)
            };
        }
    }
    getFileType() {
        const ext = this.filePath.toLowerCase().split('.').pop();
        return ext === 'scss' ? 'scss' : 'css';
    }
    /**
     * Find all CSS rules
     */
    getAllRules() {
        if (!this.ast) {
            return [];
        }
        return this.ast.find(postcss.rule);
    }
    /**
     * Find CSS rules by selector
     */
    getRulesBySelector(selector) {
        return this.getAllRules().filter(rule => {
            return rule.selector === selector;
        });
    }
    /**
     * Find rules that contain specific selectors
     */
    getRulesContaining(selectorPattern) {
        return this.getAllRules().filter(rule => {
            return selectorPattern.test(rule.selector);
        });
    }
    /**
     * Find all CSS declarations (properties and values)
     */
    getAllDeclarations() {
        if (!this.ast) {
            return [];
        }
        const declarations = [];
        this.ast.walkDecls(decl => {
            declarations.push(decl);
        });
        return declarations;
    }
    /**
     * Find declarations by property name
     */
    getDeclarationsByProperty(property) {
        return this.getAllDeclarations().filter(decl => {
            return decl.prop === property;
        });
    }
    /**
     * Check if focus styles are defined
     */
    hasFocusStyles() {
        const rules = this.getAllRules();
        let hasFocus = false;
        let hasFocusVisible = false;
        let hasFocusWithin = false;
        rules.forEach(rule => {
            const selector = rule.selector.toLowerCase();
            if (selector.includes(':focus')) {
                hasFocus = true;
            }
            if (selector.includes(':focus-visible')) {
                hasFocusVisible = true;
            }
            if (selector.includes(':focus-within')) {
                hasFocusWithin = true;
            }
        });
        return { hasFocus, hasFocusVisible, hasFocusWithin };
    }
    /**
     * Find color-related declarations
     */
    getColorDeclarations() {
        const declarations = this.getAllDeclarations();
        return {
            color: declarations.filter(d => d.prop === 'color'),
            backgroundColor: declarations.filter(d => d.prop === 'background-color'),
            borderColor: declarations.filter(d => d.prop.startsWith('border'))
        };
    }
    /**
     * Get all media queries
     */
    getMediaQueries() {
        if (!this.ast) {
            return [];
        }
        return this.ast.find(postcss.atRule);
    }
    /**
     * Check if prefers-reduced-motion is respected
     */
    checkPrefersReducedMotion() {
        const atRules = this.getMediaQueries();
        const declarations = this.getAllDeclarations();
        const hasPrefersReducedMotion = atRules.some(rule => rule.params.includes('prefers-reduced-motion'));
        const hasAnimationOrTransition = declarations.some(decl => decl.prop.includes('animation') ||
            decl.prop.includes('transition') ||
            decl.prop === 'animation' ||
            decl.prop === 'transition');
        const mediaQueries = atRules
            .filter(rule => rule.type === 'atrule')
            .map(rule => rule.params);
        return {
            hasPrefersReducedMotion,
            hasAnimationOrTransition,
            mediaQueries
        };
    }
    /**
     * Extract CSS code snippet for a node
     */
    getNodeCSSCode(node) {
        if (node.source && node.source.input && node.source.selector) {
            // For rules
            if (node.selector) {
                return `${node.selector} { ${node.nodes?.map((n) => n.toString()).join(' ') || ''} }`;
            }
        }
        return node.toString();
    }
}
