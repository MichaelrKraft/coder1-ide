// Lightweight React/TSX to JavaScript compiler for live preview
// Handles basic React patterns with error boundaries and fallbacks

export interface CompilationResult {
  success: boolean;
  html: string;
  error?: string;
  warnings?: string[];
}

export interface CompilerOptions {
  enableTSX: boolean;
  enableJSX: boolean;
  includeReactImports: boolean;
  timeoutMs: number;
}

const DEFAULT_OPTIONS: CompilerOptions = {
  enableTSX: true,
  enableJSX: true,
  includeReactImports: true,
  timeoutMs: 5000
};

export class PreviewCompiler {
  private options: CompilerOptions;

  constructor(options: Partial<CompilerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Main compilation method - handles different file types
   */
  async compile(content: string, filePath: string): Promise<CompilationResult> {
    try {
      const fileType = this.getFileType(filePath);
      
      switch (fileType) {
        case 'html':
          return this.compileHTML(content);
        case 'tsx':
        case 'jsx':
          return this.compileReact(content, filePath);
        case 'css':
          return this.compileCSS(content);
        case 'js':
        case 'ts':
          return this.compileJavaScript(content);
        default:
          return this.compileAsCode(content, filePath);
      }
    } catch (error) {
      return {
        success: false,
        html: this.createErrorHTML(error instanceof Error ? error.message : 'Unknown compilation error'),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Compile HTML files (serve directly with security sanitization)
   */
  private compileHTML(content: string): CompilationResult {
    // Basic HTML sanitization (remove script tags for security)
    const sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    return {
      success: true,
      html: sanitized,
      warnings: sanitized !== content ? ['Script tags removed for security'] : undefined
    };
  }

  /**
   * Compile React/TSX files to browser-compatible JavaScript
   */
  private compileReact(content: string, filePath: string): CompilationResult {
    try {
      // Basic TSX/JSX transformation using simple string replacement
      let compiled = content;
      const warnings: string[] = [];

      // Remove TypeScript types (basic approach)
      compiled = this.removeTypeScriptTypes(compiled);

      // Transform JSX to React.createElement calls (basic patterns)
      compiled = this.transformJSX(compiled);

      // Add React imports if missing
      if (this.options.includeReactImports && !compiled.includes('import React')) {
        compiled = `import React from 'react';\n${compiled}`;
      }

      // Wrap in HTML template
      const html = this.wrapInReactHTML(compiled, filePath);

      return {
        success: true,
        html,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        success: false,
        html: this.createErrorHTML(`React compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`),
        error: error instanceof Error ? error.message : 'React compilation error'
      };
    }
  }

  /**
   * Basic TypeScript type removal (simple regex approach)
   */
  private removeTypeScriptTypes(code: string): string {
    // Remove interface declarations
    code = code.replace(/interface\s+\w+\s*{[^}]*}/g, '');
    
    // Remove type annotations (basic patterns)
    code = code.replace(/:\s*\w+(\[\])?(\s*\||\s*&)?/g, '');
    
    // Remove generic type parameters
    code = code.replace(/<[^>]+>/g, '');
    
    // Remove type assertions
    code = code.replace(/as\s+\w+/g, '');
    
    return code;
  }

  /**
   * Basic JSX transformation (simple patterns only)
   */
  private transformJSX(code: string): string {
    // This is a very basic JSX transformer - only handles simple cases
    // For production use, would use @babel/parser or similar
    
    // Transform self-closing tags: <div /> -> <div></div>
    code = code.replace(/<(\w+)([^>]*?)\/>/g, '<$1$2></$1>');
    
    // Transform simple JSX expressions: {variable} -> ${variable}
    // This is a simplified approach - real JSX transformation is much more complex
    
    return code;
  }

  /**
   * Wrap React component in HTML template for browser execution
   */
  private wrapInReactHTML(reactCode: string, filePath: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview: ${filePath}</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #ffffff;
      color: #000000;
    }
    .preview-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .preview-error {
      background: #fee;
      border: 1px solid #fcc;
      padding: 15px;
      border-radius: 4px;
      color: #900;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try {
      ${reactCode}
      
      // Try to find and render the default export
      const root = ReactDOM.createRoot(document.getElementById('root'));
      
      // Look for common component patterns
      if (typeof Component !== 'undefined') {
        root.render(React.createElement(Component));
      } else if (typeof App !== 'undefined') {
        root.render(React.createElement(App));
      } else {
        // Fallback: display the code
        root.render(React.createElement('div', { className: 'preview-container' },
          React.createElement('h2', null, 'React Component Preview'),
          React.createElement('p', null, 'Component code loaded but no default export found.'),
          React.createElement('pre', null, \`${reactCode.replace(/`/g, '\\`')}\`)
        ));
      }
    } catch (error) {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement('div', { className: 'preview-error' },
        React.createElement('h3', null, 'Component Error'),
        React.createElement('p', null, error.message),
        React.createElement('details', null,
          React.createElement('summary', null, 'Component Code'),
          React.createElement('pre', null, \`${reactCode.replace(/`/g, '\\`')}\`)
        )
      ));
    }
  </script>
</body>
</html>`;
  }

  /**
   * Compile CSS files
   */
  private compileCSS(content: string): CompilationResult {
    // Detect animation/keyframe classes for better preview
    const animationClasses = this.extractCSSClasses(content);
    const hasAnimations = content.includes('@keyframes') || content.includes('animation:');
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Preview</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0; 
      padding: 20px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: #333;
    }
    .preview-container { 
      max-width: 1000px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 12px; 
      padding: 30px; 
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .preview-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #eee;
    }
    .preview-header h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    .preview-header p {
      color: #666;
      font-size: 1.1em;
    }
    .demo-section { 
      margin: 30px 0; 
      padding: 25px; 
      border: 2px solid #e0e0e0; 
      border-radius: 10px; 
      background: #f9f9f9;
    }
    .demo-section h3 {
      margin-top: 0;
      color: #444;
      border-bottom: 2px solid #ddd;
      padding-bottom: 10px;
    }
    .demo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .demo-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #ddd;
      text-align: center;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .demo-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .trigger-button {
      background: linear-gradient(45deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 25px;
      cursor: pointer;
      font-size: 1em;
      margin: 10px;
      transition: all 0.3s ease;
    }
    .trigger-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .code-section {
      background: #2d3748;
      color: #e2e8f0;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
      overflow-x: auto;
    }
    .code-section pre {
      margin: 0;
      white-space: pre-wrap;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 0.9em;
    }
    .animation-playground {
      min-height: 200px;
      background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 20px 0;
      position: relative;
      overflow: hidden;
    }
  </style>
  <style>
    /* Your CSS styles */
    ${content}
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="preview-header">
      <h1>🎨 CSS Preview</h1>
      <p>Interactive demonstration of your CSS styles${hasAnimations ? ' and animations' : ''}</p>
    </div>

    <div class="demo-section">
      <h3>📝 Text Elements</h3>
      <div class="demo-grid">
        <div class="demo-card">
          <h4>Heading</h4>
          <p>Sample paragraph text</p>
          <span>Small text</span>
        </div>
        <div class="demo-card">
          <h4>Lists</h4>
          <ul>
            <li>List item 1</li>
            <li>List item 2</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3>🔲 Interactive Elements</h3>
      <div class="demo-grid">
        <div class="demo-card">
          <button class="trigger-button">Click Me</button>
          <input type="text" placeholder="Input field" style="margin: 10px; padding: 8px;">
        </div>
        <div class="demo-card">
          <div style="width: 100px; height: 100px; background: #667eea; margin: 0 auto; border-radius: 50%;"></div>
          <p>Sample div element</p>
        </div>
      </div>
    </div>

    ${hasAnimations ? `
    <div class="demo-section">
      <h3>✨ Animation Playground</h3>
      <div class="animation-playground" id="playground">
        ${animationClasses.map(className => `
          <div class="demo-element" style="
            width: 80px; 
            height: 80px; 
            background: linear-gradient(45deg, #667eea, #764ba2); 
            border-radius: 10px; 
            margin: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            cursor: pointer;
          " onclick="this.className='demo-element ${className}'; setTimeout(() => this.className='demo-element', 2000)">
            ${className.replace(/^animate/, '').replace(/([A-Z])/g, ' $1').trim()}
          </div>
        `).join('')}
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <button class="trigger-button" onclick="triggerAllAnimations()">🎬 Trigger All Animations</button>
        <button class="trigger-button" onclick="resetAnimations()">🔄 Reset</button>
      </div>
    </div>
    ` : ''}

    <div class="demo-section">
      <h3>🎯 Apply Your Classes</h3>
      <p>Click the buttons below to apply your CSS classes to sample elements:</p>
      <div style="text-align: center;">
        ${animationClasses.map(className => `
          <button class="trigger-button" onclick="applyClass('${className}')">
            .${className}
          </button>
        `).join('')}
      </div>
      <div id="testElement" style="
        width: 200px; 
        height: 100px; 
        background: #f0f0f0; 
        border: 2px solid #ddd; 
        border-radius: 8px; 
        margin: 20px auto; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        font-weight: bold;
        cursor: pointer;
      ">
        Test Element
      </div>
    </div>

    <div class="code-section">
      <h3>📄 Your CSS Code</h3>
      <pre>${content}</pre>
    </div>
  </div>

  <script>
    function applyClass(className) {
      const element = document.getElementById('testElement');
      element.className = '';
      setTimeout(() => {
        element.className = className;
        element.textContent = '.' + className + ' applied!';
        setTimeout(() => {
          element.className = '';
          element.textContent = 'Test Element';
        }, 3000);
      }, 100);
    }

    function triggerAllAnimations() {
      const elements = document.querySelectorAll('.demo-element');
      elements.forEach((el, index) => {
        setTimeout(() => {
          const classes = ${JSON.stringify(animationClasses)};
          if (classes[index]) {
            el.className = 'demo-element ' + classes[index];
            setTimeout(() => el.className = 'demo-element', 2000);
          }
        }, index * 200);
      });
    }

    function resetAnimations() {
      const elements = document.querySelectorAll('.demo-element');
      elements.forEach(el => {
        el.className = 'demo-element';
      });
      document.getElementById('testElement').className = '';
      document.getElementById('testElement').textContent = 'Test Element';
    }

    // Auto-trigger animations on load if available
    window.addEventListener('load', () => {
      if (${hasAnimations}) {
        setTimeout(triggerAllAnimations, 1000);
      }
    });
  </script>
</body>
</html>`;

    return { success: true, html };
  }

  /**
   * Compile JavaScript files
   */
  private compileJavaScript(content: string): CompilationResult {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JavaScript Preview</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 20px; }
    .output { border: 1px solid #ddd; padding: 15px; margin: 10px 0; background: #f9f9f9; }
    pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
  </style>
</head>
<body>
  <h2>JavaScript Preview</h2>
  <div id="output" class="output">
    <p>JavaScript output will appear here...</p>
  </div>
  <details>
    <summary>JavaScript Code</summary>
    <pre>${content}</pre>
  </details>
  <script>
    // Capture console output
    const output = document.getElementById('output');
    const originalLog = console.log;
    console.log = function(...args) {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      output.innerHTML += '<div>' + message + '</div>';
      originalLog.apply(console, args);
    };

    // Execute the JavaScript code
    try {
      ${content}
    } catch (error) {
      output.innerHTML += '<div style="color: red;">Error: ' + error.message + '</div>';
    }
  </script>
</body>
</html>`;

    return { success: true, html };
  }

  /**
   * Compile other file types as formatted code
   */
  private compileAsCode(content: string, filePath: string): CompilationResult {
    const extension = filePath.split('.').pop() || 'text';
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Preview: ${filePath}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 20px; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
    .file-info { background: #e3f2fd; padding: 10px; border-radius: 4px; margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="file-info">
    <strong>File:</strong> ${filePath} <br>
    <strong>Type:</strong> ${extension.toUpperCase()} <br>
    <strong>Size:</strong> ${content.length} characters
  </div>
  <pre><code>${this.escapeHtml(content)}</code></pre>
</body>
</html>`;

    return { success: true, html };
  }

  /**
   * Create error HTML display
   */
  private createErrorHTML(error: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Error</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 4px; color: #900; }
  </style>
</head>
<body>
  <div class="error">
    <h3>Preview Error</h3>
    <p>${this.escapeHtml(error)}</p>
  </div>
</body>
</html>`;
  }

  /**
   * Get file type from path
   */
  private getFileType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'html':
      case 'htm':
        return 'html';
      case 'tsx':
        return 'tsx';
      case 'jsx':
        return 'jsx';
      case 'css':
        return 'css';
      case 'js':
        return 'js';
      case 'ts':
        return 'ts';
      default:
        return 'other';
    }
  }

  /**
   * Extract CSS class names from content
   */
  private extractCSSClasses(content: string): string[] {
    const classRegex = /\.([a-zA-Z][a-zA-Z0-9_-]*)\s*\{/g;
    const classes: string[] = [];
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      if (!classes.includes(className)) {
        classes.push(className);
      }
    }
    
    return classes;
  }

  /**
   * Escape HTML for safe display (server-safe)
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global compiler instance
export const previewCompiler = new PreviewCompiler();