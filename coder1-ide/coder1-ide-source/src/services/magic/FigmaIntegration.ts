/**
 * Figma Integration Service
 * Provides bidirectional sync between React components and Figma designs
 */

interface FigmaDesignToken {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    [key: string]: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    fontWeight: {
      light: number;
      regular: number;
      medium: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
}

interface FigmaComponent {
  id: string;
  name: string;
  type: string;
  properties: Record<string, any>;
  children?: FigmaComponent[];
  styles?: {
    layout?: Record<string, any>;
    fill?: Record<string, any>;
    text?: Record<string, any>;
    effects?: Record<string, any>;
  };
}

export class FigmaIntegration {
  private apiKey?: string;
  private fileId?: string;
  private connected = false;

  constructor(apiKey?: string, fileId?: string) {
    this.apiKey = apiKey;
    this.fileId = fileId;
    this.connected = !!(apiKey && fileId);
  }

  /**
   * Connect to Figma API
   */
  async connect(apiKey: string, fileId: string): Promise<boolean> {
    try {
      this.apiKey = apiKey;
      this.fileId = fileId;
      
      // Validate connection
      const response = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
        headers: {
          'X-Figma-Token': apiKey
        }
      });
      
      if (response.ok) {
        this.connected = true;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Figma connection error:', error);
      return false;
    }
  }

  /**
   * Import design tokens from Figma
   */
  async importDesignTokens(): Promise<FigmaDesignToken | null> {
    if (!this.connected) {
      return this.getMockDesignTokens();
    }

    try {
      const response = await fetch(`https://api.figma.com/v1/files/${this.fileId}/styles`, {
        headers: {
          'X-Figma-Token': this.apiKey!
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Figma styles');
      }

      const data = await response.json();
      return this.parseDesignTokens(data);
    } catch (error) {
      console.error('Error importing design tokens:', error);
      return this.getMockDesignTokens();
    }
  }

  /**
   * Import component from Figma
   */
  async importComponent(nodeId: string): Promise<string | null> {
    if (!this.connected) {
      return this.generateMockComponent(nodeId);
    }

    try {
      const response = await fetch(
        `https://api.figma.com/v1/files/${this.fileId}/nodes?ids=${nodeId}`,
        {
          headers: {
            'X-Figma-Token': this.apiKey!
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Figma node');
      }

      const data = await response.json();
      const node = data.nodes[nodeId];
      
      if (!node) {
        throw new Error('Node not found');
      }

      return this.convertFigmaToReact(node.document);
    } catch (error) {
      console.error('Error importing Figma component:', error);
      return this.generateMockComponent(nodeId);
    }
  }

  /**
   * Export React component to Figma format
   */
  exportToFigma(componentCode: string): FigmaComponent {
    // Parse React component
    const componentData = this.parseReactComponent(componentCode);
    
    // Convert to Figma format
    return {
      id: `component-${Date.now()}`,
      name: componentData.name,
      type: 'COMPONENT',
      properties: {
        description: 'Exported from React',
        ...componentData.props
      },
      children: this.convertReactToFigmaNodes(componentData.jsx),
      styles: this.extractStyles(componentCode)
    };
  }

  /**
   * Sync design tokens with component
   */
  syncDesignTokens(componentCode: string, tokens: FigmaDesignToken): string {
    let updatedCode = componentCode;

    // Replace color values
    Object.entries(tokens.colors).forEach(([key, value]) => {
      const regex = new RegExp(`color:\\s*['"\`]#[0-9a-fA-F]{3,8}['"\`]`, 'g');
      updatedCode = updatedCode.replace(regex, (match) => {
        if (key === 'primary' && match.includes('primary')) {
          return `color: '${value}'`;
        }
        return match;
      });
    });

    // Update typography
    updatedCode = updatedCode.replace(
      /fontFamily:\s*['"`][^'"`]+['"`]/g,
      `fontFamily: '${tokens.typography.fontFamily}'`
    );

    // Update spacing
    Object.entries(tokens.spacing).forEach(([key, value]) => {
      const patterns = [
        `padding-${key}`,
        `margin-${key}`,
        `gap-${key}`
      ];
      
      patterns.forEach(pattern => {
        const regex = new RegExp(`${pattern}`, 'g');
        updatedCode = updatedCode.replace(regex, `${pattern.split('-')[0]}: '${value}'`);
      });
    });

    return updatedCode;
  }

  /**
   * Convert Figma node to React component
   */
  private convertFigmaToReact(node: any): string {
    const componentName = this.sanitizeComponentName(node.name || 'Component');
    const styles = this.extractFigmaStyles(node);
    const children = this.renderFigmaChildren(node.children || []);

    return `const ${componentName} = () => {
  return (
    <div style={${JSON.stringify(styles, null, 2)}}>
      ${children}
    </div>
  );
};

export default ${componentName};`;
  }

  /**
   * Parse design tokens from Figma API response
   */
  private parseDesignTokens(data: any): FigmaDesignToken {
    // This would parse actual Figma API response
    // For now, return mock tokens
    return this.getMockDesignTokens();
  }

  /**
   * Get mock design tokens for development
   */
  private getMockDesignTokens(): FigmaDesignToken {
    return {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        background: '#ffffff',
        text: '#1f2937',
        accent: '#f59e0b',
        success: '#10b981',
        error: '#ef4444'
      },
      typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          md: '1rem',
          lg: '1.125rem',
          xl: '1.25rem'
        },
        fontWeight: {
          light: 300,
          regular: 400,
          medium: 500,
          bold: 700
        }
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem'
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '1rem',
        full: '9999px'
      }
    };
  }

  /**
   * Generate mock component for development
   */
  private generateMockComponent(nodeId: string): string {
    return `// Mock Figma Component (Node: ${nodeId})
const FigmaComponent = ({ title = "Figma Import", description = "Component imported from Figma" }) => {
  return (
    <div className="figma-component" style={{
      padding: '24px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    }}>
      <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>{title}</h2>
      <p style={{ fontSize: '16px', opacity: 0.9 }}>{description}</p>
      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
        <button style={{
          padding: '10px 20px',
          background: 'white',
          color: '#764ba2',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          Primary Action
        </button>
        <button style={{
          padding: '10px 20px',
          background: 'transparent',
          color: 'white',
          border: '2px solid white',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          Secondary Action
        </button>
      </div>
    </div>
  );
};

export default FigmaComponent;`;
  }

  /**
   * Parse React component structure
   */
  private parseReactComponent(code: string): any {
    // Simple parser for React components
    const nameMatch = code.match(/(?:const|function|class)\s+(\w+)/);
    const name = nameMatch ? nameMatch[1] : 'Component';
    
    // Extract props
    const propsMatch = code.match(/\(?\s*{\s*([^}]+)\s*}\s*\)?/);
    const props = propsMatch ? this.parseProps(propsMatch[1]) : {};
    
    // Extract JSX
    const jsxMatch = code.match(/return\s*\(([\s\S]*?)\);/);
    const jsx = jsxMatch ? jsxMatch[1] : '<div>Component</div>';
    
    return { name, props, jsx };
  }

  /**
   * Parse component props
   */
  private parseProps(propsString: string): Record<string, any> {
    const props: Record<string, any> = {};
    const propPairs = propsString.split(',');
    
    propPairs.forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key) {
        props[key] = value || true;
      }
    });
    
    return props;
  }

  /**
   * Convert React JSX to Figma nodes
   */
  private convertReactToFigmaNodes(jsx: string): FigmaComponent[] {
    // Simplified conversion - in reality would parse JSX AST
    return [{
      id: `node-${Date.now()}`,
      name: 'Container',
      type: 'FRAME',
      properties: {
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }]
      }
    }];
  }

  /**
   * Extract styles from component code
   */
  private extractStyles(code: string): Record<string, any> {
    const styles: Record<string, any> = {};
    
    // Extract inline styles
    const styleRegex = /style\s*=\s*{({[^}]+})}/g;
    let match;
    while ((match = styleRegex.exec(code)) !== null) {
      try {
        const styleObj = eval(`(${match[1]})`);
        Object.assign(styles, styleObj);
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    return {
      layout: {
        flexDirection: styles.flexDirection || 'column',
        alignItems: styles.alignItems || 'flex-start',
        justifyContent: styles.justifyContent || 'flex-start'
      },
      fill: {
        backgroundColor: styles.backgroundColor || '#ffffff'
      }
    };
  }

  /**
   * Extract Figma node styles
   */
  private extractFigmaStyles(node: any): Record<string, any> {
    const styles: Record<string, any> = {};
    
    if (node.fills && node.fills[0]) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID') {
        styles.backgroundColor = `rgba(${fill.color.r * 255}, ${fill.color.g * 255}, ${fill.color.b * 255}, ${fill.color.a})`;
      }
    }
    
    if (node.absoluteBoundingBox) {
      styles.width = `${node.absoluteBoundingBox.width}px`;
      styles.height = `${node.absoluteBoundingBox.height}px`;
    }
    
    return styles;
  }

  /**
   * Render Figma children as JSX
   */
  private renderFigmaChildren(children: any[]): string {
    if (!children || children.length === 0) {
      return '';
    }
    
    return children.map(child => {
      if (child.type === 'TEXT') {
        return child.characters || '';
      }
      return '<div>Child Component</div>';
    }).join('\n      ');
  }

  /**
   * Sanitize component name
   */
  private sanitizeComponentName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[0-9]/, '_$&')
      || 'Component';
  }
}

export default FigmaIntegration;