import React, { forwardRef, useEffect, useState } from 'react';
import { getSandboxHTML } from '../utils/sandboxCode';

interface ComponentBundle {
  id: string;
  name: string;
  code: string;
  props: Record<string, any>;
  dependencies: string[];
  generatedAt: number;
}

interface ComponentSandboxProps {
  component: ComponentBundle | null;
  onError: (error: string) => void;
  onReady?: () => void;
}

const ComponentSandbox = forwardRef<HTMLIFrameElement, ComponentSandboxProps>(
  ({ component, onError, onReady }, ref) => {
    const [sandboxReady, setSandboxReady] = useState(false);
    
    useEffect(() => {
      // Listen for sandbox messages
      const handleMessage = (event: MessageEvent) => {
        console.log('ComponentSandbox: Received message:', event.data, 'from:', event.source);
        
        // Check if message has the expected structure
        if (!event.data || typeof event.data.type !== 'string') {
          console.log('ComponentSandbox: Invalid message structure, ignoring');
          return;
        }
        
        // For debugging, temporarily accept messages from any source
        // TODO: Re-enable source validation once communication is working
        const iframeWindow = (ref as any)?.current?.contentWindow;
        if (iframeWindow && event.source !== iframeWindow) {
          console.log('ComponentSandbox: Message source mismatch, but processing anyway for debugging');
          // Don't return here for now
        }
        
        console.log('ComponentSandbox: Processing message type:', event.data.type);
        
        switch (event.data.type) {
          case 'SANDBOX_READY':
            console.log('ComponentSandbox: SANDBOX_READY received, setting sandboxReady to true');
            setSandboxReady(true);
            onReady?.();
            break;
          case 'SANDBOX_ERROR':
            console.log('ComponentSandbox: SANDBOX_ERROR received:', event.data.error);
            onError(event.data.error);
            break;
          case 'COMPONENT_RENDERED':
            console.log('ComponentSandbox: Component rendered successfully:', event.data);
            break;
        }
      };
      
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [onError, onReady, ref]);
    
    // Send component to sandbox when ready and component changes
    useEffect(() => {
      console.log('ComponentSandbox: Effect triggered', {
        sandboxReady,
        hasComponent: !!component,
        componentData: component,
        hasRef: !!ref,
        refCurrent: (ref as any)?.current,
        hasContentWindow: !!(ref as any)?.current?.contentWindow
      });
      
      if (sandboxReady && component && ref && (ref as any).current) {
        // Add a small delay to ensure the sandbox is fully initialized
        const timeoutId = setTimeout(() => {
          console.log('ComponentSandbox: About to send component to iframe');
          const iframe = (ref as any).current;
          
          // Log iframe state
          console.log('ComponentSandbox: iframe element:', iframe);
          console.log('ComponentSandbox: iframe.contentWindow:', iframe?.contentWindow);
          console.log('ComponentSandbox: Component to send:', JSON.stringify(component, null, 2));
          
          if (iframe && iframe.contentWindow) {
            try {
              const message = {
                type: 'RENDER_COMPONENT',
                component: component
              };
              console.log('ComponentSandbox: Sending message:', message);
              iframe.contentWindow.postMessage(message, '*');
              console.log('ComponentSandbox: Component message sent successfully');
            } catch (err) {
              console.error('ComponentSandbox: Failed to send message to iframe:', err);
              onError('Failed to communicate with preview sandbox');
            }
          } else {
            console.error('ComponentSandbox: iframe or contentWindow not available');
            console.error('iframe:', iframe);
            console.error('contentWindow:', iframe?.contentWindow);
          }
        }, 500); // Increased delay
        
        return () => clearTimeout(timeoutId);
      } else {
        console.log('ComponentSandbox: Not ready to send - conditions not met');
      }
    }, [sandboxReady, component, ref, onError]);
    
    // Use a regular HTML file instead of data URL
    const sandboxUrl = '/ide/sandbox.html';
    
    return (
      <iframe
        ref={ref}
        className="component-sandbox"
        src={sandboxUrl}
        sandbox="allow-scripts"
        width="100%"
        height="400px"
        style={{ 
          border: '1px solid #e1e5e9', 
          borderRadius: '6px',
          background: 'white'
        }}
        title="Live Preview"
      />
    );
  }
);

ComponentSandbox.displayName = 'ComponentSandbox';

export default ComponentSandbox;
export type { ComponentBundle };