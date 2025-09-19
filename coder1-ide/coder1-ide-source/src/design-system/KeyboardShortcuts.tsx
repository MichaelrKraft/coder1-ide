import React, { 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef, 
  createContext, 
  useContext, 
  memo 
} from 'react';
import { useGarbageCollection } from '../hooks/useGarbageCollection';

// Keyboard shortcut interface
export interface KeyboardShortcut {
  id: string;
  key: string; // e.g., "cmd+k", "ctrl+shift+p", "escape"
  description: string;
  category?: string;
  handler: (event: KeyboardEvent) => void | Promise<void>;
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  allowInInput?: boolean; // Allow in input fields
  priority?: number; // Higher priority shortcuts override lower ones
  global?: boolean; // Global shortcuts work everywhere
  condition?: () => boolean; // Conditional activation
}

// Shortcut group for organization
export interface ShortcutGroup {
  id: string;
  title: string;
  description?: string;
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

// Keyboard context for managing shortcuts
interface KeyboardContextValue {
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (id: string) => void;
  registerGroup: (group: ShortcutGroup) => void;
  unregisterGroup: (id: string) => void;
  enableShortcut: (id: string) => void;
  disableShortcut: (id: string) => void;
  getShortcuts: () => KeyboardShortcut[];
  getGroups: () => ShortcutGroup[];
  isShortcutEnabled: (id: string) => boolean;
}

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

// Hook to use keyboard shortcuts
export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardProvider');
  }
  return context;
};

// Hook to register a single shortcut
export const useKeyboardShortcut = (shortcut: KeyboardShortcut) => {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
  
  useEffect(() => {
    registerShortcut(shortcut);
    return () => unregisterShortcut(shortcut.id);
  }, [shortcut.id, shortcut.key, registerShortcut, unregisterShortcut]);
};

// Hook to register multiple shortcuts
export const useKeyboardShortcutGroup = (group: ShortcutGroup) => {
  const { registerGroup, unregisterGroup } = useKeyboardShortcuts();
  
  useEffect(() => {
    registerGroup(group);
    return () => unregisterGroup(group.id);
  }, [group.id, registerGroup, unregisterGroup]);
};

// Keyboard provider component
export const KeyboardProvider = memo(({ children }: { children: React.ReactNode }) => {
  const shortcutsRef = useRef<Map<string, KeyboardShortcut>>(new Map());
  const groupsRef = useRef<Map<string, ShortcutGroup>>(new Map());
  const enabledShortcutsRef = useRef<Set<string>>(new Set());
  
  // Garbage collection for cleanup
  useGarbageCollection(() => {
    shortcutsRef.current.clear();
    groupsRef.current.clear();
    enabledShortcutsRef.current.clear();
  }, {
    componentName: 'KeyboardProvider',
    priority: 'high'
  });
  
  // Parse key combination string
  const parseKeyCombo = useCallback((keyCombo: string): {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
  } => {
    const parts = keyCombo.toLowerCase().split('+');
    const modifiers = parts.slice(0, -1);
    const key = parts[parts.length - 1];
    
    return {
      key: key === 'space' ? ' ' : key,
      ctrlKey: modifiers.includes('ctrl'),
      metaKey: modifiers.includes('cmd') || modifiers.includes('meta'),
      shiftKey: modifiers.includes('shift'),
      altKey: modifiers.includes('alt') || modifiers.includes('option')
    };
  }, []);
  
  // Check if key event matches shortcut
  const matchesShortcut = useCallback((event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
    const combo = parseKeyCombo(shortcut.key);
    
    // Normalize key for comparison
    const eventKey = event.key.toLowerCase();
    const comboKey = combo.key.toLowerCase();
    
    // Check key match (handle special cases)
    const keyMatches = eventKey === comboKey ||
      (comboKey === 'escape' && eventKey === 'escape') ||
      (comboKey === 'enter' && eventKey === 'enter') ||
      (comboKey === 'tab' && eventKey === 'tab') ||
      (comboKey === 'backspace' && eventKey === 'backspace') ||
      (comboKey === 'delete' && eventKey === 'delete') ||
      (comboKey === 'arrowup' && eventKey === 'arrowup') ||
      (comboKey === 'arrowdown' && eventKey === 'arrowdown') ||
      (comboKey === 'arrowleft' && eventKey === 'arrowleft') ||
      (comboKey === 'arrowright' && eventKey === 'arrowright');
    
    return keyMatches &&
      event.ctrlKey === combo.ctrlKey &&
      event.metaKey === combo.metaKey &&
      event.shiftKey === combo.shiftKey &&
      event.altKey === combo.altKey;
  }, [parseKeyCombo]);
  
  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true';
    
    // Get all enabled shortcuts sorted by priority
    const enabledShortcuts = Array.from(shortcutsRef.current.values())
      .filter(shortcut => {
        if (!shortcut.enabled) return false;
        if (!enabledShortcutsRef.current.has(shortcut.id)) return false;
        if (shortcut.condition && !shortcut.condition()) return false;
        if (isInputElement && !shortcut.allowInInput) return false;
        return true;
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Find matching shortcut
    for (const shortcut of enabledShortcuts) {
      if (matchesShortcut(event, shortcut)) {
        try {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation !== false) {
            event.stopPropagation();
          }
          
          // Execute handler
          const result = shortcut.handler(event);
          if (result instanceof Promise) {
            result.catch(error => {
              console.error(`Error executing keyboard shortcut "${shortcut.id}":`, error);
            });
          }
          
          break; // Only execute the first matching shortcut
        } catch (error) {
          console.error(`Error executing keyboard shortcut "${shortcut.id}":`, error);
        }
      }
    }
  }, [matchesShortcut]);
  
  // Register keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);
  
  // Context value
  const contextValue: KeyboardContextValue = useMemo(() => ({
    registerShortcut: (shortcut: KeyboardShortcut) => {
      shortcutsRef.current.set(shortcut.id, { ...shortcut, enabled: shortcut.enabled !== false });
      if (shortcut.enabled !== false) {
        enabledShortcutsRef.current.add(shortcut.id);
      }
    },
    
    unregisterShortcut: (id: string) => {
      shortcutsRef.current.delete(id);
      enabledShortcutsRef.current.delete(id);
    },
    
    registerGroup: (group: ShortcutGroup) => {
      groupsRef.current.set(group.id, group);
      group.shortcuts.forEach(shortcut => {
        const enabled = (group.enabled !== false) && (shortcut.enabled !== false);
        shortcutsRef.current.set(shortcut.id, { ...shortcut, enabled });
        if (enabled) {
          enabledShortcutsRef.current.add(shortcut.id);
        }
      });
    },
    
    unregisterGroup: (id: string) => {
      const group = groupsRef.current.get(id);
      if (group) {
        group.shortcuts.forEach(shortcut => {
          shortcutsRef.current.delete(shortcut.id);
          enabledShortcutsRef.current.delete(shortcut.id);
        });
        groupsRef.current.delete(id);
      }
    },
    
    enableShortcut: (id: string) => {
      const shortcut = shortcutsRef.current.get(id);
      if (shortcut) {
        shortcut.enabled = true;
        enabledShortcutsRef.current.add(id);
      }
    },
    
    disableShortcut: (id: string) => {
      const shortcut = shortcutsRef.current.get(id);
      if (shortcut) {
        shortcut.enabled = false;
        enabledShortcutsRef.current.delete(id);
      }
    },
    
    getShortcuts: () => Array.from(shortcutsRef.current.values()),
    
    getGroups: () => Array.from(groupsRef.current.values()),
    
    isShortcutEnabled: (id: string) => enabledShortcutsRef.current.has(id)
  }), []);
  
  return (
    <KeyboardContext.Provider value={contextValue}>
      {children}
    </KeyboardContext.Provider>
  );
});

// Default shortcuts for common IDE actions
export const createDefaultShortcuts = (): ShortcutGroup[] => [
  {
    id: 'file-operations',
    title: 'File Operations',
    description: 'File and project management shortcuts',
    shortcuts: [
      {
        id: 'new-file',
        key: 'cmd+n',
        description: 'Create new file',
        category: 'File',
        handler: () => console.log('New file'),
        priority: 100
      },
      {
        id: 'open-file',
        key: 'cmd+o',
        description: 'Open file',
        category: 'File',
        handler: () => console.log('Open file'),
        priority: 100
      },
      {
        id: 'save-file',
        key: 'cmd+s',
        description: 'Save file',
        category: 'File',
        handler: () => console.log('Save file'),
        allowInInput: true,
        priority: 100
      },
      {
        id: 'save-all',
        key: 'cmd+shift+s',
        description: 'Save all files',
        category: 'File',
        handler: () => console.log('Save all'),
        allowInInput: true,
        priority: 100
      }
    ]
  },
  {
    id: 'navigation',
    title: 'Navigation',
    description: 'Code navigation and search shortcuts',
    shortcuts: [
      {
        id: 'command-palette',
        key: 'cmd+k',
        description: 'Open command palette',
        category: 'Navigation',
        handler: () => console.log('Command palette'),
        priority: 200
      },
      {
        id: 'quick-open',
        key: 'cmd+p',
        description: 'Quick open file',
        category: 'Navigation',
        handler: () => console.log('Quick open'),
        priority: 200
      },
      {
        id: 'go-to-line',
        key: 'cmd+g',
        description: 'Go to line',
        category: 'Navigation',
        handler: () => console.log('Go to line'),
        priority: 100
      },
      {
        id: 'find',
        key: 'cmd+f',
        description: 'Find in file',
        category: 'Navigation',
        handler: () => console.log('Find'),
        allowInInput: true,
        priority: 100
      },
      {
        id: 'find-replace',
        key: 'cmd+h',
        description: 'Find and replace',
        category: 'Navigation',
        handler: () => console.log('Find and replace'),
        priority: 100
      }
    ]
  },
  {
    id: 'editing',
    title: 'Editing',
    description: 'Text editing and formatting shortcuts',
    shortcuts: [
      {
        id: 'undo',
        key: 'cmd+z',
        description: 'Undo',
        category: 'Edit',
        handler: () => console.log('Undo'),
        allowInInput: true,
        priority: 100
      },
      {
        id: 'redo',
        key: 'cmd+shift+z',
        description: 'Redo',
        category: 'Edit',
        handler: () => console.log('Redo'),
        allowInInput: true,
        priority: 100
      },
      {
        id: 'cut',
        key: 'cmd+x',
        description: 'Cut',
        category: 'Edit',
        handler: () => console.log('Cut'),
        allowInInput: true,
        priority: 50
      },
      {
        id: 'copy',
        key: 'cmd+c',
        description: 'Copy',
        category: 'Edit',
        handler: () => console.log('Copy'),
        allowInInput: true,
        priority: 50
      },
      {
        id: 'paste',
        key: 'cmd+v',
        description: 'Paste',
        category: 'Edit',
        handler: () => console.log('Paste'),
        allowInInput: true,
        priority: 50
      }
    ]
  },
  {
    id: 'development',
    title: 'Development',
    description: 'Development and debugging shortcuts',
    shortcuts: [
      {
        id: 'run-command',
        key: 'cmd+shift+p',
        description: 'Run command',
        category: 'Development',
        handler: () => console.log('Run command'),
        priority: 200
      },
      {
        id: 'toggle-terminal',
        key: 'cmd+j',
        description: 'Toggle terminal',
        category: 'Development',
        handler: () => console.log('Toggle terminal'),
        priority: 150
      },
      {
        id: 'toggle-sidebar',
        key: 'cmd+b',
        description: 'Toggle sidebar',
        category: 'Development',
        handler: () => console.log('Toggle sidebar'),
        priority: 100
      },
      {
        id: 'format-document',
        key: 'shift+alt+f',
        description: 'Format document',
        category: 'Development',
        handler: () => console.log('Format document'),
        priority: 100
      }
    ]
  },
  {
    id: 'system',
    title: 'System',
    description: 'System and application shortcuts',
    shortcuts: [
      {
        id: 'close-tab',
        key: 'cmd+w',
        description: 'Close tab',
        category: 'System',
        handler: () => console.log('Close tab'),
        priority: 100
      },
      {
        id: 'new-tab',
        key: 'cmd+t',
        description: 'New tab',
        category: 'System',
        handler: () => console.log('New tab'),
        priority: 100
      },
      {
        id: 'escape',
        key: 'escape',
        description: 'Escape / Cancel',
        category: 'System',
        handler: () => console.log('Escape'),
        priority: 300
      }
    ]
  }
];

// Utility function to format key combinations for display
export const formatKeyCombo = (keyCombo: string): string => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  
  return keyCombo
    .toLowerCase()
    .split('+')
    .map(key => {
      switch (key) {
        case 'cmd':
        case 'meta':
          return isMac ? '⌘' : 'Ctrl';
        case 'ctrl':
          return isMac ? '⌃' : 'Ctrl';
        case 'shift':
          return isMac ? '⇧' : 'Shift';
        case 'alt':
        case 'option':
          return isMac ? '⌥' : 'Alt';
        case 'space':
          return 'Space';
        case 'enter':
          return 'Enter';
        case 'escape':
          return 'Esc';
        case 'backspace':
          return 'Backspace';
        case 'delete':
          return 'Delete';
        case 'tab':
          return 'Tab';
        case 'arrowup':
          return '↑';
        case 'arrowdown':
          return '↓';
        case 'arrowleft':
          return '←';
        case 'arrowright':
          return '→';
        default:
          return key.toUpperCase();
      }
    })
    .join(isMac ? '' : '+');
};

// Display name for debugging
KeyboardProvider.displayName = 'KeyboardProvider';

export default KeyboardProvider;