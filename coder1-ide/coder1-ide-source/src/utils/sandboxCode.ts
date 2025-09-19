// Sandbox code for component rendering
export const getSandboxHTML = () => {
  // JavaScript code as a string (no template literals)
  const sandboxScript = `
    // Function to send ready message with retries
    let readyMessageSent = false;
    let readyRetries = 0;
    const maxRetries = 5;
    
    function sendReadyMessage() {
      if (!readyMessageSent && readyRetries < maxRetries) {
        try {
          console.log('Sandbox: Sending SANDBOX_READY message (attempt ' + (readyRetries + 1) + ')');
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
          }
          readyRetries++;
          
          // Retry after a short delay
          setTimeout(sendReadyMessage, 100);
        } catch (e) {
          console.error('Sandbox: Error sending ready message:', e);
        }
      }
    }
    
    // Start sending ready messages after a small delay to ensure everything is loaded
    setTimeout(sendReadyMessage, 50);
    
    // Listen for acknowledgment and component rendering requests
    window.addEventListener('message', (event) => {
      // Mark ready as sent if we receive any message from parent
      if (event.source === window.parent) {
        readyMessageSent = true;
      }
      console.log('Sandbox: Received message:', event.data);
      if (event.data.type === 'RENDER_COMPONENT') {
        console.log('Sandbox: RENDER_COMPONENT received, rendering component');
        try {
          renderComponent(event.data.component);
        } catch (error) {
          console.error('Component render error:', error);
          showError('Failed to render component: ' + error.message);
          window.parent.postMessage({ 
            type: 'SANDBOX_ERROR', 
            error: error.message 
          }, '*');
        }
      } else if (event.data.type === 'TEST_RENDER') {
        // Simple test without Babel
        console.log('Sandbox: TEST_RENDER received, testing basic rendering');
        try {
          const root = document.getElementById('root');
          root.innerHTML = '<div style="padding: 20px; background: #4CAF50; color: white; border-radius: 8px;">✅ Sandbox is working! Message received and rendered.</div>';
          window.parent.postMessage({
            type: 'TEST_RENDER_SUCCESS'
          }, '*');
        } catch (err) {
          console.error('Test render failed:', err);
          window.parent.postMessage({
            type: 'TEST_RENDER_ERROR',
            error: err.message
          }, '*');
        }
      }
    });
    
    function renderComponent(component) {
      try {
        console.log('Sandbox renderComponent: Starting with component:', component);
        const { code, props = {}, name } = component;
        
        if (!code || !name) {
          throw new Error('Component missing required code or name');
        }
        
        // Add default onClick for buttons to show they're interactive
        const enhancedProps = { ...props };
        if (name === 'Button' && !enhancedProps.onClick) {
          enhancedProps.onClick = function() {
            alert('Button clicked! 🎉\\n\\nThis button is working correctly.\\nYou can customize the onClick behavior by modifying the props.');
          };
        }
        
        // Log the code for debugging
        console.log('Sandbox: Transforming code:', code);
        
        // Transform and execute the component code directly
        let transformedCode;
        try {
          // Wrap the component code to return it
          const wrappedCode = code + '\\n\\nwindow.__SANDBOX_COMPONENT__ = ' + name + ';';
          transformedCode = Babel.transform(wrappedCode, {
            presets: ['react'],
            plugins: []
          }).code;
          console.log('Transformed code:', transformedCode);
        } catch (babelError) {
          console.error('Babel transform error:', babelError);
          throw new Error('Failed to transform component code: ' + babelError.message);
        }
        
        // Create component constructor
        let ComponentClass;
        try {
          // Clear any previous component
          window.__SANDBOX_COMPONENT__ = null;
          
          // Execute the transformed code
          const executeCode = new Function(transformedCode);
          executeCode();
          
          // Get the component from the global variable
          ComponentClass = window.__SANDBOX_COMPONENT__;
          
          if (!ComponentClass) {
            throw new Error('Component was not properly defined after execution');
          }
          
          console.log('Component class obtained:', ComponentClass);
        } catch (evalError) {
          console.error('Component evaluation error:', evalError);
          throw new Error('Failed to evaluate component: ' + evalError.message);
        }
        
        // Create React element with the enhanced props
        const element = React.createElement(ComponentClass, enhancedProps);
        
        // Render to DOM
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(element);
        
        // Notify parent of successful render
        window.parent.postMessage({
          type: 'COMPONENT_RENDERED',
          componentId: component.id,
          renderTime: Date.now() - component.generatedAt
        }, '*');
        
      } catch (error) {
        console.error('Render error:', error);
        showError('Failed to render component: ' + error.message);
        throw error;
      }
    }
    
    function showError(message) {
      const root = document.getElementById('root');
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.innerHTML = '<h4>Component Error</h4><p>' + message + '</p>';
      root.innerHTML = '';
      root.appendChild(errorDiv);
    }
    
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      const message = event.error?.message || event.message || 'Unknown error';
      showError(message);
      window.parent.postMessage({
        type: 'SANDBOX_ERROR',
        error: message
      }, '*');
    });
    
    // Test function to verify sandbox is working
    window.testSandbox = function() {
      console.log('Sandbox test function called');
      try {
        // Test basic React rendering
        const TestComponent = function() {
          return React.createElement('div', {
            style: { padding: '20px', background: '#e1f5fe', borderRadius: '8px' }
          }, 'Sandbox is working! React version: ' + React.version);
        };
        
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(TestComponent));
        
        console.log('Test component rendered successfully');
        return true;
      } catch (err) {
        console.error('Test component failed:', err);
        return false;
      }
    };
    
    // Log when all scripts are loaded
    window.addEventListener('load', function() {
      console.log('Sandbox: All scripts loaded');
      console.log('React available:', typeof React !== 'undefined');
      console.log('ReactDOM available:', typeof ReactDOM !== 'undefined');
      console.log('Babel available:', typeof Babel !== 'undefined');
      
      // Auto-test on load for debugging
      if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') {
        window.testSandbox();
      }
    });
    
    // Also log immediately
    console.log('Sandbox: Initial check - React:', typeof React !== 'undefined');
    console.log('Sandbox: Initial check - ReactDOM:', typeof ReactDOM !== 'undefined');
    console.log('Sandbox: Initial check - Babel:', typeof Babel !== 'undefined');
  `;

  // Return HTML without template literals
  return '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Live Preview</title>' +
    '<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>' +
    '<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>' +
    '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>' +
    '<style>' +
    'body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; background: #ffffff; color: #24292f; }' +
    '#root { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; min-height: 200px; }' +
    '.loading { color: #656d76; font-style: italic; }' +
    '.error { color: #d1242f; background: #fff5f5; padding: 16px; border-radius: 6px; border: 1px solid #fd8c8c; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div id="root"><div class="loading">Loading component...</div></div>' +
    '<script>' + sandboxScript + '</script>' +
    '</body>' +
    '</html>';
};