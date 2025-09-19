interface ComponentTemplate {
  name: string;
  code: string;
  props: Record<string, any>;
  dependencies: string[];
}

interface ComponentBundle {
  id: string;
  name: string;
  code: string;
  props: Record<string, any>;
  dependencies: string[];
  generatedAt: number;
}

export class ComponentGenerator {
  // Natural language mapping for better component matching
  private componentMap: Record<string, string> = {
    'hero section': 'gradient-card',
    'hero': 'gradient-card',
    'cta button': 'glowing-button',
    'call to action': 'glowing-button',
    'submit button': 'gradient-button',
    'glass button': 'glass-button',
    'glowing button': 'glowing-button',
    'gradient button': 'gradient-button',
    'outline button': 'outline-button',
    'floating button': 'floating-button',
    'navigation': 'glass-card',
    'navbar': 'glass-card',
    'pricing card': 'gradient-card',
    'feature card': 'hover-card'
  };

  private templates: Record<string, ComponentTemplate> = {
    // React Bits Button Components with Tailwind
    'glowing-button': {
      name: 'GlowingButton',
      code: `
        const GlowingButton = ({ text = 'Click Me', onClick = () => alert('Button clicked!') }) => {
          return React.createElement('button', {
            onClick: onClick,
            className: 'px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all duration-300 shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60',
            style: {
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }
          }, text);
        };
      `,
      props: {
        text: 'Click Me'
      },
      dependencies: []
    },
    
    'gradient-button': {
      name: 'GradientButton',
      code: `
        const GradientButton = ({ text = 'Gradient Magic', onClick = () => alert('Gradient button clicked!') }) => {
          return React.createElement('button', {
            onClick: onClick,
            className: 'px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105'
          }, text);
        };
      `,
      props: {
        text: 'Gradient Magic'
      },
      dependencies: []
    },
    
    'outline-button': {
      name: 'OutlineButton',
      code: `
        const OutlineButton = ({ text = 'Outline Style', onClick = () => alert('Outline button clicked!') }) => {
          return React.createElement('button', {
            onClick: onClick,
            className: 'px-6 py-3 border-2 border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white font-medium rounded-lg transition-all duration-300 shadow-lg'
          }, text);
        };
      `,
      props: {
        text: 'Outline Style'
      },
      dependencies: []
    },
    
    'glass-button': {
      name: 'GlassButton', 
      code: `
        const GlassButton = ({ text = 'Glass Effect', onClick = () => alert('Glass button clicked!') }) => {
          return React.createElement('button', {
            onClick: onClick,
            className: 'px-6 py-3 backdrop-blur-md border border-white/30 text-white font-medium rounded-lg transition-all duration-300 hover:bg-white/20 shadow-lg',
            style: { 
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              backdropFilter: 'blur(10px)'
            }
          }, text);
        };
      `,
      props: {
        text: 'Glass Effect'
      },
      dependencies: []
    },
    
    'floating-button': {
      name: 'FloatingButton',
      code: `
        const FloatingButton = ({ text = 'Floating', onClick = () => alert('Floating button clicked!') }) => {
          const styles = {
            animation: 'float 3s ease-in-out infinite'
          };
          
          // Add keyframes dynamically
          if (!document.getElementById('float-keyframes')) {
            const style = document.createElement('style');
            style.id = 'float-keyframes';
            style.textContent = \`
              @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
              }
            \`;
            document.head.appendChild(style);
          }
          
          return React.createElement('button', {
            onClick: onClick,
            className: 'px-6 py-3 bg-purple-600 text-white font-medium rounded-full shadow-lg transition-all duration-300',
            style: styles
          }, text);
        };
      `,
      props: {
        text: 'Floating'
      },
      dependencies: []
    },

    // React Bits Card Components
    'gradient-card': {
      name: 'GradientCard',
      code: `
        const GradientCard = ({ 
          title = 'Welcome to Our Platform', 
          description = 'Build amazing applications with our powerful components and intuitive interface.',
          buttonText = 'Get Started',
          onClick = () => alert('Getting started!')
        }) => {
          return React.createElement('div', {
            className: 'p-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl border border-purple-200 shadow-xl'
          }, [
            React.createElement('h2', {
              key: 'title',
              className: 'text-3xl font-bold text-gray-900 mb-4'
            }, title),
            React.createElement('p', {
              key: 'description',
              className: 'text-gray-700 mb-6 text-lg leading-relaxed'
            }, description),
            React.createElement('button', {
              key: 'button',
              onClick: onClick,
              className: 'px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg'
            }, buttonText)
          ]);
        };
      `,
      props: {
        title: 'Welcome to Our Platform',
        description: 'Build amazing applications with our powerful components and intuitive interface.',
        buttonText: 'Get Started'
      },
      dependencies: []
    },
    
    'glass-card': {
      name: 'GlassCard',
      code: `
        const GlassCard = ({ 
          title = 'Glass Card', 
          description = 'Beautiful glassmorphism effect with backdrop blur'
        }) => {
          return React.createElement('div', {
            className: 'p-6 backdrop-blur-md rounded-xl border border-white/30 shadow-2xl',
            style: {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)'
            }
          }, [
            React.createElement('h3', {
              key: 'title',
              className: 'text-2xl font-bold text-gray-900 mb-3'
            }, title),
            React.createElement('p', {
              key: 'description',
              className: 'text-gray-700'
            }, description)
          ]);
        };
      `,
      props: {
        title: 'Glass Card',
        description: 'Beautiful glassmorphism effect with backdrop blur'
      },
      dependencies: []
    },
    
    'hover-card': {
      name: 'HoverCard',
      code: `
        const HoverCard = ({ 
          title = 'Interactive Card', 
          description = 'Hover for elevation effect'
        }) => {
          return React.createElement('div', {
            className: 'p-6 bg-white rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1'
          }, [
            React.createElement('h3', {
              key: 'title',
              className: 'text-2xl font-bold text-gray-900 mb-3'
            }, title),
            React.createElement('p', {
              key: 'description',
              className: 'text-gray-600'
            }, description)
          ]);
        };
      `,
      props: {
        title: 'Interactive Card',
        description: 'Hover for elevation effect'
      },
      dependencies: []
    },

    // Keep original button as fallback
    button: {
      name: 'Button',
      code: `
        const Button = ({ children, onClick, variant = 'primary', size = 'medium', disabled = false, ...props }) => {
          const baseStyles = {
            padding: size === 'small' ? '6px 12px' : size === 'large' ? '12px 24px' : '8px 16px',
            border: 'none',
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
            fontWeight: '500',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          };
          
          const variants = {
            primary: { 
              backgroundColor: '#0066cc', 
              color: 'white'
            },
            secondary: { 
              backgroundColor: '#f6f8fa', 
              color: '#24292f',
              border: '1px solid #d1d9e0'
            },
            danger: { 
              backgroundColor: '#dc3545', 
              color: 'white'
            }
          };
          
          const handleClick = (e) => {
            if (!disabled && onClick) {
              onClick(e);
            }
          };
          
          const variantStyles = variants[variant] || variants.primary;
          const finalStyles = { ...baseStyles, ...variantStyles };
          
          return React.createElement('button', {
            style: finalStyles,
            onClick: handleClick,
            disabled,
            ...props
          }, children);
        };
      `,
      props: { 
        children: 'Click me', 
        variant: 'primary',
        size: 'medium',
        disabled: false
      },
      dependencies: []
    },
    
    card: {
      name: 'Card',
      code: `
        const Card = ({ title, content, footer, shadow = true, padding = 'medium', ...props }) => {
          const cardStyles = {
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            padding: padding === 'small' ? '12px' : padding === 'large' ? '24px' : '16px',
            backgroundColor: 'white',
            boxShadow: shadow ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            fontFamily: 'inherit'
          };
          
          const titleStyles = {
            margin: '0 0 12px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#24292f'
          };
          
          const contentStyles = {
            marginBottom: footer ? '12px' : '0',
            color: '#656d76',
            lineHeight: '1.5'
          };
          
          const footerStyles = {
            fontSize: '12px',
            color: '#8b949e',
            borderTop: '1px solid #f6f8fa',
            paddingTop: '12px',
            marginTop: '12px'
          };
          
          return React.createElement('div', { style: cardStyles, ...props }, [
            title && React.createElement('h3', { key: 'title', style: titleStyles }, title),
            content && React.createElement('div', { key: 'content', style: contentStyles }, content),
            footer && React.createElement('div', { key: 'footer', style: footerStyles }, footer)
          ].filter(Boolean));
        };
      `,
      props: { 
        title: 'Card Title', 
        content: 'This is the card content area with some descriptive text.',
        footer: 'Card footer',
        shadow: true,
        padding: 'medium'
      },
      dependencies: []
    },
    
    input: {
      name: 'Input',
      code: `
        const Input = ({ 
          label, 
          placeholder = '', 
          type = 'text', 
          value = '', 
          onChange, 
          error,
          disabled = false,
          ...props 
        }) => {
          const containerStyles = {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontFamily: 'inherit'
          };
          
          const labelStyles = {
            fontSize: '14px',
            fontWeight: '500',
            color: '#24292f'
          };
          
          const inputStyles = {
            padding: '8px 12px',
            border: error ? '1px solid #dc3545' : '1px solid #d1d9e0',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            backgroundColor: disabled ? '#f6f8fa' : 'white',
            color: disabled ? '#8b949e' : '#24292f',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            '&:focus': {
              borderColor: error ? '#dc3545' : '#0066cc',
              boxShadow: error ? '0 0 0 3px rgba(220, 53, 69, 0.1)' : '0 0 0 3px rgba(0, 102, 204, 0.1)'
            }
          };
          
          const errorStyles = {
            fontSize: '12px',
            color: '#dc3545'
          };
          
          const handleChange = (e) => {
            if (onChange && !disabled) {
              onChange(e);
            }
          };
          
          return React.createElement('div', { style: containerStyles }, [
            label && React.createElement('label', { key: 'label', style: labelStyles }, label),
            React.createElement('input', {
              key: 'input',
              type,
              placeholder,
              value,
              onChange: handleChange,
              disabled,
              style: inputStyles,
              ...props
            }),
            error && React.createElement('span', { key: 'error', style: errorStyles }, error)
          ].filter(Boolean));
        };
      `,
      props: {
        label: 'Email Address',
        placeholder: 'Enter your email',
        type: 'email',
        value: '',
        error: '',
        disabled: false
      },
      dependencies: []
    },
    
    alert: {
      name: 'Alert',
      code: `
        const Alert = ({ 
          children, 
          variant = 'info', 
          title,
          dismissible = false,
          onDismiss,
          ...props 
        }) => {
          const variants = {
            info: {
              backgroundColor: '#f0f8ff',
              borderColor: '#0066cc',
              color: '#0066cc'
            },
            success: {
              backgroundColor: '#f0fff4',
              borderColor: '#28a745',
              color: '#28a745'
            },
            warning: {
              backgroundColor: '#fffbf0',
              borderColor: '#ffc107',
              color: '#856404'
            },
            danger: {
              backgroundColor: '#fff5f5',
              borderColor: '#dc3545',
              color: '#dc3545'
            }
          };
          
          const alertStyles = {
            padding: '12px 16px',
            borderRadius: '6px',
            border: \`1px solid \${variants[variant].borderColor}\`,
            backgroundColor: variants[variant].backgroundColor,
            color: variants[variant].color,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontFamily: 'inherit'
          };
          
          const contentStyles = {
            flex: 1
          };
          
          const titleStyles = {
            fontWeight: '600',
            marginBottom: '4px'
          };
          
          const dismissButtonStyles = {
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            marginLeft: '8px',
            opacity: 0.7,
            '&:hover': { opacity: 1 }
          };
          
          return React.createElement('div', { style: alertStyles, ...props }, [
            React.createElement('div', { key: 'content', style: contentStyles }, [
              title && React.createElement('div', { key: 'title', style: titleStyles }, title),
              React.createElement('div', { key: 'children' }, children)
            ]),
            dismissible && React.createElement('button', {
              key: 'dismiss',
              style: dismissButtonStyles,
              onClick: onDismiss,
              'aria-label': 'Dismiss'
            }, '×')
          ]);
        };
      `,
      props: {
        children: 'This is an informational alert message.',
        variant: 'info',
        title: 'Information',
        dismissible: true
      },
      dependencies: []
    }
  };
  
  async generateBasicComponent(description: string): Promise<ComponentBundle> {
    const keywords = description.toLowerCase();
    let template: ComponentTemplate | undefined;
    
    // Step 1: Check natural language mapping first
    for (const [phrase, componentKey] of Object.entries(this.componentMap)) {
      if (keywords.includes(phrase)) {
        if (this.templates[componentKey]) {
          template = this.templates[componentKey];
          console.log(`Matched phrase "${phrase}" to component "${componentKey}"`);
          break;
        }
      }
    }
    
    // Step 2: If no natural language match, check for specific button types
    if (!template) {
      if (keywords.includes('glow') || keywords.includes('glowing')) {
        template = this.templates['glowing-button'];
      } else if (keywords.includes('gradient')) {
        template = this.templates['gradient-button'];
      } else if (keywords.includes('outline')) {
        template = this.templates['outline-button'];
      } else if (keywords.includes('glass')) {
        template = this.templates['glass-button'];
      } else if (keywords.includes('float') || keywords.includes('floating')) {
        template = this.templates['floating-button'];
      }
    }
    
    // Step 3: Fall back to original keyword matching
    if (!template) {
      if (keywords.includes('button')) {
        // If generic button requested, use gradient button for a modern look
        template = this.templates['gradient-button'];
      } else if (keywords.includes('card')) {
        template = this.templates.card;
      } else if (keywords.includes('input') || keywords.includes('form') || keywords.includes('field')) {
        template = this.templates.input;
      } else if (keywords.includes('alert') || keywords.includes('notification') || keywords.includes('message')) {
        template = this.templates.alert;
      } else {
        // Default to gradient button for unknown components
        template = this.templates['gradient-button'];
      }
    }
    
    // Template should always be defined at this point, but add safety check
    if (!template) {
      template = this.templates['gradient-button'];
    }
    
    // Customize props based on description
    const customProps = this.customizeProps(template.props, description);
    
    // Clean up the code by removing leading whitespace while preserving internal indentation
    const lines = template.code.trim().split('\n');
    const minIndent = Math.min(...lines
      .filter(line => line.trim().length > 0)
      .map(line => line.match(/^(\s*)/)?.[1].length || 0)
    );
    const cleanCode = lines
      .map(line => line.substring(minIndent))
      .join('\n')
      .trim();
    
    return {
      id: `component_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: template.name,
      code: cleanCode,
      props: customProps,
      dependencies: template.dependencies,
      generatedAt: Date.now()
    };
  }
  
  private customizeProps(baseProps: Record<string, any>, description: string): Record<string, any> {
    const props = { ...baseProps };
    const keywords = description.toLowerCase();
    
    // Customize button variants
    if (keywords.includes('secondary')) {
      props.variant = 'secondary';
    } else if (keywords.includes('danger') || keywords.includes('delete') || keywords.includes('remove')) {
      props.variant = 'danger';
    }
    
    // Customize sizes
    if (keywords.includes('small')) {
      props.size = 'small';
    } else if (keywords.includes('large') || keywords.includes('big')) {
      props.size = 'large';
    }
    
    // Customize alert variants
    if (keywords.includes('success')) {
      props.variant = 'success';
      props.children = 'Operation completed successfully!';
    } else if (keywords.includes('warning')) {
      props.variant = 'warning';
      props.children = 'Please review this information carefully.';
    } else if (keywords.includes('error') || keywords.includes('danger')) {
      props.variant = 'danger';
      props.children = 'An error occurred. Please try again.';
    }
    
    // Customize text content based on description
    if (keywords.includes('login')) {
      props.children = 'Login';
    } else if (keywords.includes('submit')) {
      props.children = 'Submit';
    } else if (keywords.includes('save')) {
      props.children = 'Save';
    } else if (keywords.includes('cancel')) {
      props.children = 'Cancel';
      props.variant = 'secondary';
    }
    
    return props;
  }
  
  // Get available templates for help command
  getAvailableTemplates(): string[] {
    return Object.keys(this.templates);
  }
  
  // Get template info for help
  getTemplateInfo(templateName: string): ComponentTemplate | null {
    return this.templates[templateName] || null;
  }
}

export const componentGenerator = new ComponentGenerator();

// Helper function for terminal integration
export const generateBasicComponent = (description: string) => 
  componentGenerator.generateBasicComponent(description);