/**
 * Lilly Design System (LDS) Integration
 * Fetches component specifications and validates usage
 */

import { LDSComponent, LDSValidationResult } from '../types/index.js';

export class LDSIntegration {
  private storybookUrl: string;
  private componentCache: Map<string, LDSComponent> = new Map();
  private cacheTTL: number;
  private lastCacheUpdate: number = 0;

  constructor(storybookUrl: string, cacheTTL: number = 3600) {
    this.storybookUrl = storybookUrl;
    this.cacheTTL = cacheTTL;
  }

  async getComponentSpecs(componentName: string): Promise<LDSComponent | null> {
    // Check cache first
    if (this.isCacheValid() && this.componentCache.has(componentName)) {
      return this.componentCache.get(componentName)!;
    }

    try {
      // In a real implementation, this would fetch from the LDS Storybook API
      // For now, return mock data based on the requirements
      const component = await this.fetchComponentFromStorybook(componentName);
      
      if (component) {
        this.componentCache.set(componentName, component);
        this.lastCacheUpdate = Date.now();
      }

      return component;
    } catch (error) {
      console.warn(`Failed to fetch LDS component specs for "${componentName}":`, error);
      return this.getMockComponent(componentName);
    }
  }

  async validateComponentUsage(
    componentName: string,
    props: Record<string, any>
  ): Promise<LDSValidationResult> {
    const specs = await this.getComponentSpecs(componentName);
    
    if (!specs) {
      return {
        component: componentName,
        valid: false,
        issues: [`Component "${componentName}" not found in LDS`],
        suggestions: ['Check component spelling or verify LDS availability'],
        alternatives: []
      };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];
    const alternatives: string[] = [];

    // Validate required props
    specs.props.forEach(prop => {
      if (prop.required && !(prop.name in props)) {
        issues.push(`Missing required prop "${prop.name}"`);
        suggestions.push(`Add required prop "${prop.name}" with type ${prop.type}`);
      }
    });

    // Validate prop types (basic check)
    Object.entries(props).forEach(([propName, propValue]) => {
      const specProp = specs.props.find(p => p.name === propName);
      if (specProp && specProp.type) {
        // Basic type validation
        const expectedType = specProp.type.toLowerCase();
        const actualType = typeof propValue;
        
        if (expectedType === 'string' && actualType !== 'string') {
          issues.push(`Prop "${propName}" should be string, got ${actualType}`);
        } else if (expectedType === 'boolean' && actualType !== 'boolean') {
          issues.push(`Prop "${propName}" should be boolean, got ${actualType}`);
        } else if (expectedType === 'number' && actualType !== 'number') {
          issues.push(`Prop "${propName}" should be number, got ${actualType}`);
        }
      }
    });

    // Check accessibility requirements
    const a11yIssues = this.validateAccessibilityRequirements(specs, props);
    issues.push(...a11yIssues.issues);
    suggestions.push(...a11yIssues.suggestions);

    return {
      component: componentName,
      valid: issues.length === 0,
      issues,
      suggestions,
      alternatives
    };
  }

  private async fetchComponentFromStorybook(componentName: string): Promise<LDSComponent | null> {
    // In a real implementation, this would make HTTP requests to the LDS Storybook
    // This is a mock implementation that simulates the API response
    
    const mockComponents = this.getMockComponents();
    return mockComponents[componentName] || null;
  }

  private isCacheValid(): boolean {
    return (Date.now() - this.lastCacheUpdate) < this.cacheTTL;
  }

  private getMockComponent(componentName: string): LDSComponent {
    // Return a mock component based on common LDS patterns
    const commonComponent = {
      name: componentName,
      description: `LDS ${componentName} component`,
      props: [
        {
          name: 'children',
          type: 'ReactNode',
          required: false,
          description: 'Component children content',
          accessibilityNotes: 'Ensure content is accessible to screen readers'
        },
        {
          name: 'className',
          type: 'string',
          required: false,
          description: 'Additional CSS classes'
        },
        {
          name: 'aria-label',
          type: 'string',
          required: false,
          description: 'Accessible label for the component',
          accessibilityNotes: 'Required if component does not have visible text'
        },
        {
          name: 'aria-describedby',
          type: 'string',
          required: false,
          description: 'ID of element that describes this component',
          accessibilityNotes: 'Should reference element with additional context'
        }
      ],
      accessibilityRequirements: [
        {
          criterion: '1.3.1',
          level: 'A',
          description: 'Component must be keyboard accessible',
          required: true,
          testable: true
        },
        {
          criterion: '2.1.1',
          level: 'A',
          description: 'Component must respond to keyboard input',
          required: true,
          testable: true
        },
        {
          criterion: '4.1.2',
          level: 'A',
          description: 'Component must have proper name, role, value',
          required: true,
          testable: true
        }
      ],
      storyUrl: `${this.storybookUrl}/?path=/docs/${componentName.toLowerCase()}`,
      lastUpdated: new Date().toISOString()
    };

    // Customize for specific component types
    if (componentName.toLowerCase().includes('button')) {
      commonComponent.props.push({
        name: 'onClick',
        type: 'function',
        required: false,
        description: 'Click event handler',
        accessibilityNotes: 'Must be keyboard accessible (Enter/Space keys)'
      });
    }

    if (componentName.toLowerCase().includes('input')) {
      commonComponent.props.push(
        {
          name: 'value',
          type: 'string',
          required: false,
          description: 'Input value',
          accessibilityNotes: 'Should be controlled or uncontrolled properly'
        },
        {
          name: 'onChange',
          type: 'function',
          required: false,
          description: 'Change event handler',
          accessibilityNotes: 'Should update associated label properly'
        }
      );
    }

    return commonComponent;
  }

  private getMockComponents(): Record<string, LDSComponent> {
    const commonProps = [
      {
        name: 'children',
        type: 'ReactNode',
        required: false,
        description: 'Component children content'
      },
      {
        name: 'className',
        type: 'string',
        required: false,
        description: 'Additional CSS classes'
      }
    ];

    return {
      'Button': {
        name: 'Button',
        description: 'LDS Button component for actions',
        props: [
          ...commonProps,
          {
            name: 'variant',
            type: '"primary" | "secondary" | "tertiary"',
            required: false,
            description: 'Button visual variant'
          },
          {
            name: 'size',
            type: '"sm" | "md" | "lg"',
            required: false,
            description: 'Button size variant'
          },
          {
            name: 'onClick',
            type: 'function',
            required: false,
            description: 'Click event handler'
          },
          {
            name: 'disabled',
            type: 'boolean',
            required: false,
            description: 'Whether the button is disabled'
          },
          {
            name: 'aria-label',
            type: 'string',
            required: false,
            description: 'Accessible label for the button'
          }
        ],
        accessibilityRequirements: [
          {
            criterion: '2.1.1',
            level: 'A',
            description: 'Must respond to keyboard events',
            required: true,
            testable: true
          },
          {
            criterion: '1.3.1',
            level: 'A',
            description: 'Must have semantic role',
            required: true,
            testable: true
          }
        ],
        storyUrl: `${this.storybookUrl}/?path=/docs/button`,
        lastUpdated: '2024-01-15T10:00:00Z'
      },

      'Input': {
        name: 'Input',
        description: 'LDS Input component for text entry',
        props: [
          ...commonProps,
          {
            name: 'value',
            type: 'string',
            required: false,
            description: 'Input value'
          },
          {
            name: 'onChange',
            type: 'function',
            required: false,
            description: 'Change event handler'
          },
          {
            name: 'placeholder',
            type: 'string',
            required: false,
            description: 'Placeholder text'
          },
          {
            name: 'disabled',
            type: 'boolean',
            required: false,
            description: 'Whether the input is disabled'
          },
          {
            name: 'aria-label',
            type: 'string',
            required: false,
            description: 'Accessible label for the input'
          },
          {
            name: 'aria-describedby',
            type: 'string',
            required: false,
            description: 'ID of element that describes this input'
          },
          {
            name: 'aria-invalid',
            type: 'boolean',
            required: false,
            description: 'Indicates if input has validation errors'
          }
        ],
        accessibilityRequirements: [
          {
            criterion: '1.3.1',
            level: 'A',
            description: 'Must have associated label',
            required: true,
            testable: true
          },
          {
            criterion: '3.3.2',
            level: 'A',
            description: 'Must provide error identification',
            required: false,
            testable: true
          }
        ],
        storyUrl: `${this.storybookUrl}/?path=/docs/input`,
        lastUpdated: '2024-01-15T10:00:00Z'
      },

      'Modal': {
        name: 'Modal',
        description: 'LDS Modal component for dialogs',
        props: [
          ...commonProps,
          {
            name: 'isOpen',
            type: 'boolean',
            required: true,
            description: 'Whether the modal is open'
          },
          {
            name: 'onClose',
            type: 'function',
            required: true,
            description: 'Function to close the modal'
          },
          {
            name: 'title',
            type: 'string',
            required: true,
            description: 'Modal title for accessibility'
          },
          {
            name: 'aria-describedby',
            type: 'string',
            required: false,
            description: 'ID of element describing modal content'
          }
        ],
        accessibilityRequirements: [
          {
            criterion: '2.4.3',
            level: 'A',
            description: 'Must have focus management',
            required: true,
            testable: true
          },
          {
            criterion: '1.3.1',
            level: 'A',
            description: 'Must trap focus within modal',
            required: true,
            testable: true
          },
          {
            criterion: '2.1.2',
            level: 'A',
            description: 'Must allow keyboard escape',
            required: true,
            testable: true
          }
        ],
        storyUrl: `${this.storybookUrl}/?path=/docs/modal`,
        lastUpdated: '2024-01-15T10:00:00Z'
      },

      'Select': {
        name: 'Select',
        description: 'LDS Select component for dropdowns',
        props: [
          ...commonProps,
          {
            name: 'value',
            type: 'string',
            required: false,
            description: 'Selected value'
          },
          {
            name: 'onChange',
            type: 'function',
            required: false,
            description: 'Change event handler'
          },
          {
            name: 'options',
            type: 'Array<{value: string, label: string}>',
            required: true,
            description: 'Available options'
          },
          {
            name: 'aria-label',
            type: 'string',
            required: false,
            description: 'Accessible label for the select'
          },
          {
            name: 'disabled',
            type: 'boolean',
            required: false,
            description: 'Whether the select is disabled'
          }
        ],
        accessibilityRequirements: [
          {
            criterion: '1.3.1',
            level: 'A',
            description: 'Must have proper role',
            required: true,
            testable: true
          },
          {
            criterion: '2.1.1',
            level: 'A',
            description: 'Must be keyboard accessible',
            required: true,
            testable: true
          }
        ],
        storyUrl: `${this.storybookUrl}/?path=/docs/select`,
        lastUpdated: '2024-01-15T10:00:00Z'
      }
    };
  }

  private validateAccessibilityRequirements(
    component: LDSComponent,
    props: Record<string, any>
  ): { issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    component.accessibilityRequirements.forEach(req => {
      if (!req.testable) return;

      switch (req.criterion) {
        case '1.3.1':
          // Semantic and programmatic identification
          if (component.name === 'Modal' && (!props.title && !props['aria-label'])) {
            issues.push('Modal missing title or aria-label');
            suggestions.push('Add title prop or aria-label for screen reader users');
          }
          break;

        case '2.1.1':
          // Keyboard accessibility
          if (component.name === 'Modal' && !props.onClose) {
            issues.push('Modal missing close handler');
            suggestions.push('Add onClose prop for keyboard escape');
          }
          break;

        case '4.1.2':
          // Name, Role, Value
          if (props['aria-label'] && props['aria-label'].trim() === '') {
            issues.push('Empty aria-label not recommended');
            suggestions.push('Provide meaningful aria-label or remove attribute');
          }
          break;
      }
    });

    return { issues, suggestions };
  }

  clearCache(): void {
    this.componentCache.clear();
    this.lastCacheUpdate = 0;
  }

  getCacheStatus(): {
    size: number;
    isValid: boolean;
    lastUpdate: number;
  } {
    return {
      size: this.componentCache.size,
      isValid: this.isCacheValid(),
      lastUpdate: this.lastCacheUpdate
    };
  }
}