/**
 * WcyganCommandsSection - Fixed version with all 88 commands
 * This version safely loads and displays the wcygan command library
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Search, Filter, ChevronRight, Clock, Tag, Layers, Loader, AlertCircle } from 'lucide-react';
import { wcyganCommandManager } from '@/lib/wcygan-commands';
import type { WcyganCommand, CommandCategory } from '@/lib/wcygan-commands';
import { logger } from '@/lib/logger';

interface WcyganCommandsSectionProps {
  currentFile?: string;
  terminalOutput?: string;
  recentCommands?: string[];
  onCommandExecute?: (command: any, mode: 'template' | 'agent' | 'hybrid') => void;
  onAddToast?: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export default function WcyganCommandsSection({
  currentFile,
  terminalOutput,
  recentCommands = [],
  onCommandExecute,
  onAddToast
}: WcyganCommandsSectionProps) {
  const [commands, setCommands] = useState<WcyganCommand[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CommandCategory | 'all'>('all');
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize command manager only once
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized) return;
    
    const initializeCommands = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Initialize the command manager
        await wcyganCommandManager.initialize();
        
        // Get commands and categories
        const loadedCommands = wcyganCommandManager.getCommands();
        const loadedCategories = wcyganCommandManager.getCategories();
        
        setCommands(loadedCommands);
        setCategories(loadedCategories);
        setIsInitialized(true);
        
        logger.debug(`[WcyganCommands] Loaded ${loadedCommands.length} commands`);
        
      } catch (err) {
        logger.error('[WcyganCommands] Failed to load:', err);
        setError(err instanceof Error ? err.message : 'Failed to load commands');
        
        // Use fallback commands on error
        const fallbackCommands: WcyganCommand[] = [
          {
            id: 'debug',
            name: 'debug',
            slashCommand: '/debug',
            category: 'debugging',
            description: 'Systematic debugging workflow',
            template: 'Help debug: $ARGUMENTS',
            parameters: [],
            usage: '/debug <error>',
            tags: ['debug', 'troubleshoot'],
            complexity: 'moderate',
            estimatedTime: '10-20 minutes'
          },
          {
            id: 'explain',
            name: 'explain',
            slashCommand: '/explain',
            category: 'documentation',
            description: 'Explain code or concepts',
            template: 'Explain: $ARGUMENTS',
            parameters: [],
            usage: '/explain <code>',
            tags: ['explain', 'documentation'],
            complexity: 'simple',
            estimatedTime: '5-10 minutes'
          },
          {
            id: 'refactor',
            name: 'refactor',
            slashCommand: '/refactor',
            category: 'refactoring',
            description: 'Refactor and improve code',
            template: 'Refactor: $ARGUMENTS',
            parameters: [],
            usage: '/refactor <code>',
            tags: ['refactor', 'improve'],
            complexity: 'moderate',
            estimatedTime: '15-25 minutes'
          },
          {
            id: 'test',
            name: 'test',
            slashCommand: '/test',
            category: 'testing',
            description: 'Generate tests for code',
            template: 'Generate tests for: $ARGUMENTS',
            parameters: [],
            usage: '/test <code>',
            tags: ['test', 'testing'],
            complexity: 'moderate',
            estimatedTime: '10-15 minutes'
          },
          {
            id: 'optimize',
            name: 'optimize',
            slashCommand: '/optimize',
            category: 'optimization',
            description: 'Optimize performance',
            template: 'Optimize: $ARGUMENTS',
            parameters: [],
            usage: '/optimize <code>',
            tags: ['optimize', 'performance'],
            complexity: 'complex',
            estimatedTime: '20-30 minutes'
          }
        ];
        
        setCommands(fallbackCommands);
        setCategories([
          { id: 'debugging', name: 'Debugging', commandCount: 1 },
          { id: 'documentation', name: 'Documentation', commandCount: 1 },
          { id: 'refactoring', name: 'Refactoring', commandCount: 1 },
          { id: 'testing', name: 'Testing', commandCount: 1 },
          { id: 'optimization', name: 'Optimization', commandCount: 1 }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCommands();
  }, []); // Empty dependency array - only run once

  // Filter commands based on search and category
  const filteredCommands = useMemo(() => {
    let filtered = commands;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(cmd => cmd.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(cmd =>
        cmd.name.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        cmd.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [commands, selectedCategory, searchQuery]);

  // Get context-based suggestions (limited to prevent re-renders)
  const suggestions = useMemo(() => {
    if (!commands.length) return [];
    
    const suggested: WcyganCommand[] = [];
    
    // Simple context matching without causing re-renders
    if (currentFile?.includes('test')) {
      const testCmd = commands.find(c => c.category === 'testing');
      if (testCmd) suggested.push(testCmd);
    }
    
    if (terminalOutput?.includes('error')) {
      const debugCmd = commands.find(c => c.category === 'debugging');
      if (debugCmd) suggested.push(debugCmd);
    }
    
    // Add some general commands
    const generalCmds = commands.filter(c => 
      ['explain', 'help', 'refactor'].includes(c.name)
    ).slice(0, 3);
    
    suggested.push(...generalCmds);
    
    return suggested.slice(0, 5);
  }, [commands, currentFile]); // Intentionally exclude terminalOutput to prevent loops

  const handleCommandClick = useCallback((command: WcyganCommand) => {
    if (onCommandExecute) {
      onCommandExecute(command, 'template');
    } else {
      // Copy template to clipboard
      navigator.clipboard.writeText(command.template).then(() => {
        onAddToast?.({
          message: `Copied ${command.name} template to clipboard`,
          type: 'success'
        });
      });
    }
  }, [onCommandExecute, onAddToast]);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      debugging: '🐛',
      documentation: '📚',
      planning: '📋',
      quality: '⭐',
      refactoring: '🔧',
      testing: '🧪',
      optimization: '⚡',
      security: '🛡️',
      deployment: '🚀',
      architecture: '🏗️',
      database: '🗄️',
      frontend: '🎨',
      backend: '⚙️',
      devops: '🔄',
      general: '📦'
    };
    return icons[category] || '📄';
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'text-green-400';
      case 'moderate': return 'text-yellow-400';
      case 'complex': return 'text-orange-400';
      default: return 'text-text-muted';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader className="w-8 h-8 text-coder1-cyan animate-spin mb-4" />
        <p className="text-sm text-text-muted">Loading command library...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
        <p className="text-sm text-text-muted mb-2">Failed to load commands</p>
        <p className="text-xs text-text-muted">{error}</p>
        <p className="text-xs text-text-muted mt-4">Using {commands.length} fallback commands</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-coder1-cyan" />
          <h3 className="text-sm font-semibold text-text-primary">
            Special Commands ({filteredCommands.length})
          </h3>
        </div>
        <div className="text-xs text-text-muted">
          {commands.length} total commands
        </div>
      </div>

      {/* Search and Filter */}
      <div className="px-4 py-2 space-y-2 border-b border-border-default">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands..."
            className="w-full pl-7 pr-2 py-1 text-xs bg-bg-tertiary border border-border-default rounded outline-none text-text-primary placeholder-text-muted focus:border-coder1-cyan"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-3 h-3 text-text-muted" />
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              selectedCategory === 'all'
                ? 'bg-coder1-cyan text-black'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            All
          </button>
          {categories.slice(0, 5).map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-coder1-cyan text-black'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              {cat.name} ({cat.commandCount})
            </button>
          ))}
        </div>
      </div>

      {/* Commands List */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {/* Suggestions */}
        {suggestions.length > 0 && !searchQuery && selectedCategory === 'all' && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-text-secondary mb-2">
              Suggested for Context
            </h4>
            <div className="space-y-1">
              {suggestions.map(cmd => (
                <button
                  key={cmd.id}
                  onClick={() => handleCommandClick(cmd)}
                  className="w-full text-left px-2 py-1.5 bg-bg-tertiary hover:bg-bg-secondary rounded border border-coder1-cyan/20 hover:border-coder1-cyan transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-coder1-cyan">
                      {getCategoryIcon(cmd.category)} {cmd.slashCommand}
                    </span>
                    <span className={`text-xs ${getComplexityColor(cmd.complexity)}`}>
                      {cmd.estimatedTime}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {cmd.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All Commands */}
        <div className="space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-text-muted">No commands found</p>
            </div>
          ) : (
            filteredCommands.map(cmd => (
              <div
                key={cmd.id}
                className="bg-bg-tertiary hover:bg-bg-secondary rounded border border-coder1-cyan/20 hover:border-coder1-cyan transition-all"
              >
                <button
                  onClick={() => setExpandedCommand(expandedCommand === cmd.id ? null : cmd.id)}
                  className="w-full px-2 py-1.5 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChevronRight 
                        className={`w-3 h-3 text-text-muted transition-transform ${
                          expandedCommand === cmd.id ? 'rotate-90' : ''
                        }`}
                      />
                      <span className="text-xs font-medium text-text-primary">
                        {getCategoryIcon(cmd.category)} {cmd.slashCommand}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${getComplexityColor(cmd.complexity)}`}>
                        {cmd.complexity}
                      </span>
                      <Clock className="w-3 h-3 text-text-muted" />
                      <span className="text-xs text-text-muted">
                        {cmd.estimatedTime}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 ml-5">
                    {cmd.description}
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedCommand === cmd.id && (
                  <div className="px-2 py-2 border-t border-border-default space-y-2">
                    <div>
                      <div className="text-xs font-semibold text-text-secondary mb-1">Usage</div>
                      <code className="text-xs bg-bg-primary px-1 py-0.5 rounded text-coder1-cyan">
                        {cmd.usage}
                      </code>
                    </div>
                    
                    <div>
                      <div className="text-xs font-semibold text-text-secondary mb-1">Tags</div>
                      <div className="flex flex-wrap gap-1">
                        {cmd.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 text-xs bg-bg-primary rounded text-text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCommandClick(cmd);
                        }}
                        className="px-3 py-1 text-xs bg-coder1-cyan text-black rounded hover:bg-coder1-cyan-secondary transition-colors"
                      >
                        Use Template
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onCommandExecute) {
                            onCommandExecute(cmd, 'agent');
                          }
                        }}
                        className="px-3 py-1 text-xs bg-bg-primary border border-border-default rounded hover:border-coder1-cyan text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Use with AI
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-border-default">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            {filteredCommands.length} commands shown
          </span>
          <span>
            {categories.length} categories
          </span>
        </div>
      </div>
    </div>
  );
}