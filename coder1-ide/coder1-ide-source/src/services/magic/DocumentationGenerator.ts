/**
 * Documentation Generator Service
 * Automatically generates comprehensive documentation for React components
 */

interface PropDocumentation {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
  examples?: string[];
}

interface MethodDocumentation {
  name: string;
  parameters: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  returnType: string;
  description: string;
  examples?: string[];
}

interface ComponentDocumentation {
  name: string;
  description: string;
  category?: string;
  props: PropDocumentation[];
  methods: MethodDocumentation[];
  hooks?: string[];
  dependencies?: string[];
  examples: Array<{
    title: string;
    description?: string;
    code: string;
  }>;
  bestPractices?: string[];
  accessibility?: string[];
  performance?: string[];
  relatedComponents?: string[];
  changelog?: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;
}

export class DocumentationGenerator {
  /**
   * Generate complete documentation for a component
   */
  generateDocumentation(componentCode: string, options?: {
    includeExamples?: boolean;
    includeBestPractices?: boolean;
    includeAccessibility?: boolean;
    includePerformance?: boolean;
  }): ComponentDocumentation {
    const componentName = this.extractComponentName(componentCode);
    const props = this.extractPropsDocumentation(componentCode);
    const methods = this.extractMethodsDocumentation(componentCode);
    const hooks = this.extractHooks(componentCode);
    const dependencies = this.extractDependencies(componentCode);
    
    const doc: ComponentDocumentation = {
      name: componentName,
      description: this.generateDescription(componentName, props, methods),
      category: this.inferCategory(componentName, componentCode),
      props,
      methods,
      hooks,
      dependencies,
      examples: options?.includeExamples !== false ? 
        this.generateExamples(componentName, props) : []
    };

    if (options?.includeBestPractices !== false) {
      doc.bestPractices = this.generateBestPractices(componentName, props, methods);
    }

    if (options?.includeAccessibility !== false) {
      doc.accessibility = this.generateAccessibilityGuidelines(componentCode);
    }

    if (options?.includePerformance !== false) {
      doc.performance = this.generatePerformanceGuidelines(componentCode);
    }

    doc.relatedComponents = this.findRelatedComponents(componentName, componentCode);

    return doc;
  }

  /**
   * Generate Markdown documentation
   */
  generateMarkdown(doc: ComponentDocumentation): string {
    let markdown = `# ${doc.name}\n\n`;
    markdown += `${doc.description}\n\n`;

    if (doc.category) {
      markdown += `**Category:** ${doc.category}\n\n`;
    }

    // Table of Contents
    markdown += `## Table of Contents\n\n`;
    markdown += `- [Props](#props)\n`;
    if (doc.methods.length > 0) markdown += `- [Methods](#methods)\n`;
    if (doc.examples.length > 0) markdown += `- [Examples](#examples)\n`;
    if (doc.bestPractices) markdown += `- [Best Practices](#best-practices)\n`;
    if (doc.accessibility) markdown += `- [Accessibility](#accessibility)\n`;
    if (doc.performance) markdown += `- [Performance](#performance)\n`;
    if (doc.relatedComponents) markdown += `- [Related Components](#related-components)\n`;
    markdown += `\n`;

    // Props Section
    markdown += `## Props\n\n`;
    if (doc.props.length > 0) {
      markdown += `| Prop | Type | Required | Default | Description |\n`;
      markdown += `|------|------|----------|---------|-------------|\n`;
      doc.props.forEach(prop => {
        markdown += `| \`${prop.name}\` | \`${prop.type}\` | ${prop.required ? 'Yes' : 'No'} | ${prop.defaultValue ? `\`${prop.defaultValue}\`` : '-'} | ${prop.description} |\n`;
      });
      markdown += `\n`;

      // Detailed prop documentation
      doc.props.forEach(prop => {
        if (prop.examples && prop.examples.length > 0) {
          markdown += `### ${prop.name}\n\n`;
          markdown += `${prop.description}\n\n`;
          markdown += `**Type:** \`${prop.type}\`\n\n`;
          if (prop.defaultValue) {
            markdown += `**Default:** \`${prop.defaultValue}\`\n\n`;
          }
          markdown += `**Examples:**\n\n`;
          prop.examples.forEach(example => {
            markdown += `\`\`\`jsx\n${example}\n\`\`\`\n\n`;
          });
        }
      });
    } else {
      markdown += `This component has no props.\n\n`;
    }

    // Methods Section
    if (doc.methods.length > 0) {
      markdown += `## Methods\n\n`;
      doc.methods.forEach(method => {
        markdown += `### ${method.name}\n\n`;
        markdown += `${method.description}\n\n`;
        
        if (method.parameters.length > 0) {
          markdown += `**Parameters:**\n\n`;
          method.parameters.forEach(param => {
            markdown += `- \`${param.name}\` (${param.type})${param.description ? `: ${param.description}` : ''}\n`;
          });
          markdown += `\n`;
        }
        
        markdown += `**Returns:** \`${method.returnType}\`\n\n`;
        
        if (method.examples && method.examples.length > 0) {
          markdown += `**Examples:**\n\n`;
          method.examples.forEach(example => {
            markdown += `\`\`\`javascript\n${example}\n\`\`\`\n\n`;
          });
        }
      });
    }

    // Examples Section
    if (doc.examples.length > 0) {
      markdown += `## Examples\n\n`;
      doc.examples.forEach(example => {
        markdown += `### ${example.title}\n\n`;
        if (example.description) {
          markdown += `${example.description}\n\n`;
        }
        markdown += `\`\`\`jsx\n${example.code}\n\`\`\`\n\n`;
      });
    }

    // Best Practices
    if (doc.bestPractices && doc.bestPractices.length > 0) {
      markdown += `## Best Practices\n\n`;
      doc.bestPractices.forEach(practice => {
        markdown += `- ${practice}\n`;
      });
      markdown += `\n`;
    }

    // Accessibility
    if (doc.accessibility && doc.accessibility.length > 0) {
      markdown += `## Accessibility\n\n`;
      doc.accessibility.forEach(guideline => {
        markdown += `- ${guideline}\n`;
      });
      markdown += `\n`;
    }

    // Performance
    if (doc.performance && doc.performance.length > 0) {
      markdown += `## Performance\n\n`;
      doc.performance.forEach(guideline => {
        markdown += `- ${guideline}\n`;
      });
      markdown += `\n`;
    }

    // Related Components
    if (doc.relatedComponents && doc.relatedComponents.length > 0) {
      markdown += `## Related Components\n\n`;
      doc.relatedComponents.forEach(component => {
        markdown += `- [${component}](#${component.toLowerCase()})\n`;
      });
      markdown += `\n`;
    }

    // Footer
    markdown += `---\n\n`;
    markdown += `*Documentation generated on ${new Date().toLocaleDateString()}*\n`;

    return markdown;
  }

  /**
   * Generate JSDoc comments for component
   */
  generateJSDoc(doc: ComponentDocumentation): string {
    let jsdoc = `/**\n`;
    jsdoc += ` * ${doc.description}\n`;
    jsdoc += ` * \n`;
    
    if (doc.category) {
      jsdoc += ` * @category ${doc.category}\n`;
    }
    
    jsdoc += ` * @component\n`;
    
    // Document props
    doc.props.forEach(prop => {
      jsdoc += ` * @param {${prop.type}} ${prop.required ? '' : '['}props.${prop.name}${prop.required ? '' : ']'} - ${prop.description}`;
      if (prop.defaultValue) {
        jsdoc += ` (default: ${prop.defaultValue})`;
      }
      jsdoc += `\n`;
    });
    
    // Add examples
    if (doc.examples.length > 0) {
      jsdoc += ` * \n`;
      jsdoc += ` * @example\n`;
      const example = doc.examples[0];
      example.code.split('\n').forEach(line => {
        jsdoc += ` * ${line}\n`;
      });
    }
    
    jsdoc += ` */`;
    
    return jsdoc;
  }

  /**
   * Generate Storybook stories
   */
  generateStorybookStories(doc: ComponentDocumentation): string {
    let stories = `import type { Meta, StoryObj } from '@storybook/react';\n`;
    stories += `import ${doc.name} from './${doc.name}';\n\n`;
    
    stories += `const meta: Meta<typeof ${doc.name}> = {\n`;
    stories += `  title: '${doc.category || 'Components'}/${doc.name}',\n`;
    stories += `  component: ${doc.name},\n`;
    stories += `  parameters: {\n`;
    stories += `    layout: 'centered',\n`;
    stories += `    docs: {\n`;
    stories += `      description: {\n`;
    stories += `        component: '${doc.description}',\n`;
    stories += `      },\n`;
    stories += `    },\n`;
    stories += `  },\n`;
    stories += `  tags: ['autodocs'],\n`;
    
    // Add argTypes for props
    if (doc.props.length > 0) {
      stories += `  argTypes: {\n`;
      doc.props.forEach(prop => {
        stories += `    ${prop.name}: {\n`;
        stories += `      description: '${prop.description}',\n`;
        stories += `      control: { type: '${this.getStorybookControlType(prop.type)}' },\n`;
        if (prop.defaultValue) {
          stories += `      defaultValue: ${prop.defaultValue},\n`;
        }
        stories += `    },\n`;
      });
      stories += `  },\n`;
    }
    
    stories += `};\n\n`;
    stories += `export default meta;\n`;
    stories += `type Story = StoryObj<typeof meta>;\n\n`;
    
    // Generate stories for different states
    stories += `export const Default: Story = {\n`;
    stories += `  args: {\n`;
    doc.props.forEach(prop => {
      if (prop.defaultValue) {
        stories += `    ${prop.name}: ${prop.defaultValue},\n`;
      }
    });
    stories += `  },\n`;
    stories += `};\n\n`;
    
    // Generate additional stories from examples
    doc.examples.forEach((example, index) => {
      const storyName = example.title.replace(/\s+/g, '');
      stories += `export const ${storyName}: Story = {\n`;
      stories += `  args: {\n`;
      // Extract props from example code
      const propsFromExample = this.extractPropsFromExample(example.code);
      Object.entries(propsFromExample).forEach(([key, value]) => {
        stories += `    ${key}: ${JSON.stringify(value)},\n`;
      });
      stories += `  },\n`;
      stories += `};\n\n`;
    });
    
    return stories;
  }

  /**
   * Extract component name from code
   */
  private extractComponentName(code: string): string {
    const patterns = [
      /(?:const|let|var)\s+(\w+)\s*=/,
      /function\s+(\w+)/,
      /class\s+(\w+)/,
      /export\s+default\s+(?:function|class)?\s*(\w+)/
    ];
    
    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return 'Component';
  }

  /**
   * Extract props documentation from code
   */
  private extractPropsDocumentation(code: string): PropDocumentation[] {
    const props: PropDocumentation[] = [];
    
    // Look for TypeScript interface or type
    const interfaceMatch = code.match(/interface\s+\w+Props\s*{([^}]*)}/);
    const typeMatch = code.match(/type\s+\w+Props\s*=\s*{([^}]*)}/);
    
    const propsContent = interfaceMatch?.[1] || typeMatch?.[1];
    
    if (propsContent) {
      const propLines = propsContent.split(/[;,]\s*/);
      
      propLines.forEach(line => {
        const propMatch = line.match(/(\w+)(\?)?\s*:\s*([^;,]+)/);
        if (propMatch) {
          const [, name, optional, type] = propMatch;
          props.push({
            name,
            type: type.trim(),
            required: !optional,
            description: this.generatePropDescription(name, type),
            examples: this.generatePropExamples(name, type)
          });
        }
      });
    } else {
      // Fallback: extract from function parameters
      const paramMatch = code.match(/\({\s*([^}]+)\s*}\)/);
      if (paramMatch) {
        const params = paramMatch[1].split(',');
        params.forEach(param => {
          const [name, defaultValue] = param.trim().split('=').map(s => s.trim());
          if (name) {
            props.push({
              name,
              type: 'any',
              required: !defaultValue,
              defaultValue,
              description: this.generatePropDescription(name, 'any')
            });
          }
        });
      }
    }
    
    return props;
  }

  /**
   * Extract methods documentation from code
   */
  private extractMethodsDocumentation(code: string): MethodDocumentation[] {
    const methods: MethodDocumentation[] = [];
    
    // Find function declarations within component
    const functionPattern = /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g;
    let match;
    
    while ((match = functionPattern.exec(code)) !== null) {
      const [, name, params] = match;
      
      // Skip React hooks
      if (name.startsWith('use')) continue;
      
      const parameters = params ? params.split(',').map(p => {
        const paramName = p.trim().split(':')[0].trim();
        return {
          name: paramName,
          type: 'any',
          description: `Parameter ${paramName}`
        };
      }) : [];
      
      methods.push({
        name,
        parameters,
        returnType: 'void',
        description: this.generateMethodDescription(name)
      });
    }
    
    return methods;
  }

  /**
   * Extract hooks from component code
   */
  private extractHooks(code: string): string[] {
    const hooks: string[] = [];
    const hookPattern = /use[A-Z]\w*/g;
    const matches = code.match(hookPattern);
    
    if (matches) {
      return Array.from(new Set(matches));
    }
    
    return hooks;
  }

  /**
   * Extract dependencies from component code
   */
  private extractDependencies(code: string): string[] {
    const dependencies: string[] = [];
    const importPattern = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importPattern.exec(code)) !== null) {
      const [, dep] = match;
      if (!dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.push(dep);
      }
    }
    
    return dependencies;
  }

  /**
   * Generate component description
   */
  private generateDescription(name: string, props: PropDocumentation[], methods: MethodDocumentation[]): string {
    let description = `${name} is a React component`;
    
    if (props.length > 0) {
      description += ` that accepts ${props.length} prop${props.length > 1 ? 's' : ''}`;
    }
    
    if (methods.length > 0) {
      description += ` and provides ${methods.length} method${methods.length > 1 ? 's' : ''}`;
    }
    
    description += '.';
    
    // Add more context based on component name
    const nameLower = name.toLowerCase();
    if (nameLower.includes('button')) {
      description += ' It renders an interactive button element.';
    } else if (nameLower.includes('form')) {
      description += ' It handles form inputs and submission.';
    } else if (nameLower.includes('modal')) {
      description += ' It displays content in a modal overlay.';
    } else if (nameLower.includes('list')) {
      description += ' It renders a list of items.';
    }
    
    return description;
  }

  /**
   * Infer component category
   */
  private inferCategory(name: string, code: string): string {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('button') || nameLower.includes('link')) {
      return 'Actions';
    } else if (nameLower.includes('form') || nameLower.includes('input')) {
      return 'Forms';
    } else if (nameLower.includes('modal') || nameLower.includes('dialog')) {
      return 'Overlays';
    } else if (nameLower.includes('nav') || nameLower.includes('menu')) {
      return 'Navigation';
    } else if (nameLower.includes('card') || nameLower.includes('list')) {
      return 'Data Display';
    } else if (nameLower.includes('layout') || nameLower.includes('grid')) {
      return 'Layout';
    }
    
    return 'Components';
  }

  /**
   * Generate prop description
   */
  private generatePropDescription(name: string, type: string): string {
    const descriptions: Record<string, string> = {
      className: 'Additional CSS class names to apply',
      style: 'Inline styles to apply to the component',
      children: 'Child elements to render inside the component',
      onClick: 'Handler function called when the component is clicked',
      onChange: 'Handler function called when the value changes',
      disabled: 'Whether the component is disabled',
      value: 'The current value of the component',
      placeholder: 'Placeholder text to display',
      title: 'Title text to display',
      variant: 'Visual variant of the component',
      size: 'Size variant of the component',
      color: 'Color scheme of the component',
      loading: 'Whether the component is in a loading state',
      error: 'Error message to display',
      onSubmit: 'Handler function called on form submission'
    };
    
    return descriptions[name] || `The ${name} prop of type ${type}`;
  }

  /**
   * Generate prop examples
   */
  private generatePropExamples(name: string, type: string): string[] {
    const examples: string[] = [];
    
    if (type.includes('string')) {
      examples.push(`${name}="example"`);
      examples.push(`${name}="Another example"`);
    } else if (type.includes('number')) {
      examples.push(`${name}={42}`);
      examples.push(`${name}={100}`);
    } else if (type.includes('boolean')) {
      examples.push(`${name}`);
      examples.push(`${name}={false}`);
    } else if (type.includes('function')) {
      examples.push(`${name}={() => console.log('Clicked')}`);
      examples.push(`${name}={handleClick}`);
    }
    
    return examples;
  }

  /**
   * Generate method description
   */
  private generateMethodDescription(name: string): string {
    const descriptions: Record<string, string> = {
      handleClick: 'Handles click events on the component',
      handleSubmit: 'Handles form submission',
      handleChange: 'Handles value changes',
      validate: 'Validates the component state',
      reset: 'Resets the component to its initial state',
      toggle: 'Toggles the component state',
      open: 'Opens the component',
      close: 'Closes the component'
    };
    
    return descriptions[name] || `${name} method`;
  }

  /**
   * Generate examples
   */
  private generateExamples(name: string, props: PropDocumentation[]): ComponentDocumentation['examples'] {
    const examples: ComponentDocumentation['examples'] = [];
    
    // Basic example
    examples.push({
      title: 'Basic Usage',
      description: `Basic example of ${name} component`,
      code: `<${name} />`
    });
    
    // With props example
    if (props.length > 0) {
      const propsExample = props
        .slice(0, 3)
        .map(p => `  ${p.name}="${p.name}-value}"`)
        .join('\n');
      
      examples.push({
        title: 'With Props',
        description: 'Example with common props',
        code: `<${name}\n${propsExample}\n/>`
      });
    }
    
    // Advanced example
    examples.push({
      title: 'Advanced Usage',
      description: 'Advanced example with event handlers',
      code: `<${name}
  onClick={() => console.log('Clicked')}
  onHover={() => console.log('Hovered')}
>
  Content goes here
</${name}>`
    });
    
    return examples;
  }

  /**
   * Generate best practices
   */
  private generateBestPractices(name: string, props: PropDocumentation[], methods: MethodDocumentation[]): string[] {
    const practices: string[] = [];
    
    practices.push(`Always provide a unique key when rendering ${name} in a list`);
    practices.push(`Use memoization (React.memo) if ${name} renders frequently`);
    
    if (props.some(p => p.name === 'onClick' || p.name === 'onChange')) {
      practices.push('Use useCallback for event handlers to prevent unnecessary re-renders');
    }
    
    if (props.some(p => p.required)) {
      practices.push('Always provide required props to avoid runtime errors');
    }
    
    practices.push('Consider using TypeScript for better type safety');
    practices.push('Test the component with different prop combinations');
    
    return practices;
  }

  /**
   * Generate accessibility guidelines
   */
  private generateAccessibilityGuidelines(code: string): string[] {
    const guidelines: string[] = [];
    
    if (code.includes('button') || code.includes('Button')) {
      guidelines.push('Ensure all buttons have accessible labels');
      guidelines.push('Support keyboard navigation (Enter and Space keys)');
    }
    
    if (code.includes('input') || code.includes('Input')) {
      guidelines.push('Associate labels with form inputs');
      guidelines.push('Provide clear error messages');
    }
    
    guidelines.push('Include proper ARIA attributes when necessary');
    guidelines.push('Ensure sufficient color contrast (4.5:1 for normal text)');
    guidelines.push('Test with screen readers');
    guidelines.push('Support keyboard-only navigation');
    
    return guidelines;
  }

  /**
   * Generate performance guidelines
   */
  private generatePerformanceGuidelines(code: string): string[] {
    const guidelines: string[] = [];
    
    if (code.includes('map(')) {
      guidelines.push('Use unique and stable keys when rendering lists');
    }
    
    if (code.includes('useState') || code.includes('useEffect')) {
      guidelines.push('Optimize state updates to prevent unnecessary re-renders');
      guidelines.push('Clean up effects to prevent memory leaks');
    }
    
    guidelines.push('Consider lazy loading for heavy components');
    guidelines.push('Use React.memo for pure components');
    guidelines.push('Optimize images and assets');
    guidelines.push('Debounce or throttle expensive operations');
    
    return guidelines;
  }

  /**
   * Find related components
   */
  private findRelatedComponents(name: string, code: string): string[] {
    const related: string[] = [];
    
    // Extract imported components
    const importPattern = /import\s+(\w+)\s+from\s+['"]\.\//g;
    let match;
    
    while ((match = importPattern.exec(code)) !== null) {
      const [, componentName] = match;
      if (componentName !== name) {
        related.push(componentName);
      }
    }
    
    // Add commonly related components based on name
    const nameLower = name.toLowerCase();
    if (nameLower.includes('button')) {
      related.push('ButtonGroup', 'IconButton');
    } else if (nameLower.includes('input')) {
      related.push('Form', 'FormField', 'Label');
    }
    
    return Array.from(new Set(related));
  }

  /**
   * Get Storybook control type
   */
  private getStorybookControlType(type: string): string {
    if (type.includes('boolean')) return 'boolean';
    if (type.includes('number')) return 'number';
    if (type.includes('string')) return 'text';
    if (type.includes('function')) return 'action';
    if (type.includes('array')) return 'array';
    if (type.includes('object')) return 'object';
    return 'text';
  }

  /**
   * Extract props from example code
   */
  private extractPropsFromExample(code: string): Record<string, any> {
    const props: Record<string, any> = {};
    
    // Simple regex to extract prop="value" patterns
    const propPattern = /(\w+)=(?:{([^}]+)}|"([^"]+)")/g;
    let match;
    
    while ((match = propPattern.exec(code)) !== null) {
      const [, name, jsValue, stringValue] = match;
      props[name] = stringValue || jsValue;
    }
    
    return props;
  }
}

export default DocumentationGenerator;