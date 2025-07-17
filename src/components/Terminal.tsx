import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Play, Square, Copy, Trash2 } from 'lucide-react';
import './Terminal.css';

interface TerminalProps {
  selectedElement?: HTMLElement | null;
  elementContext?: any;
}

interface TerminalLine {
  id: number;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: number;
}

export const Terminal: React.FC<TerminalProps> = ({ selectedElement, elementContext }) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 1,
      type: 'system',
      content: 'Coder1 IDE Terminal - Ready for AI-assisted development',
      timestamp: Date.now()
    },
    {
      id: 2,
      type: 'system',
      content: 'Connected to Claude Code API',
      timestamp: Date.now()
    }
  ]);
  
  const [currentInput, setCurrentInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll to bottom when new lines are added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    // Simulate AI building process
    const buildSequence = [
      { delay: 2000, content: '$ coder1 build react-dashboard', type: 'input' as const },
      { delay: 500, content: '🤖 Coder1: Analyzing project requirements...', type: 'output' as const },
      { delay: 1000, content: '💻 Claude Code: Initializing React project structure', type: 'output' as const },
      { delay: 800, content: '📦 Installing dependencies: react, react-dom, typescript', type: 'output' as const },
      { delay: 1200, content: '🎨 Applying Tokyo Night theme configuration', type: 'output' as const },
      { delay: 900, content: '🔧 Configuring build tools and optimization', type: 'output' as const },
      { delay: 1100, content: '📊 Generating dashboard components with chart.js', type: 'output' as const },
      { delay: 800, content: '🔒 Setting up TypeScript strict mode', type: 'output' as const },
      { delay: 1000, content: '🚀 Starting development server...', type: 'output' as const },
      { delay: 1500, content: '✅ Build complete! Server running on http://localhost:3000', type: 'output' as const },
      { delay: 500, content: '🌐 Live preview updated automatically', type: 'output' as const }
    ];

    let totalDelay = 3000;
    buildSequence.forEach(({ delay, content, type }) => {
      totalDelay += delay;
      setTimeout(() => {
        setLines(prev => [...prev, {
          id: Date.now() + Math.random(),
          type,
          content,
          timestamp: Date.now()
        }]);
      }, totalDelay);
    });
  }, []);

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsExecuting(true);
    
    // Add command to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    // Add input line
    setLines(prev => [...prev, {
      id: Date.now(),
      type: 'input',
      content: `$ ${command}`,
      timestamp: Date.now()
    }]);

    // Clear input
    setCurrentInput('');

    // Simulate command execution
    await new Promise(resolve => setTimeout(resolve, 500));

    // Process command
    const output = await processCommand(command);
    
    // Add output lines
    output.forEach((line, index) => {
      setTimeout(() => {
        setLines(prev => [...prev, {
          id: Date.now() + index,
          type: line.type,
          content: line.content,
          timestamp: Date.now()
        }]);
      }, index * 100);
    });

    setIsExecuting(false);
  };

  const processCommand = async (command: string): Promise<{type: 'output' | 'error'; content: string}[]> => {
    const cmd = command.toLowerCase().trim();
    
    // Handle /ui command for 21st.dev Magic integration
    if (cmd.startsWith('/ui')) {
      try {
        const message = command.substring(3).trim(); // Remove "/ui" prefix
        if (!message) {
          return [
            { type: 'error', content: '❌ Usage: /ui <component description>' },
            { type: 'output', content: '💡 Example: /ui create a modern button with hover effects' }
          ];
        }

        // Call the Magic API
        const response = await fetch('http://localhost:3000/api/magic/ui', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message,
            currentFile: '/src/components/GeneratedComponent.tsx',
            projectPath: '/project',
            elementContext: elementContext || undefined
          })
        });

        if (!response.ok) {
          const error = await response.json();
          return [
            { type: 'error', content: '❌ 21st.dev Magic API error: ' + (error.error || 'Unknown error') },
            { type: 'output', content: '💡 Make sure MAGIC_21ST_API_KEY is configured in .env' }
          ];
        }

        const result = await response.json();
        
        if (result.success) {
          const messages: {type: 'output' | 'error'; content: string}[] = [];
          
          if (result.fallback_mode) {
            messages.push(
              { type: 'output', content: '🔄 21st.dev Magic unavailable - using fallback generator...' },
              { type: 'output', content: `✨ Fallback component created: ${result.ui_command.search_query}` },
              { type: 'output', content: '📁 Basic component code generated' },
              { type: 'output', content: '💡 For advanced components, configure MAGIC_21ST_API_KEY in .env' }
            );
          } else {
            messages.push(
              { type: 'output', content: '🎨 21st.dev Magic: Generating UI component...' },
              { type: 'output', content: `✨ Component created: ${result.ui_command.search_query}` },
              { type: 'output', content: '📁 Component code generated and ready to use' }
            );
            
            // Check if we have variants to show
            if (result.variants && result.variants.length > 1) {
              messages.push(
                { type: 'output', content: `🎯 Generated ${result.variants.length} variants - Choose your favorite!` },
                { type: 'output', content: '👀 Component selector will appear on the right →' }
              );
              
              // Trigger the component display with variants
              setTimeout(() => {
                const event = new CustomEvent('magic-ui-generated', {
                  detail: {
                    component: result.component,
                    variants: result.variants
                  }
                });
                window.dispatchEvent(event);
              }, 500);
            } else {
              messages.push(
                { type: 'output', content: '💻 Check the Live Preview to see your component!' }
              );
            }
          }
          
          // Show generated code snippet (first 3 lines)
          if (result.component && result.component.code) {
            const codeLines = result.component.code.split('\n').slice(0, 3);
            messages.push(
              { type: 'output', content: '📄 Generated code preview:' },
              { type: 'output', content: '   ' + codeLines[0] },
              { type: 'output', content: '   ' + codeLines[1] },
              { type: 'output', content: '   ' + (codeLines[2] || '...') }
            );
          }
          
          return messages;
        } else {
          return [
            { type: 'error', content: '❌ Failed to generate component: ' + (result.error || 'Unknown error') }
          ];
        }
      } catch (error) {
        return [
          { type: 'error', content: '❌ Network error: ' + (error as Error).message },
          { type: 'output', content: '💡 Make sure the server is running on localhost:3000' }
        ];
      }
    }
    
    if (cmd.startsWith('coder1')) {
      return [
        { type: 'output', content: '🤖 Coder1: Processing AI-assisted command...' },
        { type: 'output', content: '💻 Claude Code: Executing with real-time feedback' },
        { type: 'output', content: '✅ Command completed successfully' }
      ];
    }
    
    if (cmd === 'ls' || cmd === 'dir') {
      return [
        { type: 'output', content: 'src/' },
        { type: 'output', content: 'public/' },
        { type: 'output', content: 'package.json' },
        { type: 'output', content: 'tsconfig.json' },
        { type: 'output', content: 'README.md' }
      ];
    }
    
    if (cmd === 'pwd') {
      return [{ type: 'output', content: '/Users/dev/react-dashboard' }];
    }
    
    if (cmd.startsWith('npm')) {
      return [
        { type: 'output', content: '📦 Running npm command...' },
        { type: 'output', content: '🔄 Installing packages...' },
        { type: 'output', content: '✅ npm command completed' }
      ];
    }
    
    if (cmd === 'help') {
      return [
        { type: 'output', content: '🤖 Coder1 IDE Terminal Commands:' },
        { type: 'output', content: '  /ui <description> - Generate React components with 21st.dev Magic' },
        { type: 'output', content: '  coder1 build <project> - Build project with AI assistance' },
        { type: 'output', content: '  coder1 deploy - Deploy project automatically' },
        { type: 'output', content: '  coder1 analyze - Analyze code quality' },
        { type: 'output', content: '  ls, dir - List directory contents' },
        { type: 'output', content: '  pwd - Show current directory' },
        { type: 'output', content: '  clear - Clear terminal' },
        { type: 'output', content: '  help - Show this help message' },
        { type: 'output', content: '' },
        { type: 'output', content: '✨ 21st.dev Magic Examples:' },
        { type: 'output', content: '  /ui create a modern button with hover effects' },
        { type: 'output', content: '  /ui build a responsive navigation bar' },
        { type: 'output', content: '  /ui make a card component with shadow' }
      ];
    }
    
    if (cmd === 'clear') {
      setLines([]);
      return [];
    }
    
    return [{ type: 'error', content: `Command not found: ${command}` }];
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(currentInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentInput('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[newIndex]);
        }
      }
    }
  };

  const clearTerminal = () => {
    setLines([]);
  };

  const copyOutput = () => {
    const text = lines.map(line => line.content).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="terminal">
      <div className="terminal-header">
        <div className="header-left">
          <TerminalIcon size={16} />
          <span className="header-title">Terminal</span>
          <span className="header-subtitle">Coder1 AI Integration</span>
        </div>
        
        <div className="header-actions">
          <button className="action-btn" onClick={copyOutput} title="Copy Output">
            <Copy size={14} />
          </button>
          <button className="action-btn" onClick={clearTerminal} title="Clear Terminal">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="terminal-content" ref={terminalRef}>
        <div className="terminal-lines">
          {lines.map(line => (
            <div key={line.id} className={`terminal-line ${line.type}`}>
              {line.type === 'input' && (
                <span className="terminal-prompt">➜</span>
              )}
              {line.type === 'system' && (
                <span className="terminal-prompt">🤖</span>
              )}
              <span className="terminal-text">{line.content}</span>
            </div>
          ))}
          
          {isExecuting && (
            <div className="terminal-line loading">
              <span className="terminal-prompt">⚡</span>
              <span className="terminal-text">Executing...</span>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>

        <div className="terminal-input-line">
          {selectedElement && elementContext ? (
            <span className="terminal-prompt element-selected" title={`Selected: ${elementContext.tagName}.${elementContext.className}`}>
              🎯
            </span>
          ) : (
            <span className="terminal-prompt">➜</span>
          )}
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedElement ? `[${elementContext?.tagName || 'Element'} Selected] Enter /ui command...` : "Enter command..."}
            disabled={isExecuting}
          />
        </div>
      </div>

      <div className="terminal-status">
        <div className="status-left">
          <span className="status-indicator">●</span>
          <span className="status-text">Connected to Coder1</span>
        </div>
        <div className="status-right">
          <span className="status-text">Lines: {lines.length}</span>
        </div>
      </div>
    </div>
  );
};