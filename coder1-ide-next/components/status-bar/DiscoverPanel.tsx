/**
 * DiscoverPanel - Simplified Task-Based Command Interface
 * 
 * Clean, professional design organized by user task intent
 * Unified search across all command categories
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  Compass, X, ChevronUp, ChevronDown, Plus, Terminal, Grid, FileText, Code, 
  Sparkles, BookOpen, Command as CommandIcon, Box, Search, GitBranch, 
  Play, TestTube, Upload, Trash2, HelpCircle, RotateCcw, Activity 
} from 'lucide-react';
import WcyganCommandsSection from '../WcyganCommandsSection';
import SandboxPanel from '../sandbox/SandboxPanel';
import { useUIStore } from '@/stores/useUIStore';
import { useTerminalCommand } from '@/contexts/TerminalCommandContext';
import { glows } from '@/lib/design-tokens';
import type { Command } from '@/types';

interface TaskCommand {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  action: string | (() => void);
  category: string;
}

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

  const { injectCommand, isTerminalReady } = useTerminalCommand();
  const { isOpen, commandInput, customCommands, showAddForm, newCommand } = discoverPanel;
  
  // Search state
  const [searchInput, setSearchInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Slash commands scrolling state
  const [slashCommandOffset, setSlashCommandOffset] = useState(0);

  // Focus search when panel opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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
          setSearchInput('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showAddForm, toggleDiscoverPanel, toggleAddCommandForm]);

  // Task-organized commands
  const taskCommands: TaskCommand[] = [
    // BUILD & TEST
    { id: 'build', name: '/build', description: 'Build the project', icon: Code, action: 'build', category: 'BUILD & TEST' },
    { id: 'test', name: '/test', description: 'Run test suite', icon: TestTube, action: 'test', category: 'BUILD & TEST' },
    { id: 'deploy', name: '/deploy', description: 'Deploy to production', icon: Upload, action: 'deploy', category: 'BUILD & TEST' },
    { id: 'clean', name: '/clean', description: 'Clean build files', icon: Trash2, action: 'clean', category: 'BUILD & TEST' },
    
    // AI & ANALYSIS  
    { id: 'analyze', name: '/analyze', description: 'Analyze codebase', icon: Sparkles, action: 'analyze', category: 'AI & ANALYSIS' },
    { id: 'requirements', name: 'Requirements', description: 'Gather project requirements', icon: BookOpen, action: () => {}, category: 'AI & ANALYSIS' },
    { id: 'templates', name: 'Templates', description: 'Access code templates', icon: FileText, action: () => {}, category: 'AI & ANALYSIS' },
    { id: 'agents', name: 'Agents', description: 'Spawn AI development team', icon: Grid, action: () => {}, category: 'AI & ANALYSIS' },
    
    // GIT & VERSION CONTROL
    { id: 'commit', name: '/commit', description: 'Create git commit', icon: GitBranch, action: 'commit', category: 'GIT & VERSION CONTROL' },
    { id: 'push', name: '/push', description: 'Push to repository', icon: Upload, action: 'push', category: 'GIT & VERSION CONTROL' },
    { id: 'pull', name: '/pull', description: 'Pull latest changes', icon: RotateCcw, action: 'pull', category: 'GIT & VERSION CONTROL' },
    
    // DEVELOPMENT
    { id: 'help', name: '/help', description: 'Show available commands', icon: HelpCircle, action: 'help', category: 'DEVELOPMENT' },
    { id: 'clear', name: '/clear', description: 'Clear terminal', icon: Terminal, action: 'clear', category: 'DEVELOPMENT' },
    { id: 'status', name: '/status', description: 'Check project status', icon: Activity, action: 'status', category: 'DEVELOPMENT' }
  ];

  // Slash commands (just the slash commands for scrolling)
  const slashCommands = taskCommands.filter(cmd => cmd.name.startsWith('/'));
  
  // Get current 3 slash commands for display
  const visibleSlashCommands = slashCommands.slice(slashCommandOffset, slashCommandOffset + 3);
  
  // Scroll slash commands
  const scrollSlashCommands = (direction: 'up' | 'down') => {
    if (direction === 'down' && slashCommandOffset + 3 < slashCommands.length) {
      setSlashCommandOffset(slashCommandOffset + 1);
    } else if (direction === 'up' && slashCommandOffset > 0) {
      setSlashCommandOffset(slashCommandOffset - 1);
    }
  };

  // Filter commands based on search
  const filteredCommands = taskCommands.filter(cmd => 
    cmd.name.toLowerCase().includes(searchInput.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchInput.toLowerCase()) ||
    cmd.category.toLowerCase().includes(searchInput.toLowerCase())
  );

  // Group commands by category
  const commandsByCategory = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, TaskCommand[]>);

  // Execute command
  const executeCommand = (command: TaskCommand) => {
    if (typeof command.action === 'string') {
      // Terminal command
      if (!isTerminalReady()) {
        addToast({
          message: 'Terminal not connected - command copied to clipboard',
          type: 'info'
        });
        try {
          navigator.clipboard?.writeText(`/${command.action}`);
        } catch (error) {
          console.debug('Clipboard failed:', error);
        }
        return;
      }

      const success = injectCommand(`/${command.action}`, {
        focusTerminal: true,
        addNewline: false,
        replace: false
      });
      
      if (success) {
        addToast({
          message: `Command /${command.action} sent to terminal`,
          type: 'success'
        });
        toggleDiscoverPanel();
        setSearchInput('');
      } else {
        addToast({
          message: `Failed to send /${command.action} to terminal`,
          type: 'error'
        });
      }
    } else {
      // Function command
      command.action();
    }
  };

  // Handle custom command save
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
      >
        <Compass className="w-4 h-4" />
        Discover
      </button>

      {/* Panel */}
      <div className={`absolute bottom-full left-0 mb-2 w-96 bg-bg-secondary border border-border-default rounded-lg shadow-xl transition-all duration-200 z-50 ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            <CommandIcon className="w-4 h-4 text-coder1-cyan" />
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

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-border-default">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search commands..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-coder1-cyan focus:ring-1 focus:ring-coder1-cyan transition-all text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* Slash Commands (Scrollable) */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-coder1-cyan uppercase tracking-wider">/slash commands</h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => scrollSlashCommands('up')}
                  disabled={slashCommandOffset === 0}
                  className="p-1 rounded hover:bg-bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp className="w-3 h-3 text-text-muted" />
                </button>
                <button
                  onClick={() => scrollSlashCommands('down')}
                  disabled={slashCommandOffset + 3 >= slashCommands.length}
                  className="p-1 rounded hover:bg-bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown className="w-3 h-3 text-text-muted" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {visibleSlashCommands.map((cmd) => {
                const IconComponent = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => executeCommand(cmd)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-text-secondary hover:text-text-primary hover:bg-bg-primary rounded-lg transition-all group"
                  >
                    <IconComponent className="w-4 h-4 text-text-muted group-hover:text-coder1-cyan transition-colors" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{cmd.name}</div>
                      <div className="text-xs text-text-muted">{cmd.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Commands */}
          {customCommands.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-coder1-cyan uppercase tracking-wider">Custom Commands</h4>
              </div>
              <div className="space-y-1">
                {customCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      if (typeof cmd.action === 'string') {
                        executeCommand({
                          id: cmd.id,
                          name: `/${cmd.name}`,
                          description: cmd.description,
                          icon: Terminal,
                          action: cmd.action,
                          category: 'CUSTOM'
                        });
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-text-secondary hover:text-text-primary hover:bg-bg-primary rounded-lg transition-all group"
                  >
                    <Terminal className="w-4 h-4 text-text-muted group-hover:text-coder1-cyan transition-colors" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">/{cmd.name}</div>
                      <div className="text-xs text-text-muted">{cmd.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Command */}
          <div className="mb-4">
            <button 
              onClick={toggleAddCommandForm}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-coder1-cyan hover:bg-bg-primary rounded-lg transition-colors border border-dashed border-border-default hover:border-coder1-cyan"
            >
              {showAddForm ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Custom Command
                </>
              )}
            </button>

            {/* Add Command Form */}
            <div className={`overflow-hidden transition-all duration-200 ${showAddForm ? 'max-h-64 mt-2' : 'max-h-0'}`}>
              <div className="p-3 bg-bg-tertiary rounded-lg border border-border-default space-y-2">
                <input
                  type="text"
                  placeholder="Command name (without /)"
                  value={newCommand.name}
                  onChange={(e) => updateNewCommand('name', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg-primary border border-border-default rounded outline-none text-text-primary placeholder-text-muted focus:border-coder1-cyan"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newCommand.description}
                  onChange={(e) => updateNewCommand('description', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg-primary border border-border-default rounded outline-none text-text-primary placeholder-text-muted focus:border-coder1-cyan"
                />
                <input
                  type="text"
                  placeholder="Action/Command"
                  value={newCommand.action}
                  onChange={(e) => updateNewCommand('action', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg-primary border border-border-default rounded outline-none text-text-primary placeholder-text-muted focus:border-coder1-cyan"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCommand}
                    disabled={!newCommand.name.trim() || !newCommand.description.trim() || !newCommand.action.trim()}
                    className="px-3 py-2 text-sm bg-coder1-cyan text-black rounded hover:bg-coder1-cyan-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelAddCommand}
                    className="px-3 py-2 text-sm bg-bg-primary border border-border-default rounded hover:bg-bg-secondary text-text-secondary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-border-default my-4"></div>

          {/* AI Tools Section */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-coder1-cyan uppercase tracking-wider mb-3">✨ AI TOOLS</h4>
            <div className="text-sm text-text-secondary leading-relaxed">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span>•</span>
                <a href="/component-studio.html" className="text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors">Component Studio</a>
                <span>•</span>
                <a href="/templates-hub.html" className="text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors">Templates Hub</a>
                <span>•</span>
                <a href="/hooks.html" className="text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors">Hooks Manager</a>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span>•</span>
                <a href="/workflow-dashboard.html" className="text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors">Workflows</a>
                <span>•</span>
                <a href="/" className="text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors">PRD Generator</a>
              </div>
            </div>
          </div>

          {/* Sandbox Section */}
          <div>
            <h4 className="text-xs font-semibold text-coder1-cyan uppercase tracking-wider mb-3">🧪 SANDBOX</h4>
            <div className="text-sm text-text-secondary space-y-1">
              <div className="flex items-center gap-2">
                <span>•</span>
                <button className="text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors">New Session</button>
                <span className="text-text-muted">Create isolated environment</span>
              </div>
              <div className="flex items-center gap-2">
                <span>•</span>
                <button className="text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors">Load Session</button>
                <span className="text-text-muted">Continue previous work</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}