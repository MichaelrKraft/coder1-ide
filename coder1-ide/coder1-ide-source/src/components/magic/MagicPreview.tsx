import React, { useState, useEffect, useRef } from 'react';
import './MagicPreview.css';
import OptimizationPanel from './OptimizationPanel';

interface MagicPreviewProps {
  componentCode?: string;
  componentName?: string;
  isVisible: boolean;
  onClose: () => void;
  onAccept: () => void;
  onRegenerate: () => void;
  onCustomizeTheme?: () => void;
  isGenerating?: boolean;
}

const MagicPreview: React.FC<MagicPreviewProps> = ({
  componentCode,
  componentName = 'PreviewComponent',
  isVisible,
  onClose,
  onAccept,
  onRegenerate,
  onCustomizeTheme,
  isGenerating = false
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [viewportSize, setViewportSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [showOptimization, setShowOptimization] = useState(false);
  const [optimizedCode, setOptimizedCode] = useState<string | null>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Generate preview HTML from component code
  const generatePreviewHTML = (code: string) => {
    // Extract component function/const declaration - look for React component patterns
    const patterns = [
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=])*=>\s*(?:\(|{)/,  // Arrow function component
      /(?:function)\s+(\w+)\s*\([^)]*\)/,  // Function component
      /(?:class)\s+(\w+)\s+extends\s+(?:React\.)?(?:Component|PureComponent)/,  // Class component
      /(?:const|let|var)\s+(\w+)\s*=\s*function/,  // Function expression
      /(?:export\s+(?:default\s+)?)?(?:const|function|class)\s+(\w+)/  // With export
    ];
    
    let actualComponentName = componentName;
    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match && match[1]) {
        actualComponentName = match[1];
        break;
      }
    }
    
    console.log('🎨 MagicPreview: Detected component name:', actualComponentName);
    
    // Clean the code for browser execution - more aggressive TypeScript removal
    let cleanedCode = code
      // First, remove all interface blocks (including nested braces)
      .replace(/interface\s+\w+\s*{[^{}]*(?:{[^{}]*}[^{}]*)*}/gm, '')
      // Remove type declarations
      .replace(/type\s+\w+\s*=\s*[^;\n]+;/gm, '')
      // Remove enum declarations
      .replace(/enum\s+\w+\s*{[^}]*}/gm, '')
      // Remove TypeScript type annotations from variables and parameters
      .replace(/:\s*(string|number|boolean|any|void|null|undefined|object|\w+(?:\[\])?|{[^}]*}|\([^)]*\)\s*=>\s*\w+)\s*([,);=\n])/g, '$2')
      // Remove generic type parameters
      .replace(/<[^>]+>/g, '')
      // Remove 'as' type assertions
      .replace(/\s+as\s+\w+/g, '')
      // Remove React.FC and FC type annotations
      .replace(/:\s*(?:React\.)?FC(?:<[^>]*>)?/g, '')
      // Remove ES6 imports
      .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
      .replace(/^import\s+['"].*?['"];?\s*$/gm, '')
      // Remove exports but keep the component
      .replace(/^export\s+default\s+/gm, '')
      .replace(/^export\s+/gm, '')
      // Clean up any remaining TypeScript-only keywords
      .replace(/\b(declare|namespace|module)\s+\w+\s*{[^}]*}/g, '')
      // Remove empty lines left by the removals
      .replace(/^\s*[\r\n]/gm, '');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Component Preview</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .preview-container {
            width: 100%;
            max-width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .error-container {
            background: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin: 20px;
            color: #dc2626;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <div id="error" style="display: none;"></div>
    
    <script>
        window.addEventListener('error', function(e) {
            console.error('Preview Error:', e.error);
            const errorDiv = document.getElementById('error');
            errorDiv.style.display = 'block';
            errorDiv.innerHTML = '<div class="error-container"><h3>Preview Error</h3><p>' + e.error.message + '</p></div>';
        });
    </script>
    
    <script type="text/babel">
        const { useState, useEffect, useRef } = React;
        
        try {
            // Get the component code - FIXED: Use proper escaping for injection
            console.log('🧪 RAW CODE FROM MAGICUISERVICE:');
            
            // Escape the code properly for injection into JavaScript  
            const componentCodeString = ` + JSON.stringify(cleanedCode) + `;
            const componentName = ` + JSON.stringify(actualComponentName) + `;
            console.log('🧪 ESCAPED CODE FOR BABEL:', componentCodeString.substring(0, 300));
            
            console.log('🎨 Attempting to render component:', componentName);
            
            // Transform JSX to JavaScript using Babel
            console.log('🔄 About to transform with Babel...');
            let transformedCode;
            try {
                transformedCode = Babel.transform(componentCodeString, {
                    presets: ['react'],
                    plugins: []
                }).code;
                console.log('✅ Babel transformation successful');
            } catch (babelError) {
                console.error('❌ Babel transformation failed:', babelError);
                console.error('❌ Code that failed Babel:', componentCodeString);
                throw new Error('Babel transformation failed: ' + babelError.message);
            }
            
            console.log('🔄 Transformed code:', transformedCode.substring(0, 200) + '...');
            
            // Create a scope for the component
            const componentScope = {};
            
            // Execute the transformed code in a function scope
            const executeCode = new Function('React', 'useState', 'useEffect', 'useRef', 'scope', 
                transformedCode + '\\n' + 
                'scope.' + componentName + ' = typeof ' + componentName + ' !== "undefined" ? ' + componentName + ' : null;'
            );
            
            executeCode(React, useState, useEffect, useRef, componentScope);
            
            console.log('📦 Component scope:', componentScope);
            console.log('📦 Component found:', !!componentScope[componentName]);
            
            const ComponentToRender = componentScope[componentName];
            
            if (!ComponentToRender) {
                throw new Error('Component "' + componentName + '" was not found after transformation');
            }
            
            // Create wrapper app
            const App = () => {
                return React.createElement(
                    'div',
                    { className: 'preview-container' },
                    React.createElement(ComponentToRender)
                );
            };
            
            // Use ReactDOM.render for compatibility
            ReactDOM.render(React.createElement(App), document.getElementById('root'));
            console.log('✅ Component rendered successfully:', componentName);
            
        } catch (error) {
            console.error('❌ Component render error:', error);
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            console.error('❌ Component code that failed:', componentCodeString.substring(0, 500));
            const errorDiv = document.getElementById('error');
            errorDiv.style.display = 'block';
            errorDiv.innerHTML = '<div class="error-container"><h3>Component Error: ' + error.name + '</h3><p><strong>Message:</strong> ' + error.message + '</p><p><strong>Code preview:</strong></p><pre style="font-size: 10px; max-height: 200px; overflow: auto;">' + componentCodeString.substring(0, 500) + '...</pre></div>';
        }
    </script>
</body>
</html>`;
  };

  useEffect(() => {
    console.log('🚨 MagicPreview: useEffect triggered with:', {
      hasComponentCode: !!componentCode,
      codeLength: componentCode?.length || 0,
      hasPreviewRef: !!previewRef.current,
      componentName
    });
    
    if (componentCode && previewRef.current) {
      console.log('🎨 MagicPreview: Generating preview for component:', componentName);
      console.log('🎨 MagicPreview: Component code:', componentCode);
      console.log('🎨 MagicPreview: Component code length:', componentCode.length);
      
      // FIXED: Direct injection with data URL - no postMessage needed
      const iframe = previewRef.current;
      
      // Clean the component code for safe injection
      const cleanedCode = componentCode
        .replace(/interface\s+\w+\s*{[^{}]*(?:{[^{}]*}[^{}]*)*}/gm, '')
        .replace(/type\s+\w+\s*=\s*[^;\n]+;/gm, '')
        .replace(/:\s*(string|number|boolean|any|void|null|undefined|object|\w+(?:\[\])?|{[^}]*}|\([^)]*\)\s*=>\s*\w+)\s*([,);=\n])/g, '$2')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+as\s+\w+/g, '')
        .replace(/:\s*(?:React\.)?FC(?:<[^>]*>)?/g, '')
        .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
        .replace(/^import\s+['"].*?['"];?\s*$/gm, '')
        .replace(/^export\s+default\s+/gm, '')
        .replace(/^export\s+/gm, '')
        .replace(/^\s*[\r\n]/gm, '');
      
      console.log('🧪 MagicPreview: Cleaned code length:', cleanedCode.length);
      
      // FIXED: Create HTML with string concatenation - NO template literals
      console.log('🔧 MagicPreview: Building HTML with string concatenation...');
      console.log('🔧 MagicPreview: Component name for injection:', componentName);
      console.log('🔧 MagicPreview: Cleaned code preview:', cleanedCode.substring(0, 200) + '...');
      
      const htmlContent = '<!DOCTYPE html>' +
        '<html lang="en">' +
        '<head>' +
        '    <meta charset="UTF-8">' +
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '    <title>Component Preview</title>' +
        '    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>' +
        '    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>' +
        '    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>' +
        '    <script src="https://cdn.tailwindcss.com"></script>' +
        '    <style>' +
        '        body { ' +
        '            margin: 0; ' +
        '            padding: 20px; ' +
        '            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
        '            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);' +
        '            min-height: 100vh;' +
        '            display: flex;' +
        '            align-items: center;' +
        '            justify-content: center;' +
        '        }' +
        '        .preview-container {' +
        '            width: 100%;' +
        '            max-width: 100%;' +
        '            display: flex;' +
        '            justify-content: center;' +
        '            align-items: center;' +
        '        }' +
        '        .error-container {' +
        '            background: #fee2e2;' +
        '            border: 1px solid #fecaca;' +
        '            border-radius: 8px;' +
        '            padding: 20px;' +
        '            margin: 20px;' +
        '            color: #dc2626;' +
        '        }' +
        '    </style>' +
        '</head>' +
        '<body>' +
        '    <div id="root"></div>' +
        '    <div id="error" style="display: none;"></div>' +
        '    ' +
        '    <script>' +
        '        window.addEventListener("error", function(e) {' +
        '            console.error("🚨 Window Error:", e.error);' +
        '            const errorDiv = document.getElementById("error");' +
        '            errorDiv.style.display = "block";' +
        '            errorDiv.innerHTML = "<div class=\\"error-container\\"><h3>Preview Error</h3><p>" + e.error.message + "</p></div>";' +
        '        });' +
        '        console.log("🎯 Magic Preview iframe loaded successfully");' +
        '    </script>' +
        '    ' +
        '    <script type="text/babel">' +
        '        // Ensure React is available globally in the iframe context' +
        '        window.React = React;' +
        '        window.ReactDOM = ReactDOM;' +
        '        const { useState, useEffect, useRef } = React;' +
        '        ' +
        '        console.log("🎨 Starting component rendering...");' +
        '        console.log("🔧 Component name:", "' + componentName + '");' +
        '        console.log("🔧 React available:", typeof React);' +
        '        console.log("🔧 ReactDOM available:", typeof ReactDOM);' +
        '        console.log("🔧 About to inject component code...");' +
        '        ' +
        '        try {' +
        '            // Component code injected safely with proper escaping' +
        '            const componentCodeString = ' + JSON.stringify(cleanedCode) + ';' +
        '            console.log("📝 Evaluating component code...");' +
        '            eval(componentCodeString);' +
        '            ' +
        '            console.log("✅ Component code executed");' +
        '            console.log("🔍 Available component:", typeof ' + componentName + ');' +
        '            ' +
        '            if (typeof ' + componentName + ' === "undefined") {' +
        '                throw new Error("Component \\"' + componentName + '\\" is not defined");' +
        '            }' +
        '            ' +
        '            // Create wrapper app' +
        '            const App = () => {' +
        '                return React.createElement(' +
        '                    "div",' +
        '                    { className: "preview-container" },' +
        '                    React.createElement(' + componentName + ')' +
        '                );' +
        '            };' +
        '            ' +
        '            // Render the component using React 18 createRoot API' +
        '            const root = ReactDOM.createRoot(document.getElementById("root"));' +
        '            root.render(React.createElement(App));' +
        '            console.log("✅ Component rendered successfully: ' + componentName + '");' +
        '            ' +
        '        } catch (error) {' +
        '            console.error("❌ Component render error:", error);' +
        '            console.error("❌ Error details:", error.name, error.message);' +
        '            console.error("❌ Error stack:", error.stack);' +
        '            console.error("❌ Component code that failed:", componentCodeString ? componentCodeString.substring(0, 500) : "No code");' +
        '            const errorDiv = document.getElementById("error");' +
        '            errorDiv.style.display = "block";' +
        '            errorDiv.innerHTML = "<div class=\\"error-container\\"><h3>Component Error: " + error.name + "</h3><p><strong>Message:</strong> " + error.message + "</p><p><strong>Component Name:</strong> ' + componentName + '</p><pre style=\\"font-size: 10px; max-height: 150px; overflow: auto;\\">" + error.stack + "</pre></div>";' +
        '        }' +
        '    </script>' +
        '</body>' +
        '</html>';
      
      // Set the iframe content - try srcdoc first (more reliable), fallback to data URL
      try {
        // srcdoc is more reliable for complex content
        iframe.srcdoc = htmlContent;
        console.log('🎯 MagicPreview: Iframe content set using srcdoc attribute');
      } catch (e) {
        // Fallback to data URL if srcdoc fails
        iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
        console.log('🎯 MagicPreview: Fallback - Iframe src set with data URL');
      }
    }
  }, [componentCode, componentName]);

  const getViewportDimensions = () => {
    switch (viewportSize) {
      case 'mobile': return { width: '375px', height: '667px' };
      case 'tablet': return { width: '768px', height: '1024px' };
      case 'desktop': return { width: '100%', height: '600px' };
      default: return { width: '100%', height: '600px' };
    }
  };

  useEffect(() => {
    console.log('🎨 MagicPreview: Props changed:', {
      isVisible,
      componentName,
      hasComponentCode: !!componentCode,
      componentCodeLength: componentCode?.length || 0,
      isGenerating
    });
  }, [isVisible, componentName, componentCode, isGenerating]);

  if (!isVisible) return null;

  return (
    <div className="magic-preview-overlay">
      <div className="magic-preview-container">
        {/* Header */}
        <div className="magic-preview-header">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🎨 Component Preview: {componentName}
            </h3>
            {isGenerating && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-sm">Generating...</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Viewport Size Controls */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewportSize('mobile')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewportSize === 'mobile' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Mobile (375px)"
              >
                📱
              </button>
              <button
                onClick={() => setViewportSize('tablet')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewportSize === 'tablet' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Tablet (768px)"
              >
                📋
              </button>
              <button
                onClick={() => setViewportSize('desktop')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewportSize === 'desktop' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Desktop (100%)"
              >
                🖥️
              </button>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close Preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="magic-preview-tabs">
          <button
            onClick={() => setActiveTab('preview')}
            className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
          >
            👁️ Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`tab-button ${activeTab === 'code' ? 'active' : ''}`}
          >
            🔧 Code
          </button>
        </div>

        {/* Content Area */}
        <div className="magic-preview-content">
          {activeTab === 'preview' ? (
            <div className="preview-viewport" style={getViewportDimensions()}>
              {componentCode ? (
                <div className="relative w-full h-full">
                  {isGenerating && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg">
                      <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-lg font-semibold text-gray-900">Regenerating Component...</p>
                        <p className="text-sm text-gray-600">Creating a new variation with different styling</p>
                      </div>
                    </div>
                  )}
                  <iframe
                    key={`preview-${componentCode?.length || 0}-${Date.now()}`}
                    ref={previewRef}
                    className="preview-iframe"
                    title="Component Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  />
                </div>
              ) : (
                <div className="preview-placeholder">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl mb-4">🎨</div>
                    <p className="text-lg font-medium mb-2">No component to preview</p>
                    <p className="text-sm">Generate a component to see it here</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="code-viewer">
              <div className="code-header">
                <span className="text-sm text-gray-600">
                  {componentName}.tsx
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(componentCode || '')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  📋 Copy
                </button>
              </div>
              <pre className="code-content">
                <code>{componentCode || '// No code generated yet'}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="magic-preview-actions" style={{ zIndex: 10001, position: 'relative' }}>
          <div className="flex space-x-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 REGENERATE BUTTON CLICKED!');
                console.log('   Event target:', e.target);
                console.log('   onRegenerate function exists:', !!onRegenerate);
                console.log('   onRegenerate type:', typeof onRegenerate);
                console.log('   isGenerating:', isGenerating);
                console.log('   button disabled:', e.currentTarget.disabled);
                
                if (onRegenerate && typeof onRegenerate === 'function') {
                  console.log('✅ Calling onRegenerate...');
                  onRegenerate();
                } else {
                  console.error('❌ onRegenerate function is missing or invalid!');
                }
              }}
              onMouseDown={() => console.log('🔄 Regenerate mousedown')}
              onMouseUp={() => console.log('🔄 Regenerate mouseup')}
              disabled={isGenerating}
              className="action-button secondary"
              style={{ 
                zIndex: 10002, 
                position: 'relative', 
                pointerEvents: 'auto',
                minWidth: '120px',
                backgroundColor: isGenerating ? '#6b7280' : '#4b5563'
              }}
              title="Generate a new variation with different design"
            >
              {isGenerating ? '🔄 Generating...' : '🔄 Regenerate'}
            </button>
            
            {onCustomizeTheme && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🎨 CUSTOMIZE THEME BUTTON CLICKED!');
                  console.log('   Event target:', e.target);
                  console.log('   onCustomizeTheme function exists:', !!onCustomizeTheme);
                  console.log('   onCustomizeTheme type:', typeof onCustomizeTheme);
                  console.log('   componentCode exists:', !!componentCode);
                  console.log('   isGenerating:', isGenerating);
                  console.log('   button disabled:', e.currentTarget.disabled);
                  
                  if (onCustomizeTheme && typeof onCustomizeTheme === 'function') {
                    console.log('✅ Calling onCustomizeTheme...');
                    onCustomizeTheme();
                  } else {
                    console.error('❌ onCustomizeTheme function is missing or invalid!');
                  }
                }}
                onMouseDown={() => console.log('🎨 Customize mousedown')}
                onMouseUp={() => console.log('🎨 Customize mouseup')}
                disabled={!componentCode || isGenerating}
                className="action-button secondary"
                style={{ 
                  zIndex: 10002, 
                  position: 'relative', 
                  pointerEvents: 'auto',
                  minWidth: '140px',
                  backgroundColor: (!componentCode || isGenerating) ? '#6b7280' : '#4b5563'
                }}
                title="Customize theme and styling"
              >
                🎨 Customize Theme
              </button>
            )}
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 OPTIMIZE BUTTON CLICKED!');
                setShowOptimization(true);
              }}
              disabled={!componentCode || isGenerating}
              className="action-button secondary"
              style={{ 
                zIndex: 10002, 
                position: 'relative', 
                pointerEvents: 'auto',
                minWidth: '120px',
                backgroundColor: (!componentCode || isGenerating) ? '#6b7280' : '#4b5563'
              }}
              title="Optimize for accessibility and performance"
            >
              🔧 Optimize
            </button>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="action-button outline"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              disabled={!componentCode || isGenerating}
              className="action-button primary"
            >
              ✅ Accept & Insert
            </button>
          </div>
        </div>
      </div>
      
      {/* Optimization Panel */}
      {showOptimization && componentCode && (
        <OptimizationPanel
          code={optimizedCode || componentCode}
          isVisible={showOptimization}
          onClose={() => setShowOptimization(false)}
          onApplyOptimizations={(newCode) => {
            setOptimizedCode(newCode);
            // Update the preview with optimized code
            const event = new CustomEvent('magicComponentUpdate', {
              detail: { code: newCode }
            });
            window.dispatchEvent(event);
          }}
        />
      )}
    </div>
  );
};

export default MagicPreview;