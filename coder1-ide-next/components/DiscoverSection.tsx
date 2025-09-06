'use client';

import React, { useState, useEffect } from 'react';
import { Compass, ChevronUp, ChevronDown, Grid, FileText, Code, Sparkles, Terminal, Plus } from 'lucide-react';

export default function DiscoverSection() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [commandInput, setCommandInput] = useState('');
  const [showCommandInput, setShowCommandInput] = useState(false);
  const [customCommands, setCustomCommands] = useState<Array<{id: string, name: string, description: string, action: string}>>([]);

  // Debug function to reset panel state
  const resetPanel = () => {
    setIsExpanded(true);
    console.log('Discover panel reset to expanded state');
  };

  // Handle panel toggle with debugging
  const handleToggle = () => {
    console.log('Discover panel toggle:', isExpanded ? 'collapsing' : 'expanding');
    setIsExpanded(prev => !prev);
  };

  // Add keyboard shortcut to restore panel (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        resetPanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load custom commands from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('coder1-custom-commands');
    if (saved) {
      setCustomCommands(JSON.parse(saved));
    }
  }, []);

  // Save commands to localStorage
  const saveCommands = (commands: Array<{id: string, name: string, description: string, action: string}>) => {
    localStorage.setItem('coder1-custom-commands', JSON.stringify(commands));
    setCustomCommands(commands);
  };

  const addCustomCommand = () => {
    const name = prompt('Command name (without /):')?.trim();
    const description = prompt('Description:')?.trim();
    const action = prompt('Action/Command:')?.trim();
    
    if (name && description && action) {
      const newCommand = {
        id: Date.now().toString(),
        name,
        description,
        action
      };
      saveCommands([...customCommands, newCommand]);
    }
  };

  const executeSlashCommand = (command: string) => {
    // Send command to terminal or Claude Code
    console.log('Executing command:', command);
    // This would integrate with the Terminal component
  };

  // Always render the component - container should never disappear
  return (
    <div 
      className="border-t border-border-default bg-bg-secondary"
      style={{ 
        minHeight: '40px',
        position: 'relative',
        zIndex: 10
      }}
    >
      {/* Discover Header - ALWAYS VISIBLE NO MATTER WHAT */}
      <div 
        className="px-3 flex items-center justify-between cursor-pointer hover:bg-bg-tertiary transition-colors select-none"
        onClick={handleToggle}
        onDoubleClick={resetPanel}
        title={isExpanded ? "Click to collapse" : "Click to expand (or Ctrl+Shift+D to force restore)"}
        style={{
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box'
        }}
      >
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-coder1-cyan" />
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Discover
          </h3>
          {!isExpanded && (
            <span className="text-xs text-text-muted bg-red-500">(collapsed)</span>
          )}
        </div>
        <div className="flex items-center">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted hover:text-text-primary transition-colors" />
          ) : (
            <ChevronUp className="w-4 h-4 text-text-muted hover:text-text-primary transition-colors" />
          )}
        </div>
      </div>
      
      {/* Discover Content - Collapsible wrapper */}
      <div 
        style={{
          maxHeight: isExpanded ? '400px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-in-out'
        }}
        data-expanded={isExpanded}
      >
        <div className="px-3 pb-3 space-y-3">
          {/* Menu Items */}
          <div className="space-y-1">
            <a href="/component-studio.html" className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors">
              <Grid className="w-3 h-3" />
              <span>Components</span>
            </a>
            
            <a href="/templates-hub.html" className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors">
              <FileText className="w-3 h-3" />
              <span>Templates</span>
            </a>
            
            <a href="/hooks" className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors">
              <Code className="w-3 h-3" />
              <span>Hooks</span>
            </a>
            
            <a href="/workflow-dashboard.html" className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors">
              <Sparkles className="w-3 h-3 text-coder1-cyan" />
              <span>Workflows</span>
            </a>
          </div>

          {/* Commands Section */}
          <div className="pt-2 border-t border-border-default">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-text-muted">Commands</h4>
              <button 
                onClick={addCustomCommand}
                className="text-xs text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            
            {/* Slash Command Input */}
            <div className="relative mb-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-bg-tertiary rounded text-xs">
                <Terminal className="w-3 h-3 text-text-muted" />
                <span className="text-text-muted">/</span>
                <input 
                  type="text" 
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commandInput.trim()) {
                      executeSlashCommand(commandInput);
                      setCommandInput('');
                    }
                  }}
                  placeholder="type command..."
                  className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder-text-muted"
                />
              </div>
            </div>
            
            {/* Built-in Commands */}
            <div className="space-y-1">
              <button 
                onClick={() => executeSlashCommand('help')}
                className="w-full text-left px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
              >
                /help - Show available commands
              </button>
              <button 
                onClick={() => executeSlashCommand('clear')}
                className="w-full text-left px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
              >
                /clear - Clear terminal
              </button>
              <button 
                onClick={() => executeSlashCommand('build')}
                className="w-full text-left px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
              >
                /build - Run build command
              </button>
            </div>
            
            {/* Custom Commands */}
            {customCommands.length > 0 && (
              <div className="space-y-1 mt-2 pt-2 border-t border-border-default">
                {customCommands.map((cmd) => (
                  <button 
                    key={cmd.id}
                    onClick={() => executeSlashCommand(cmd.action)}
                    className="w-full text-left px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
                    title={cmd.description}
                  >
                    /{cmd.name} - {cmd.description}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent Projects */}
          <div className="pt-2 border-t border-border-default">
            <h4 className="text-xs font-semibold text-text-muted mb-1">Recent</h4>
            <div className="space-y-1">
              <button className="w-full text-left px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors truncate">
                Next.js Dashboard
              </button>
              <button className="w-full text-left px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors truncate">
                React Components
              </button>
              <button className="w-full text-left px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors truncate">
                Express API
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}