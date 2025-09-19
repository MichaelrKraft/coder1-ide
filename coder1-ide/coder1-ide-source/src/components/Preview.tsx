import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { ErrorBoundary, PreviewError, PlaceholderContent } from './ErrorBoundary';
import ComponentSandbox, { ComponentBundle } from './ComponentSandbox';
import CodebaseWiki from './CodebaseWiki';
import { analyzeReactComponent, wrapCodeForPreview, detectCodeType } from '../utils/codeAnalysis';
import './Preview.css';

interface ConsoleMessage {
  type: string;
  message: string;
  timestamp: number;
}

interface PreviewProps {
  code?: string;
  fileName?: string | null;
  history?: Array<{code: string, timestamp: number}>;
  consoleOutput?: ConsoleMessage[];
  onConsoleOutput?: (output: ConsoleMessage) => void;
  onClearConsole?: () => void;
}

const Preview: React.FC<PreviewProps> = memo(({ 
  code = '', 
  fileName = null,
  history = [],
  consoleOutput = [],
  onConsoleOutput,
  onClearConsole
}) => {
  const [showConsole, setShowConsole] = useState(true);
  const [showProps, setShowProps] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showWiki, setShowWiki] = useState(false);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [currentProps, setCurrentProps] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [isEditable, setIsEditable] = useState(false);
  const [editableCode, setEditableCode] = useState<string>('');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Analyze the code for React components
  const componentInfo = useMemo(() => {
    if (code && (fileName?.endsWith('.jsx') || fileName?.endsWith('.tsx') || fileName?.endsWith('.js'))) {
      const info = analyzeReactComponent(code);
      console.log('Preview: componentInfo analysis result:', info);
      console.log('Preview: Detected props:', info?.props || 'none');
      console.log('Preview: Props count:', info?.props?.length || 0);
      return info;
    }
    console.log('Preview: No componentInfo - code:', !!code, 'fileName:', fileName);
    return null;
  }, [code, fileName]);

  // Determine code type
  const codeType = useMemo(() => detectCodeType(code), [code]);

  // Auto-scroll console to bottom
  useEffect(() => {
    if (showConsole && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleOutput, showConsole]);

  // Debug effect to ensure React is running (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔥 Preview component mounted and React is working!');
      console.log('🔥 Initial state - showConsole:', showConsole, 'showProps:', showProps, 'showTimeline:', showTimeline);
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔥 Preview component unmounting');
      }
    };
  }, []);

  // Create component bundle for sandbox
  const currentComponent: ComponentBundle | null = useMemo(() => {
    const displayCode = selectedHistoryIndex !== null && history[selectedHistoryIndex] 
      ? history[selectedHistoryIndex].code 
      : code;

    if (!displayCode) return null;

    const wrappedCode = wrapCodeForPreview(displayCode, componentInfo);

    return {
      id: `preview-${Date.now()}`,
      name: componentInfo?.name || fileName?.replace(/\.[^.]+$/, '') || 'Component',
      code: wrappedCode,
      props: currentProps,
      dependencies: componentInfo?.imports || [],
      generatedAt: Date.now()
    };
  }, [code, selectedHistoryIndex, history, currentProps, componentInfo, fileName]);
  
  // Memoized console clear handler
  const handleClearConsole = useCallback(() => {
    if (onClearConsole) {
      onClearConsole();
    }
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'CLEAR_CONSOLE'
      }, '*');
    }
  }, [onClearConsole]);
  
  // Memoized toggle handlers
  const toggleConsole = useCallback(() => setShowConsole(prev => !prev), []);
  const toggleProps = useCallback(() => setShowProps(prev => !prev), []);
  const toggleTimeline = useCallback(() => setShowTimeline(prev => !prev), []);

  // Memoized message handler for performance
  const handleSandboxMessage = useCallback((event: MessageEvent) => {
    if (event.data.type === 'CONSOLE_OUTPUT' && onConsoleOutput) {
      onConsoleOutput(event.data.data);
    }
  }, [onConsoleOutput]);
  
  // Handle console messages from sandbox
  useEffect(() => {
    window.addEventListener('message', handleSandboxMessage);
    return () => window.removeEventListener('message', handleSandboxMessage);
  }, [handleSandboxMessage]);

  // Update props in sandbox - memoized for performance
  const updateProps = useCallback((prop: string, value: any) => {
    const newProps = { ...currentProps, [prop]: value };
    setCurrentProps(newProps);
    
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_PROPS',
        props: newProps
      }, '*');
    }
  }, [currentProps]);

  // Time travel to specific version - memoized
  const timeTravel = useCallback((index: number) => {
    setSelectedHistoryIndex(index);
  }, []);


  // Clear preview
  const handleClearPreview = () => {
    // Clear by calling parent's state setter if available
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'CLEAR_PREVIEW' }, '*');
    }
    // Also clear local state
    setEditableCode('');
    setError(null);
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    const codeToCopy = isEditable ? editableCode : (selectedHistoryIndex !== null && history[selectedHistoryIndex] 
      ? history[selectedHistoryIndex].code 
      : code);
    
    try {
      await navigator.clipboard.writeText(codeToCopy);
      // Show toast or visual feedback
      console.log('Code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Toggle edit mode
  const handleToggleEdit = () => {
    if (!isEditable) {
      // Entering edit mode - copy current code to editable
      setEditableCode(selectedHistoryIndex !== null && history[selectedHistoryIndex] 
        ? history[selectedHistoryIndex].code 
        : code);
    }
    setIsEditable(!isEditable);
  };

  if (!code) {
    return (
      <div className="preview">
        <div className="preview-header">
          <h3>Live Preview</h3>
        </div>
        <div className="preview-content">
          <PlaceholderContent />
        </div>
      </div>
    );
  }

  return (
    <div className="preview">
      <div className="preview-header">
        <h3>Live Preview {fileName && `- ${fileName}`}</h3>
        <div className="preview-controls">
          <button 
            className="preview-control-btn"
            onClick={handleClearPreview}
            title="Clear Preview"
          >
            🗑️
          </button>
          <button 
            className="preview-control-btn"
            onClick={handleCopyCode}
            title="Copy Code"
          >
            📋
          </button>
          <button 
            className={`preview-control-btn ${isEditable ? 'active' : ''}`}
            onClick={handleToggleEdit}
            title="Edit Mode"
          >
            ✏️
          </button>
          <button 
            className={`preview-control-btn ${showConsole ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Preview: Console button clicked, showConsole:', showConsole);
              setShowConsole(!showConsole);
            }}
            onMouseDown={(e) => {
              console.log('Preview: Console button mouse down');
              e.preventDefault();
            }}
            style={{ zIndex: 100, position: 'relative' }}
            title="Toggle Console"
          >
            🖥️
          </button>
          {componentInfo ? (
            <button 
              className={`preview-control-btn ${showProps ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Preview: Props button clicked, showProps:', showProps);
                console.log('Preview: componentInfo:', componentInfo);
                console.log('Preview: componentInfo.props.length:', componentInfo?.props?.length);
                console.log('Preview: Will show Props UI?', !showProps && componentInfo && componentInfo.props.length > 0);
                setShowProps(!showProps);
              }}
              style={{ zIndex: 100, position: 'relative' }}
              title="Props Playground"
            >
              🎛️
            </button>
          ) : (
            <button 
              className="preview-control-btn"
              disabled
              style={{ zIndex: 100, position: 'relative' }}
              title="Props Playground (No React component detected)"
            >
              🎛️
            </button>
          )}
          {history.length > 0 ? (
            <button 
              className={`preview-control-btn ${showTimeline ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Preview: Timeline button clicked, showTimeline:', showTimeline);
                setShowTimeline(!showTimeline);
              }}
              style={{ zIndex: 100, position: 'relative' }}
              title="Time Travel"
            >
              ⏰
            </button>
          ) : (
            <button 
              className="preview-control-btn"
              disabled
              style={{ zIndex: 100, position: 'relative' }}
              title="Time Travel (No history available)"
            >
              ⏰
            </button>
          )}
          <button 
            className={`preview-control-btn ${showWiki ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Preview: Wiki button clicked, showWiki:', showWiki);
              setShowWiki(!showWiki);
            }}
            style={{ zIndex: 100, position: 'relative' }}
            title="Codebase Wiki"
          >
            📚
          </button>
        </div>
      </div>
      
      <div className="preview-content">
        <ErrorBoundary fallback={<PreviewError />}>
          {/* Time Travel Timeline */}
          {showTimeline && history.length > 0 && (
            <div className="preview-timeline">
              <div className="timeline-header">
                <h4>Time Travel Debugging</h4>
                <button onClick={() => setSelectedHistoryIndex(null)}>Current</button>
              </div>
              <div className="timeline-items">
                {history.map((item, index) => (
                  <div 
                    key={index}
                    className={`timeline-item ${selectedHistoryIndex === index ? 'selected' : ''}`}
                    onClick={() => timeTravel(index)}
                  >
                    <span className="timeline-time">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="timeline-preview">
                      {item.code.substring(0, 50)}...
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Props Playground */}
          {showProps && componentInfo && componentInfo.props.length > 0 && (
            <div className="preview-props">
              <h4>Props Playground</h4>
              {componentInfo.props.map(prop => (
                <div key={prop.name} className="prop-control">
                  <label>{prop.name}</label>
                  <input
                    type={prop.type === 'boolean' ? 'checkbox' : 'text'}
                    defaultValue={prop.defaultValue}
                    onChange={(e) => {
                      const value = e.target.type === 'checkbox' 
                        ? e.target.checked 
                        : e.target.value;
                      updateProps(prop.name, value);
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Main Preview */}
          <div className="preview-iframe-container">
            <ComponentSandbox
              ref={iframeRef}
              component={currentComponent}
              onError={setError}
            />
          </div>

          {/* Console Output */}
          {showConsole && (
            <div className="preview-console">
              <div className="console-header">
                <span>Console Output</span>
                <button onClick={handleClearConsole}>Clear</button>
              </div>
              <div className="console-messages">
                {consoleOutput.length === 0 ? (
                  <div className="console-empty">Console output will appear here...</div>
                ) : (
                  consoleOutput.map((msg, index) => (
                    <div key={index} className={`console-message console-${msg.type}`}>
                      <span className="console-type">[{msg.type}]</span>
                      <span className="console-text">{msg.message}</span>
                    </div>
                  ))
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>
          )}

          {/* Codebase Wiki */}
          {showWiki && (
            <div className="preview-wiki">
              <CodebaseWiki />
            </div>
          )}

          {error && <PreviewError error={error} />}
        </ErrorBoundary>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  return (
    prevProps.code === nextProps.code &&
    prevProps.fileName === nextProps.fileName &&
    prevProps.history?.length === nextProps.history?.length &&
    prevProps.consoleOutput?.length === nextProps.consoleOutput?.length
  );
});

export default Preview;