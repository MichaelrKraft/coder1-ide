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
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Preview</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 20px; }
    .css-preview { border: 1px solid #ddd; padding: 20px; margin: 20px 0; }
  </style>
  <style>
    ${content}
  </style>
</head>
<body>
  <h2>CSS Preview</h2>
  <div class="css-preview">
    <h3>Sample Elements</h3>
    <p>This is a paragraph with your CSS applied.</p>
    <button>Button</button>
    <div class="example">Example div</div>
  </div>
  <details>
    <summary>CSS Code</summary>
    <pre>${content}</pre>
  </details>
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