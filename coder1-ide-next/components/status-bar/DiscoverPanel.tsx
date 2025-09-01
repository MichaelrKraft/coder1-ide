/**
 * DiscoverPanel - Discover Panel and Button Component
 * 
 * Handles the Discover button and slide-up panel functionality
 * Extracted from the original StatusBar for better separation
 */

'use client';

import React, { useEffect } from 'react';
import { Compass, X, ChevronUp, ChevronDown, Plus, Terminal, Grid, FileText, Code, Sparkles } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { glows } from '@/lib/design-tokens';
import type { Command } from '@/types';

export default function DiscoverPanel() {
  const {
    discoverPanel,
    toggleDiscoverPanel,
    setCommandInput,
    addCustomCommand,
    toggleAddCommandForm,
    updateNewCommand,
    clearNewCommand,
    addToast
  } = useUIStore();

  const { isOpen, commandInput, customCommands, showAddForm, newCommand } = discoverPanel;

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleDiscoverPanel();
      }
      if (e.key === 'Escape') {
        if (showAddForm) {
          toggleAddCommandForm();
        } else if (isOpen) {
          toggleDiscoverPanel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showAddForm, toggleDiscoverPanel, toggleAddCommandForm]);

  // Execute slash command
  const executeSlashCommand = (command: string) => {
    console.log('Executing command:', command);
    addToast({
      message: `Executing: /${command}`,
      type: 'info'
    });
    // This would integrate with the Terminal component
  };

  // Save new custom command
  const handleSaveCommand = () => {
    const name = newCommand.name.trim();
    const description = newCommand.description.trim();
    const action = newCommand.action.trim();
    
    if (name && description && action) {
      const command: Command = {
        id: Date.now().toString(),
        name,
        description,
        action
      };
      
      addCustomCommand(command);
      
      // Save to localStorage
      const existingCommands = JSON.parse(localStorage.getItem('coder1-custom-commands') || '[]');
      localStorage.setItem('coder1-custom-commands', JSON.stringify([...existingCommands, command]));
      
      clearNewCommand();
      toggleAddCommandForm();
      
      addToast({
        message: `✅ Command "/${name}" added successfully`,
        type: 'success'
      });
    }
  };

  // Handle cancel add command
  const handleCancelAddCommand = () => {
    clearNewCommand();
    toggleAddCommandForm();
  };

  return (
    <>
      {/* Discover Button */}
      <button
        onClick={toggleDiscoverPanel}
        className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-text-secondary hover:text-text-primary rounded transition-all duration-200"
        style={{
          border: '1px solid #00D9FF',
          backgroundColor: isOpen ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#FB923C';
          e.currentTarget.style.boxShadow = glows.orange.soft;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#00D9FF';
          e.currentTarget.style.boxShadow = 'none';
        }}
        title="Open Discover Panel (Ctrl+Shift+D)"
      >
        <Compass className="w-4 h-4 text-coder1-cyan" />
        <span>Discover</span>
        {isOpen ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronUp className="w-3 h-3" />
        )}
      </button>

      {/* Discover Slide-Up Panel */}
      <div 
        className={`fixed bottom-0 left-0 bg-bg-secondary border-r border-t border-border-default rounded-tr-lg transition-all duration-300 ease-in-out z-40 shadow-xl ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ width: '600px', height: '320px' }}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-coder1-cyan" />
            <h3 className="text-sm font-semibold text-text-primary">Discover</h3>
            <span className="text-xs text-text-muted px-1.5 py-0.5 bg-bg-tertiary rounded">Ctrl+Shift+D</span>
          </div>
          <button
            onClick={toggleDiscoverPanel}
            className="p-1 hover:bg-bg-primary rounded transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex h-full overflow-hidden">
          {/* Commands Section */}
          <div className="flex-1 p-3 border-r border-border-default">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-coder1-cyan uppercase tracking-wider">Commands</h4>
              <button 
                onClick={toggleAddCommandForm}
                className="text-xs text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors flex items-center gap-1"
              >
                {showAddForm ? (
                  <>
                    <X className="w-3 h-3" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    Add
                  </>
                )}
              </button>
            </div>

            {/* Add Command Form */}
            <div className={`overflow-hidden transition-all duration-200 ${showAddForm ? 'max-h-56 mb-2' : 'max-h-0'}`}>
              <div className="p-2 bg-bg-tertiary rounded border border-border-default space-y-2">
                <input
                  type="text"
                  placeholder="Command name (without /)"
                  value={newCommand.name}
                  onChange={(e) => updateNewCommand('name', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('command-desc-input')?.focus();
                    }
                  }}
                  className="w-full px-2 py-1 text-xs bg-bg-primary border border-border-default rounded outline-none text-text-primary placeholder-text-muted focus:border-coder1-cyan"
                  autoFocus
                />
                <input
                  id="command-desc-input"
                  type="text"
                  placeholder="Description"
                  value={newCommand.description}
                  onChange={(e) => updateNewCommand('description', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('command-action-input')?.focus();
                    }
                  }}
                  className="w-full px-2 py-1 text-xs bg-bg-primary border border-border-default rounded outline-none text-text-primary placeholder-text-muted focus:border-coder1-cyan"
                />
                <input
                  id="command-action-input"
                  type="text"
                  placeholder="Action/Command"
                  value={newCommand.action}
                  onChange={(e) => updateNewCommand('action', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveCommand();
                    }
                  }}
                  className="w-full px-2 py-1 text-xs bg-bg-primary border border-border-default rounded outline-none text-text-primary placeholder-text-muted focus:border-coder1-cyan"
                />
                <div className="flex gap-1">
                  <button
                    onClick={handleSaveCommand}
                    disabled={!newCommand.name.trim() || !newCommand.description.trim() || !newCommand.action.trim()}
                    className="px-2 py-1 text-xs bg-coder1-cyan text-black rounded hover:bg-coder1-cyan-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelAddCommand}
                    className="px-2 py-1 text-xs bg-bg-primary border border-border-default rounded hover:bg-bg-secondary text-text-secondary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
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
            <div className="space-y-0.5">
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
              <div className="space-y-0.5 mt-2 pt-2 border-t border-border-default">
                {customCommands.map((cmd) => (
                  <button 
                    key={cmd.id}
                    onClick={() => {
                      if (typeof cmd.action === 'string') {
                        executeSlashCommand(cmd.action);
                      } else {
                        cmd.action(); // Execute the function directly
                      }
                    }}
                    className="w-full text-left px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
                    title={cmd.description}
                  >
                    /{cmd.name} - {cmd.description}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Tools Section */}
          <div className="flex-1 p-3">
            <h4 className="text-xs font-semibold text-coder1-cyan mb-2 uppercase tracking-wider">AI Tools</h4>
            <div className="grid grid-cols-2 gap-2">
              <a 
                href="http://localhost:3000/component-studio.html" 
                className="flex items-center gap-2 p-2 rounded border border-border-default hover:border-coder1-cyan hover:bg-bg-tertiary transition-all group"
              >
                <Grid className="w-4 h-4 text-text-muted group-hover:text-coder1-cyan" />
                <span className="text-xs text-text-secondary group-hover:text-text-primary">Components</span>
              </a>
              
              <a 
                href="http://localhost:3000/templates-hub.html" 
                className="flex items-center gap-2 p-2 rounded border border-border-default hover:border-coder1-cyan hover:bg-bg-tertiary transition-all group"
              >
                <FileText className="w-4 h-4 text-text-muted group-hover:text-coder1-cyan" />
                <span className="text-xs text-text-secondary group-hover:text-text-primary">Templates</span>
              </a>
              
              <a 
                href="http://localhost:3000/hooks" 
                className="flex items-center gap-2 p-2 rounded border border-border-default hover:border-coder1-cyan hover:bg-bg-tertiary transition-all group"
              >
                <Code className="w-4 h-4 text-text-muted group-hover:text-coder1-cyan" />
                <span className="text-xs text-text-secondary group-hover:text-text-primary">Hooks</span>
              </a>
              
              <a 
                href="http://localhost:3000/workflow-dashboard.html" 
                className="flex items-center gap-2 p-2 rounded border border-border-default hover:border-coder1-cyan hover:bg-bg-tertiary transition-all group"
              >
                <Sparkles className="w-4 h-4 text-green-400 group-hover:text-green-300" />
                <span className="text-xs text-text-secondary group-hover:text-text-primary">Workflows</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}