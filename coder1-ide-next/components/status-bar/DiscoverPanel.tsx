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
  Play, TestTube, Upload, Trash2, HelpCircle, RotateCcw, Activity,
  Wrench, Palette, Bug, MessageSquare, Zap, ClipboardList, FileSearch,
  Database, FolderOpen, Users, Calculator, ListTodo, Hash,
  Shield, Rocket, Monitor, Server
} from 'lucide-react';
import WcyganCommandsSection from '../WcyganCommandsSection';
import { useUIStore } from '@/stores/useUIStore';
import { useTerminalCommand } from '@/contexts/TerminalCommandContext';
import { glows } from '@/lib/design-tokens';
import { wcyganCommandManager, type WcyganCommand } from '@/lib/wcygan-commands';
import { logger } from '@/lib/logger';
import type { Command } from '@/types';
import { useSession } from '@/contexts/SessionContext';
import EnhancedSessionCreationModal from '@/components/session/EnhancedSessionCreationModal';

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
    setDiscoverPanelOpen,
    setCommandInput,
    addCustomCommand,
    toggleAddCommandForm,
    updateNewCommand,
    clearNewCommand,
    addToast
  } = useUIStore();

  const { injectCommand, isTerminalReady } = useTerminalCommand();
  const { createEnhancedSession } = useSession();
  const { isOpen, commandInput, customCommands, showAddForm, newCommand } = discoverPanel;
  
  // Search state
  const [searchInput, setSearchInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Slash commands scrolling state
  const [slashCommandOffset, setSlashCommandOffset] = useState(0);
  
  // Wcygan commands state
  const [wcyganCommands, setWcyganCommands] = useState<WcyganCommand[]>([]);
  const [isLoadingWcygan, setIsLoadingWcygan] = useState(false);
  
  
  // Enhanced session creation modal state
  const [showEnhancedSessionModal, setShowEnhancedSessionModal] = useState<boolean>(false);
  
  // Debug: Track modal state changes
  useEffect(() => {
    console.log('🔍 Debug: showEnhancedSessionModal changed to:', showEnhancedSessionModal);
  }, [showEnhancedSessionModal]);
  
  // Helper function: Get icon for wcygan category
  const getIconForCategory = (category: string) => {
    const iconMap: Record<string, any> = {
      'debugging': Bug,
      'documentation': FileText,
      'planning': ClipboardList,
      'quality': Sparkles,
      'refactoring': Wrench,
      'testing': TestTube,
      'optimization': Zap,
      'security': Shield,
      'deployment': Rocket,
      'architecture': Box,
      'database': Database,
      'frontend': Monitor,
      'backend': Server,
      'devops': GitBranch,
      'general': Code
    };
    return iconMap[category] || Code;
  };
  
  // Helper function: Map wcygan category to TaskCommand category
  const mapWcyganCategory = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'debugging': 'CODE ANALYSIS & DEBUGGING',
      'documentation': 'PROJECT MANAGEMENT',
      'planning': 'PROJECT MANAGEMENT',
      'quality': 'QUALITY ASSURANCE',
      'refactoring': 'QUALITY ASSURANCE',
      'testing': 'BUILD & TEST',
      'optimization': 'QUALITY ASSURANCE',
      'security': 'QUALITY ASSURANCE',
      'deployment': 'BUILD & TEST',
      'architecture': 'FEATURE IMPLEMENTATION',
      'database': 'FEATURE IMPLEMENTATION',
      'frontend': 'FEATURE IMPLEMENTATION',
      'backend': 'FEATURE IMPLEMENTATION',
      'devops': 'BUILD & TEST',
      'general': 'DEVELOPMENT'
    };
    return categoryMap[category] || 'DEVELOPMENT';
  };

  // Focus search when panel opens and load wcygan commands
  useEffect(() => {
    if (isOpen) {
      if (searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
      
      // Load wcygan commands if not already loaded
      if (wcyganCommands.length === 0 && !isLoadingWcygan) {
        loadWcyganCommands();
      }
    }
  }, [isOpen]);
  
  // Load wcygan commands
  const loadWcyganCommands = async () => {
    try {
      setIsLoadingWcygan(true);
      await wcyganCommandManager.initialize();
      const commands = wcyganCommandManager.getCommands();
      setWcyganCommands(commands);
      logger.debug(`[DiscoverPanel] Loaded ${commands.length} wcygan commands`);
    } catch (error) {
      logger.error('[DiscoverPanel] Failed to load wcygan commands:', error);
    } finally {
      setIsLoadingWcygan(false);
    }
  };


  // Handle tour events
  useEffect(() => {
    const handleOpenDiscoverPanel = () => {
      if (!isOpen) {
        toggleDiscoverPanel();
      }
    };
    
    const handleCloseDiscoverPanel = () => {
      console.log('[DiscoverPanel] Received tour:closeDiscoverPanel event, closing panel');
      // Use explicit close instead of toggle to ensure panel closes
      setDiscoverPanelOpen(false);
      // Also clear search input
      setCommandInput('');
    };
    
    window.addEventListener('tour:openDiscoverPanel', handleOpenDiscoverPanel);
    window.addEventListener('tour:closeDiscoverPanel', handleCloseDiscoverPanel);
    
    return () => {
      window.removeEventListener('tour:openDiscoverPanel', handleOpenDiscoverPanel);
      window.removeEventListener('tour:closeDiscoverPanel', handleCloseDiscoverPanel);
    };
  }, [isOpen, toggleDiscoverPanel, setDiscoverPanelOpen]);

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

  // Task-organized commands (expanded with user's requested commands)
  const taskCommands: TaskCommand[] = [
    // FEATURE IMPLEMENTATION
    { id: 'implement', name: '/implement', description: 'Feature implementation with architectural planning', icon: Wrench, action: 'implement', category: 'FEATURE IMPLEMENTATION' },
    { id: 'design', name: '/design', description: 'UI/UX design iterations and mockups', icon: Palette, action: 'design', category: 'FEATURE IMPLEMENTATION' },
    
    // BUILD & TEST
    { id: 'build', name: '/build', description: 'Compilation, bundling, and packaging automation', icon: Code, action: 'build', category: 'BUILD & TEST' },
    { id: 'test', name: '/test', description: 'Test generation and coverage analysis', icon: TestTube, action: 'test', category: 'BUILD & TEST' },
    { id: 'deploy', name: '/deploy', description: 'Deploy to production', icon: Upload, action: 'deploy', category: 'BUILD & TEST' },
    { id: 'clean', name: '/clean', description: 'Clean build files', icon: Trash2, action: 'clean', category: 'BUILD & TEST' },
    
    // CODE ANALYSIS & DEBUGGING
    { id: 'analyze', name: '/analyze', description: 'Deep codebase architecture reviews and audits', icon: Sparkles, action: 'analyze', category: 'CODE ANALYSIS & DEBUGGING' },
    { id: 'troubleshoot', name: '/troubleshoot', description: 'Advanced debugging for complex issues', icon: Bug, action: 'troubleshoot', category: 'CODE ANALYSIS & DEBUGGING' },
    { id: 'explain', name: '/explain', description: 'Code explanation and documentation generation', icon: MessageSquare, action: 'explain', category: 'CODE ANALYSIS & DEBUGGING' },
    
    // QUALITY ASSURANCE
    { id: 'improve', name: '/improve', description: 'Code optimization and refactoring suggestions', icon: Zap, action: 'improve', category: 'QUALITY ASSURANCE' },
    { id: 'cleanup', name: '/cleanup', description: 'Code cleanup and standardization', icon: ClipboardList, action: 'cleanup', category: 'QUALITY ASSURANCE' },
    
    // PROJECT MANAGEMENT
    { id: 'document', name: '/document', description: 'Automated documentation generation', icon: FileText, action: 'document', category: 'PROJECT MANAGEMENT' },
    { id: 'git', name: '/git', description: 'Advanced Git workflow automation', icon: GitBranch, action: 'git', category: 'PROJECT MANAGEMENT' },
    { id: 'estimate', name: '/estimate', description: 'Project estimation and timeline planning', icon: Calculator, action: 'estimate', category: 'PROJECT MANAGEMENT' },
    { id: 'task-manage', name: '/task', description: 'Task management and progress tracking', icon: ListTodo, action: 'task', category: 'PROJECT MANAGEMENT' },
    { id: 'index', name: '/index', description: 'Codebase indexing and search', icon: Hash, action: 'index', category: 'PROJECT MANAGEMENT' },
    { id: 'load', name: '/load', description: 'Smart file and context loading', icon: FolderOpen, action: 'load', category: 'PROJECT MANAGEMENT' },
    { id: 'spawn', name: '/spawn', description: 'Multi-agent task spawning', icon: Users, action: 'spawn', category: 'PROJECT MANAGEMENT' },
    
    // GIT & VERSION CONTROL
    { id: 'commit', name: '/commit', description: 'Create git commit', icon: GitBranch, action: 'commit', category: 'GIT & VERSION CONTROL' },
    { id: 'push', name: '/push', description: 'Push to repository', icon: Upload, action: 'push', category: 'GIT & VERSION CONTROL' },
    { id: 'pull', name: '/pull', description: 'Pull latest changes', icon: RotateCcw, action: 'pull', category: 'GIT & VERSION CONTROL' },
    
    // DEVELOPMENT
    { id: 'help', name: '/help', description: 'Show available commands', icon: HelpCircle, action: 'help', category: 'DEVELOPMENT' },
    { id: 'clear', name: '/clear', description: 'Clear terminal', icon: Terminal, action: 'clear', category: 'DEVELOPMENT' },
    { id: 'status', name: '/status', description: 'Check project status', icon: Activity, action: 'status', category: 'DEVELOPMENT' },
    
    // AI & ANALYSIS (keeping original non-slash items)  
    { id: 'requirements', name: 'Requirements', description: 'Gather project requirements', icon: BookOpen, action: () => {}, category: 'AI & ANALYSIS' },
    { id: 'templates', name: 'Templates', description: 'Access code templates', icon: FileText, action: () => {}, category: 'AI & ANALYSIS' },
    { id: 'agents', name: 'Agents', description: 'Spawn AI development team', icon: Grid, action: () => {}, category: 'AI & ANALYSIS' }
  ];

  // Combine task commands with wcygan commands
  const allCommands = React.useMemo(() => {
    const combinedCommands = [...taskCommands];
    
    // Convert wcygan commands to TaskCommand format
    wcyganCommands.forEach(wcmd => {
      combinedCommands.push({
        id: `wcygan-${wcmd.id}`, // Prefix with 'wcygan-' to ensure uniqueness
        name: wcmd.slashCommand,
        description: wcmd.description,
        icon: getIconForCategory(wcmd.category),
        action: wcmd.slashCommand.substring(1), // Remove leading slash
        category: mapWcyganCategory(wcmd.category)
      });
    });
    
    return combinedCommands;
  }, [wcyganCommands]);
  
  
  // Slash commands (just the slash commands for scrolling)
  const slashCommands = allCommands.filter(cmd => cmd.name.startsWith('/'));
  
  // Get current visible slash commands (show only 3 at a time)
  const visibleCount = 3;
  const visibleSlashCommands = slashCommands.slice(slashCommandOffset, slashCommandOffset + visibleCount);
  
  // Scroll slash commands
  const scrollSlashCommands = (direction: 'up' | 'down') => {
    const scrollAmount = 1; // Scroll 1 item at a time for smoother experience with only 3 visible
    if (direction === 'down' && slashCommandOffset + visibleCount < slashCommands.length) {
      setSlashCommandOffset(Math.min(slashCommandOffset + scrollAmount, slashCommands.length - visibleCount));
    } else if (direction === 'up' && slashCommandOffset > 0) {
      setSlashCommandOffset(Math.max(slashCommandOffset - scrollAmount, 0));
    }
  };

  // Filter commands based on search
  const filteredCommands = allCommands.filter(cmd => {
    // Search filter
    if (searchInput) {
      const query = searchInput.toLowerCase();
      return (
        cmd.name.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Group commands by category (kept for potential future use but not displayed)
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
          // REMOVED: console.debug('Clipboard failed:', error);
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
        data-tour="discover-button"
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
        title="Discover - Command center with AI tools, terminal commands, and workspace management"
      >
        <Compass className="w-4 h-4" />
        Discover
      </button>

      {/* Panel */}
      <div 
        data-tour="discover-menu"
        className={`absolute bottom-full left-0 mb-2 w-96 bg-bg-secondary border border-border-default rounded-lg shadow-xl transition-all duration-200 z-50 ${
        isOpen ? 'opacity-100 visible tour-discover-menu' : 'opacity-0 invisible'
      }`}
        style={{
          boxShadow: isOpen ? `
            0 0 30px rgba(0, 217, 255, 0.6),
            0 0 60px rgba(0, 217, 255, 0.3),
            inset 0 0 20px rgba(0, 217, 255, 0.1)
          `.trim() : undefined
        }}>
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
            title="Close Discover panel"
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
        <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: '500px' }}>
          {/* Slash Commands (Scrollable) */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-coder1-cyan uppercase tracking-wider">
                /slash commands <span className="text-orange-500">({slashCommands.length} total)</span>
              </h4>
              <span className="text-xs text-text-muted">
                Scroll for more
              </span>
            </div>
            <div 
              className="space-y-1 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(139, 92, 246, 0.5) rgba(30, 30, 40, 0.5)'
              }}
            >
              {slashCommands.map((cmd) => {
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

          {/* Separator */}
          <div className="border-t border-border-default my-6"></div>

          {/* AI Tools Section */}
          <div className="mb-4 p-3 border-2 border-coder1-purple rounded-lg bg-coder1-purple/5">
            <h4 className="text-xs font-semibold text-coder1-purple uppercase tracking-wider mb-3">✨ AI TOOLS</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <span>•</span>
                <a href="http://localhost:3001/hooks-v3.html" target="_blank" className="text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors">AI Hooks</a>
              </div>
              <div className="flex items-center gap-2">
                <span>•</span>
                <a href="http://localhost:3001/templates-hub.html" target="_blank" className="text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors">AI Templates</a>
              </div>
              <div className="flex items-center gap-2">
                <span>•</span>
                <a href="http://localhost:3001/components-capture.html" target="_blank" className="text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors">AI Components</a>
              </div>
              <div className="flex items-center gap-2">
                <span>•</span>
                <a href="http://localhost:3001/smart-prd-generator-standalone.html" target="_blank" className="text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors">AI PRD</a>
              </div>
              <div className="flex items-center gap-2">
                <span>•</span>
                <a href="http://localhost:3001/workflow-dashboard.html" target="_blank" className="text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors">AI Workflows</a>
              </div>
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
              title="Add custom command - Create your own terminal shortcuts and workflows"
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

        </div>
      </div>

      {/* Enhanced Session Creation Modal */}
      <EnhancedSessionCreationModal
        isOpen={showEnhancedSessionModal}
        onClose={() => setShowEnhancedSessionModal(false)}
        onCreateSession={createEnhancedSession}
      />
    </>
  );
}