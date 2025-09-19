import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef, 
  memo, 
  forwardRef 
} from 'react';
import { useDesignTokens } from './useDesignTokens';
import { useGarbageCollection } from '../hooks/useGarbageCollection';
import './CommandPalette.css';

// Command interface
export interface Command {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  keywords?: string[];
  category?: string;
  shortcut?: string;
  action: () => void | Promise<void>;
  disabled?: boolean;
  priority?: number; // Higher priority commands appear first
}

// Command group for organization
export interface CommandGroup {
  id: string;
  title: string;
  commands: Command[];
  priority?: number;
}

// Command palette props
export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands?: Command[];
  groups?: CommandGroup[];
  placeholder?: string;
  maxResults?: number;
  showShortcuts?: boolean;
  showCategories?: boolean;
  enableFuzzySearch?: boolean;
  className?: string;
  onCommandExecute?: (command: Command) => void;
}

// Fuzzy search function
const fuzzySearch = (query: string, text: string): number => {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (textLower.includes(queryLower)) {
    return 100 - queryLower.length; // Exact matches score higher
  }
  
  let score = 0;
  let queryIndex = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 1;
      queryIndex += 1;
    }
  }
  
  return queryIndex === queryLower.length ? score : 0;
};

// Command palette component
const CommandPalette = memo(forwardRef<HTMLDivElement, CommandPaletteProps>(({
  isOpen,
  onClose,
  commands = [],
  groups = [],
  placeholder = "Type a command or search...",
  maxResults = 10,
  showShortcuts = true,
  showCategories = true,
  enableFuzzySearch = true,
  className = '',
  onCommandExecute
}, ref) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const { colors, getSpacing, tokens } = useDesignTokens();
  
  // Garbage collection for cleanup
  useGarbageCollection(() => {
    setQuery('');
    setSelectedIndex(0);
    setIsExecuting(null);
    itemRefs.current = [];
  }, {
    componentName: 'CommandPalette',
    priority: 'medium'
  });
  
  // Combine commands from props and groups
  const allCommands = useMemo(() => {
    const commandList = [...commands];
    
    groups.forEach(group => {
      commandList.push(...group.commands.map(cmd => ({
        ...cmd,
        category: cmd.category || group.title
      })));
    });
    
    return commandList.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [commands, groups]);
  
  // Filter and search commands
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return allCommands.slice(0, maxResults);
    }
    
    const queryLower = query.toLowerCase();
    const results: Array<Command & { score: number }> = [];
    
    allCommands.forEach(command => {
      if (command.disabled) return;
      
      let score = 0;
      
      // Search in title
      const titleScore = enableFuzzySearch 
        ? fuzzySearch(queryLower, command.title)
        : command.title.toLowerCase().includes(queryLower) ? 100 : 0;
      
      // Search in subtitle
      const subtitleScore = command.subtitle
        ? enableFuzzySearch
          ? fuzzySearch(queryLower, command.subtitle)
          : command.subtitle.toLowerCase().includes(queryLower) ? 80 : 0
        : 0;
      
      // Search in description
      const descriptionScore = command.description
        ? enableFuzzySearch
          ? fuzzySearch(queryLower, command.description)
          : command.description.toLowerCase().includes(queryLower) ? 60 : 0
        : 0;
      
      // Search in keywords
      const keywordScore = command.keywords
        ? Math.max(...command.keywords.map(keyword =>
            enableFuzzySearch
              ? fuzzySearch(queryLower, keyword)
              : keyword.toLowerCase().includes(queryLower) ? 90 : 0
          ))
        : 0;
      
      // Search in category
      const categoryScore = command.category
        ? enableFuzzySearch
          ? fuzzySearch(queryLower, command.category)
          : command.category.toLowerCase().includes(queryLower) ? 40 : 0
        : 0;
      
      score = Math.max(titleScore, subtitleScore, descriptionScore, keywordScore, categoryScore);
      
      if (score > 0) {
        results.push({ ...command, score });
      }
    });
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }, [query, allCommands, maxResults, enableFuzzySearch]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
        
      case 'Enter':
        event.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleCommandExecute(filteredCommands[selectedIndex]);
        }
        break;
        
      case 'Tab':
        if (filteredCommands.length > 0) {
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
        }
        break;
    }
  }, [isOpen, filteredCommands, selectedIndex, onClose]);
  
  // Execute command
  const handleCommandExecute = useCallback(async (command: Command) => {
    if (command.disabled || isExecuting) return;
    
    setIsExecuting(command.id);
    
    try {
      await command.action();
      onCommandExecute?.(command);
      onClose();
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setIsExecuting(null);
    }
  }, [isExecuting, onCommandExecute, onClose]);
  
  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);
  
  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = itemRefs.current[selectedIndex];
    if (selectedElement && resultsRef.current) {
      const container = resultsRef.current;
      const element = selectedElement;
      
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const elementTop = element.offsetTop;
      const elementBottom = elementTop + element.offsetHeight;
      
      if (elementTop < containerTop) {
        container.scrollTop = elementTop;
      } else if (elementBottom > containerBottom) {
        container.scrollTop = elementBottom - container.clientHeight;
      }
    }
  }, [selectedIndex]);
  
  // Keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // Don't render if not open
  if (!isOpen) return null;
  
  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div 
        ref={ref}
        className={`command-palette ${className}`}
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: tokens.borderRadius.lg,
          boxShadow: tokens.shadows.xl,
          color: colors.textPrimary
        }}
      >
        {/* Search Input */}
        <div className="command-palette__search">
          <div className="command-palette__search-icon">
            <SearchIcon />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
            className="command-palette__input"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: colors.textPrimary,
              fontSize: tokens.typography.fontSize.base,
              fontFamily: tokens.typography.fontFamily.sans.join(', ')
            }}
          />
          {query && (
            <button
              className="command-palette__clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <ClearIcon />
            </button>
          )}
        </div>
        
        {/* Results */}
        <div 
          ref={resultsRef}
          className="command-palette__results"
          style={{
            borderTop: `1px solid ${colors.borderSubtle}`
          }}
        >
          {filteredCommands.length === 0 ? (
            <div 
              className="command-palette__empty"
              style={{ 
                color: colors.textSecondary,
                padding: getSpacing(4),
                textAlign: 'center'
              }}
            >
              {query ? 'No commands found' : 'Start typing to search commands...'}
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <CommandItem
                key={command.id}
                ref={el => { itemRefs.current[index] = el; }}
                command={command}
                isSelected={index === selectedIndex}
                isExecuting={isExecuting === command.id}
                showShortcuts={showShortcuts}
                showCategories={showCategories}
                onClick={() => handleCommandExecute(command)}
                onMouseEnter={() => setSelectedIndex(index)}
              />
            ))
          )}
        </div>
        
        {/* Footer */}
        <div 
          className="command-palette__footer"
          style={{
            borderTop: `1px solid ${colors.borderSubtle}`,
            color: colors.textTertiary,
            fontSize: tokens.typography.fontSize.xs,
            padding: `${getSpacing(2)} ${getSpacing(4)}`
          }}
        >
          <div className="command-palette__shortcuts">
            <kbd>↑↓</kbd> Navigate • <kbd>↵</kbd> Execute • <kbd>Esc</kbd> Close
          </div>
          {filteredCommands.length > 0 && (
            <div className="command-palette__count">
              {filteredCommands.length} result{filteredCommands.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}));

// Command item component
const CommandItem = memo(forwardRef<HTMLDivElement, {
  command: Command;
  isSelected: boolean;
  isExecuting: boolean;
  showShortcuts: boolean;
  showCategories: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}>(({ 
  command, 
  isSelected, 
  isExecuting, 
  showShortcuts, 
  showCategories,
  onClick, 
  onMouseEnter 
}, ref) => {
  const { colors, getSpacing, tokens } = useDesignTokens();
  
  return (
    <div
      ref={ref}
      className={`command-palette__item ${isSelected ? 'command-palette__item--selected' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        padding: getSpacing(3),
        cursor: 'pointer',
        backgroundColor: isSelected ? colors.surfaceHover : 'transparent',
        borderRadius: tokens.borderRadius.base,
        margin: `0 ${getSpacing(2)}`,
        transition: `background-color ${tokens.animation.duration.fast} ${tokens.animation.easing.out}`
      }}
    >
      <div className="command-palette__item-content">
        {/* Icon */}
        {command.icon && (
          <div className="command-palette__item-icon" style={{ marginRight: getSpacing(3) }}>
            {command.icon}
          </div>
        )}
        
        {/* Main content */}
        <div className="command-palette__item-main">
          <div className="command-palette__item-header">
            <span 
              className="command-palette__item-title"
              style={{ 
                color: colors.textPrimary,
                fontWeight: tokens.typography.fontWeight.medium
              }}
            >
              {command.title}
            </span>
            
            {/* Category */}
            {showCategories && command.category && (
              <span 
                className="command-palette__item-category"
                style={{ 
                  color: colors.textTertiary,
                  fontSize: tokens.typography.fontSize.xs,
                  marginLeft: getSpacing(2)
                }}
              >
                {command.category}
              </span>
            )}
          </div>
          
          {/* Subtitle/Description */}
          {command.subtitle && (
            <div 
              className="command-palette__item-subtitle"
              style={{ 
                color: colors.textSecondary,
                fontSize: tokens.typography.fontSize.sm,
                marginTop: getSpacing(1)
              }}
            >
              {command.subtitle}
            </div>
          )}
        </div>
        
        {/* Shortcut */}
        {showShortcuts && command.shortcut && (
          <div className="command-palette__item-shortcut">
            <kbd 
              style={{
                backgroundColor: colors.surface,
                color: colors.textSecondary,
                padding: `${getSpacing(1)} ${getSpacing(2)}`,
                borderRadius: tokens.borderRadius.sm,
                fontSize: tokens.typography.fontSize.xs,
                fontFamily: tokens.typography.fontFamily.mono.join(', ')
              }}
            >
              {command.shortcut}
            </kbd>
          </div>
        )}
        
        {/* Loading indicator */}
        {isExecuting && (
          <div className="command-palette__item-loading">
            <LoadingSpinner />
          </div>
        )}
      </div>
    </div>
  );
}));

// Simple loading spinner
const LoadingSpinner = memo(() => (
  <svg 
    className="command-palette__spinner" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="31.416"
      strokeDashoffset="31.416"
      style={{
        animation: 'command-palette-spin 1s linear infinite'
      }}
    />
  </svg>
));

// Search icon
const SearchIcon = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
));

// Clear icon
const ClearIcon = memo(() => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
));

CommandPalette.displayName = 'CommandPalette';
CommandItem.displayName = 'CommandItem';
LoadingSpinner.displayName = 'LoadingSpinner';

export default CommandPalette;