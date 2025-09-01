'use client';

import React, { useState, useEffect } from 'react';
import { Compass, ChevronUp, ChevronDown, Grid, FileText, Code, Sparkles, Terminal, Plus } from 'lucide-react';

export default function DiscoverSection() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [commandInput, setCommandInput] = useState('');
  const [showCommandInput, setShowCommandInput] = useState(false);
  const [customCommands, setCustomCommands] = useState<Array<{id: string, name: string, description: string, action: string}>>([]);

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
    const name = prompt('Command name (without /):')?. trim();
    const description = prompt('Description:')?. trim();
    const action = prompt('Action/Command:')?. trim();
    
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

  // Always render the component with a minimum height
  return (
    <div className="border-t border-border-default bg-bg-secondary" style={{ minHeight: '40px' }}>
      {/* Discover Header - Always Visible */}
      <div 
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-bg-tertiary transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ minHeight: '40px' }}
      >
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-coder1-cyan" />
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Discover
          </h3>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-text-muted" />
        ) : (
          <ChevronUp className="w-3 h-3 text-text-muted" />
        )}
      </div>
      
      {/* Discover Content - Only shown when expanded */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Menu Items */}
          <div className="space-y-1">
            <a href="http://localhost:3000/component-studio.html" className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors">
              <Grid className="w-3 h-3" />
              <span>Components</span>
            </a>
            
            <a href="http://localhost:3000/templates-hub.html" className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors">
              <FileText className="w-3 h-3" />
              <span>Templates</span>
            </a>
            
            <a href="http://localhost:3000/hooks" className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors">
              <Code className="w-3 h-3" />
              <span>Hooks</span>
            </a>
            
            <a href="http://localhost:3000/workflow-dashboard.html" className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors">
              <Sparkles className="w-3 h-3 text-green-400" />
              <span>Workflows</span>
            </a>
          </div>

          {/* Commands Section */}
          <div className="pt-2 border-t border-border-default">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-text-muted">Commands</h4>
              <button 
                onClick={addCustomCommand}
                className="text-xs text-coder1-cyan hover:text-coder1-cyan-light transition-colors flex items-center gap-1"
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
      )}
    </div>
  );
}