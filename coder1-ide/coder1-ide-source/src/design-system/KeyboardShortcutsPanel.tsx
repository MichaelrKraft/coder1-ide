import React, { 
  useState, 
  useMemo, 
  useCallback, 
  memo, 
  forwardRef 
} from 'react';
import { useDesignTokens } from './useDesignTokens';
import { useKeyboardShortcuts, formatKeyCombo, KeyboardShortcut, ShortcutGroup } from './KeyboardShortcuts';
import { useGarbageCollection } from '../hooks/useGarbageCollection';
import './KeyboardShortcutsPanel.css';

// Keyboard shortcuts panel props
export interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  searchable?: boolean;
  showCategories?: boolean;
  allowCustomization?: boolean;
  className?: string;
}

// Keyboard shortcuts panel component
const KeyboardShortcutsPanel = memo(forwardRef<HTMLDivElement, KeyboardShortcutsPanelProps>(({
  isOpen,
  onClose,
  searchable = true,
  showCategories = true,
  allowCustomization = false,
  className = ''
}, ref) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  
  const { colors, getSpacing, tokens } = useDesignTokens();
  const { getShortcuts, getGroups, enableShortcut, disableShortcut, isShortcutEnabled } = useKeyboardShortcuts();
  
  // Garbage collection for cleanup
  useGarbageCollection(() => {
    setSearchQuery('');
    setSelectedCategory(null);
    setEditingShortcut(null);
  }, {
    componentName: 'KeyboardShortcutsPanel',
    priority: 'medium'
  });
  
  // Get all shortcuts and groups
  const shortcuts = useMemo(() => getShortcuts(), [getShortcuts]);
  const groups = useMemo(() => getGroups(), [getGroups]);
  
  // Get unique categories
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    shortcuts.forEach(shortcut => {
      if (shortcut.category) {
        categorySet.add(shortcut.category);
      }
    });
    groups.forEach(group => {
      categorySet.add(group.title);
    });
    return Array.from(categorySet).sort();
  }, [shortcuts, groups]);
  
  // Filter shortcuts based on search and category
  const filteredShortcuts = useMemo(() => {
    let filtered = shortcuts;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(shortcut =>
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.key.toLowerCase().includes(query) ||
        (shortcut.category && shortcut.category.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(shortcut => shortcut.category === selectedCategory);
    }
    
    return filtered.sort((a, b) => {
      // Sort by category first, then by description
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      return a.description.localeCompare(b.description);
    });
  }, [shortcuts, searchQuery, selectedCategory]);
  
  // Group shortcuts by category for display
  const groupedShortcuts = useMemo(() => {
    const grouped = new Map<string, KeyboardShortcut[]>();
    
    filteredShortcuts.forEach(shortcut => {
      const category = shortcut.category || 'General';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(shortcut);
    });
    
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredShortcuts]);
  
  // Handle shortcut toggle
  const handleShortcutToggle = useCallback((shortcutId: string) => {
    if (isShortcutEnabled(shortcutId)) {
      disableShortcut(shortcutId);
    } else {
      enableShortcut(shortcutId);
    }
  }, [isShortcutEnabled, enableShortcut, disableShortcut]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;
    
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }, [isOpen, onClose]);
  
  // Register keyboard event listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // Don't render if not open
  if (!isOpen) return null;
  
  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div
        ref={ref}
        className={`keyboard-shortcuts-panel ${className}`}
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: tokens.borderRadius.lg,
          boxShadow: tokens.shadows.xl,
          color: colors.textPrimary
        }}
      >
        {/* Header */}
        <div
          className="keyboard-shortcuts-panel__header"
          style={{
            borderBottom: `1px solid ${colors.borderSubtle}`,
            padding: getSpacing(4)
          }}
        >
          <div className="keyboard-shortcuts-panel__title">
            <h2 style={{
              fontSize: tokens.typography.fontSize.xl,
              fontWeight: tokens.typography.fontWeight.semibold,
              margin: 0,
              color: colors.textPrimary
            }}>
              ⌨️ Keyboard Shortcuts
            </h2>
            <p style={{
              fontSize: tokens.typography.fontSize.sm,
              color: colors.textSecondary,
              margin: `${getSpacing(1)} 0 0 0`
            }}>
              {filteredShortcuts.length} shortcuts available
            </p>
          </div>
          
          <button
            className="keyboard-shortcuts-panel__close"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textSecondary,
              cursor: 'pointer',
              padding: getSpacing(2),
              borderRadius: tokens.borderRadius.base
            }}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
        
        {/* Search and filters */}
        <div
          className="keyboard-shortcuts-panel__filters"
          style={{
            padding: getSpacing(4),
            borderBottom: `1px solid ${colors.borderSubtle}`
          }}
        >
          {/* Search */}
          {searchable && (
            <div className="keyboard-shortcuts-panel__search" style={{ marginBottom: getSpacing(3) }}>
              <input
                type="text"
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: getSpacing(2),
                  border: `1px solid ${colors.border}`,
                  borderRadius: tokens.borderRadius.base,
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                  fontSize: tokens.typography.fontSize.sm
                }}
              />
            </div>
          )}
          
          {/* Category filter */}
          {showCategories && categories.length > 0 && (
            <div className="keyboard-shortcuts-panel__categories">
              <div style={{ display: 'flex', gap: getSpacing(2), flexWrap: 'wrap' }}>
                <CategoryButton
                  active={selectedCategory === null}
                  onClick={() => setSelectedCategory(null)}
                >
                  All ({shortcuts.length})
                </CategoryButton>
                {categories.map(category => {
                  const count = shortcuts.filter(s => s.category === category).length;
                  return (
                    <CategoryButton
                      key={category}
                      active={selectedCategory === category}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category} ({count})
                    </CategoryButton>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Shortcuts list */}
        <div
          className="keyboard-shortcuts-panel__content"
          style={{
            maxHeight: '60vh',
            overflowY: 'auto',
            padding: getSpacing(4)
          }}
        >
          {filteredShortcuts.length === 0 ? (
            <div
              className="keyboard-shortcuts-panel__empty"
              style={{
                textAlign: 'center',
                color: colors.textSecondary,
                padding: getSpacing(8)
              }}
            >
              {searchQuery ? 'No shortcuts found matching your search.' : 'No shortcuts available.'}
            </div>
          ) : (
            <div className="keyboard-shortcuts-panel__list">
              {showCategories ? (
                // Grouped by category
                groupedShortcuts.map(([category, categoryShortcuts]) => (
                  <div key={category} className="keyboard-shortcuts-panel__category">
                    <h3 style={{
                      fontSize: tokens.typography.fontSize.lg,
                      fontWeight: tokens.typography.fontWeight.medium,
                      color: colors.textPrimary,
                      margin: `${getSpacing(4)} 0 ${getSpacing(2)} 0`,
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      paddingBottom: getSpacing(1)
                    }}>
                      {category}
                    </h3>
                    {categoryShortcuts.map(shortcut => (
                      <ShortcutItem
                        key={shortcut.id}
                        shortcut={shortcut}
                        isEnabled={isShortcutEnabled(shortcut.id)}
                        onToggle={() => handleShortcutToggle(shortcut.id)}
                        allowCustomization={allowCustomization}
                        isEditing={editingShortcut === shortcut.id}
                        onEditStart={() => setEditingShortcut(shortcut.id)}
                        onEditEnd={() => setEditingShortcut(null)}
                      />
                    ))}
                  </div>
                ))
              ) : (
                // Flat list
                filteredShortcuts.map(shortcut => (
                  <ShortcutItem
                    key={shortcut.id}
                    shortcut={shortcut}
                    isEnabled={isShortcutEnabled(shortcut.id)}
                    onToggle={() => handleShortcutToggle(shortcut.id)}
                    allowCustomization={allowCustomization}
                    isEditing={editingShortcut === shortcut.id}
                    onEditStart={() => setEditingShortcut(shortcut.id)}
                    onEditEnd={() => setEditingShortcut(null)}
                  />
                ))
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div
          className="keyboard-shortcuts-panel__footer"
          style={{
            borderTop: `1px solid ${colors.borderSubtle}`,
            padding: getSpacing(3),
            fontSize: tokens.typography.fontSize.xs,
            color: colors.textTertiary,
            textAlign: 'center'
          }}
        >
          Press <kbd style={{ 
            background: colors.surface, 
            padding: '2px 6px', 
            borderRadius: '3px',
            fontFamily: tokens.typography.fontFamily.mono.join(', ')
          }}>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}));

// Individual shortcut item component
const ShortcutItem = memo(({
  shortcut,
  isEnabled,
  onToggle,
  allowCustomization,
  isEditing,
  onEditStart,
  onEditEnd
}: {
  shortcut: KeyboardShortcut;
  isEnabled: boolean;
  onToggle: () => void;
  allowCustomization: boolean;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
}) => {
  const { colors, getSpacing, tokens } = useDesignTokens();
  
  return (
    <div
      className="keyboard-shortcuts-panel__item"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: getSpacing(3),
        marginBottom: getSpacing(2),
        backgroundColor: colors.surface,
        borderRadius: tokens.borderRadius.base,
        border: `1px solid ${colors.borderSubtle}`,
        opacity: isEnabled ? 1 : 0.6
      }}
    >
      {/* Description */}
      <div className="keyboard-shortcuts-panel__item-info">
        <div style={{
          fontSize: tokens.typography.fontSize.sm,
          fontWeight: tokens.typography.fontWeight.medium,
          color: colors.textPrimary,
          marginBottom: getSpacing(1)
        }}>
          {shortcut.description}
        </div>
        {shortcut.category && (
          <div style={{
            fontSize: tokens.typography.fontSize.xs,
            color: colors.textTertiary
          }}>
            {shortcut.category}
          </div>
        )}
      </div>
      
      {/* Key combination */}
      <div className="keyboard-shortcuts-panel__item-key">
        <kbd style={{
          background: colors.background,
          color: colors.textSecondary,
          padding: `${getSpacing(1)} ${getSpacing(2)}`,
          borderRadius: tokens.borderRadius.sm,
          fontSize: tokens.typography.fontSize.xs,
          fontFamily: tokens.typography.fontFamily.mono.join(', '),
          border: `1px solid ${colors.border}`,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
        }}>
          {formatKeyCombo(shortcut.key)}
        </kbd>
      </div>
      
      {/* Actions */}
      <div className="keyboard-shortcuts-panel__item-actions" style={{ display: 'flex', gap: getSpacing(2) }}>
        {allowCustomization && (
          <button
            onClick={isEditing ? onEditEnd : onEditStart}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textSecondary,
              cursor: 'pointer',
              padding: getSpacing(1)
            }}
            title={isEditing ? 'Save' : 'Edit shortcut'}
          >
            {isEditing ? <SaveIcon /> : <EditIcon />}
          </button>
        )}
        
        <button
          onClick={onToggle}
          style={{
            background: 'transparent',
            border: 'none',
            color: isEnabled ? colors.success : colors.textSecondary,
            cursor: 'pointer',
            padding: getSpacing(1)
          }}
          title={isEnabled ? 'Disable shortcut' : 'Enable shortcut'}
        >
          {isEnabled ? <EnabledIcon /> : <DisabledIcon />}
        </button>
      </div>
    </div>
  );
});

// Category button component
const CategoryButton = memo(({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  const { colors, getSpacing, tokens } = useDesignTokens();
  
  return (
    <button
      onClick={onClick}
      style={{
        padding: `${getSpacing(1)} ${getSpacing(3)}`,
        borderRadius: tokens.borderRadius.base,
        border: `1px solid ${active ? colors.primary : colors.border}`,
        backgroundColor: active ? colors.primary : colors.surface,
        color: active ? '#ffffff' : colors.textSecondary,
        cursor: 'pointer',
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.medium,
        transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.out}`
      }}
    >
      {children}
    </button>
  );
});

// Icon components
const CloseIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
));

const EditIcon = memo(() => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
));

const SaveIcon = memo(() => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
));

const EnabledIcon = memo(() => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
));

const DisabledIcon = memo(() => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
));

// Display names for debugging
KeyboardShortcutsPanel.displayName = 'KeyboardShortcutsPanel';
ShortcutItem.displayName = 'ShortcutItem';
CategoryButton.displayName = 'CategoryButton';

export default KeyboardShortcutsPanel;