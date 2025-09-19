export interface ComponentProp {
  name: string;
  type: string;
  defaultValue?: string;
  required: boolean;
}

export interface ComponentInfo {
  name: string;
  props: ComponentProp[];
  hasState: boolean;
  imports: string[];
}

export function analyzeReactComponent(code: string): ComponentInfo | null {
  try {
    // Extract component name
    const componentNameMatch = code.match(/(?:function|const|class)\s+(\w+)/);
    const componentName = componentNameMatch?.[1] || 'Component';

    // Extract props from function parameters or interface
    const props: ComponentProp[] = [];
    
    // Match function component props
    const propsMatch = code.match(/\({\s*([^}]+)\s*}\s*(?::\s*\w+)?\)/);
    if (propsMatch) {
      const propsString = propsMatch[1];
      const propsList = propsString.split(',').map(p => p.trim());
      
      propsList.forEach(prop => {
        if (prop) {
          const [name, defaultValue] = prop.split('=').map(p => p.trim());
          const cleanName = name.replace(/['"]/g, '');
          const cleanDefaultValue = defaultValue ? defaultValue.replace(/['"]/g, '') : undefined;
          
          // Determine type based on default value
          let type = 'string';
          if (cleanDefaultValue === 'true' || cleanDefaultValue === 'false') {
            type = 'boolean';
          } else if (!isNaN(Number(cleanDefaultValue))) {
            type = 'number';
          }
          
          props.push({
            name: cleanName,
            type,
            defaultValue: cleanDefaultValue,
            required: !defaultValue
          });
        }
      });
    }

    // Check if component uses state
    const hasState = /useState|useReducer|this\.state/.test(code);

    // Extract imports
    const imports: string[] = [];
    const importRegex = /import\s+(?:{[^}]+}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    return {
      name: componentName,
      props,
      hasState,
      imports
    };
  } catch (error) {
    console.error('Error analyzing component:', error);
    return null;
  }
}

export function generatePropsPlayground(componentInfo: ComponentInfo): string {
  const propInputs = componentInfo.props.map(prop => {
    const inputType = prop.type === 'boolean' ? 'checkbox' : 'text';
    return `
      <div class="prop-input">
        <label>${prop.name}${prop.required ? ' *' : ''}</label>
        <input 
          type="${inputType}" 
          data-prop="${prop.name}"
          ${prop.defaultValue ? `value="${prop.defaultValue}"` : ''}
          ${inputType === 'checkbox' && prop.defaultValue === 'true' ? 'checked' : ''}
        />
      </div>
    `;
  }).join('');

  return `
    <div class="props-playground">
      <h4>Component Props</h4>
      ${propInputs}
      <button onclick="updateComponentProps()">Update Props</button>
    </div>
  `;
}

export function wrapCodeForPreview(code: string, componentInfo?: ComponentInfo | null): string {
  // Basic React wrapper for preview
  const componentName = componentInfo?.name || 'Component';
  
  // If it's already a complete module, use it as-is
  if (code.includes('export default') || code.includes('module.exports')) {
    return code;
  }

  // Otherwise, wrap it
  return `
${code}

// Auto-render for preview
if (typeof ${componentName} !== 'undefined' && typeof ReactDOM !== 'undefined') {
  const container = document.getElementById('root');
  if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(${componentName}, {}));
  }
}
  `;
}

export function detectCodeType(code: string): 'react' | 'html' | 'javascript' | 'css' {
  // Simple detection based on content
  if (code.includes('React.') || code.includes('useState') || code.includes('jsx') || /<\w+\s/.test(code)) {
    return 'react';
  }
  if (code.includes('<!DOCTYPE') || code.includes('<html') || code.includes('<body')) {
    return 'html';
  }
  if (code.includes('{') && code.includes(':') && code.includes(';') && !code.includes('function')) {
    return 'css';
  }
  return 'javascript';
}