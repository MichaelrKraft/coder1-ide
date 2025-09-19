import React, { useState, useCallback } from 'react';
import { 
  KeyboardProvider, 
  useKeyboardShortcuts, 
  useKeyboardShortcutGroup,
  createDefaultShortcuts,
  KeyboardShortcut,
  ShortcutGroup
} from './KeyboardShortcuts';
import KeyboardShortcutsPanel from './KeyboardShortcutsPanel';
import Button from './Button';
import { useDesignTokens } from './useDesignTokens';

// Demo component that uses keyboard shortcuts
const KeyboardShortcutsDemo: React.FC = () => {
  return (
    <KeyboardProvider>
      <KeyboardShortcutsDemoContent />
    </KeyboardProvider>
  );
};

// Demo content with shortcuts functionality
const KeyboardShortcutsDemoContent: React.FC = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [demoOutput, setDemoOutput] = useState<string[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  
  const { colors, getSpacing, tokens } = useDesignTokens();
  const keyboardShortcuts = useKeyboardShortcuts();
  
  // Add demo output message
  const addOutput = useCallback((message: string) => {
    setDemoOutput(prev => [
      `${new Date().toLocaleTimeString()}: ${message}`,
      ...prev.slice(0, 9) // Keep last 10 messages
    ]);
  }, []);
  
  // Demo shortcuts group
  const demoShortcuts: ShortcutGroup = {
    id: 'demo-shortcuts',
    title: 'Demo Actions',
    description: 'Shortcuts for this demo',
    shortcuts: [
      {
        id: 'show-shortcuts',
        key: 'cmd+/',
        description: 'Show keyboard shortcuts',
        category: 'Demo',
        handler: () => {
          setPanelOpen(true);
          addOutput('Opened keyboard shortcuts panel');
        },
        priority: 300
      },
      {
        id: 'clear-output',
        key: 'cmd+k',
        description: 'Clear output',
        category: 'Demo',
        handler: () => {
          setDemoOutput([]);
          addOutput('Output cleared');
        },
        priority: 200
      },
      {
        id: 'demo-alert',
        key: 'cmd+shift+d',
        description: 'Show demo alert',
        category: 'Demo',
        handler: () => {
          addOutput('Demo alert triggered!');
          alert('Demo shortcut executed! 🎉');
        },
        priority: 100
      },
      {
        id: 'select-all-demo',
        key: 'cmd+a',
        description: 'Select all text (demo)',
        category: 'Demo',
        handler: (event) => {
          const target = event.target as HTMLElement;
          if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
            return; // Let native behavior handle it
          }
          setSelectedText('All demo text selected!');
          addOutput('Selected all demo text');
        },
        allowInInput: false,
        priority: 50
      }
    ]
  };
  
  // Register demo shortcuts
  useKeyboardShortcutGroup(demoShortcuts);
  
  // Register default IDE shortcuts
  React.useEffect(() => {
    const defaultGroups = createDefaultShortcuts();
    
    // Override some default shortcuts with demo functionality
    const enhancedGroups = defaultGroups.map(group => ({
      ...group,
      shortcuts: group.shortcuts.map(shortcut => ({
        ...shortcut,
        handler: () => {
          addOutput(`Executed: ${shortcut.description}`);
          // In a real IDE, these would perform actual actions
        }
      }))
    }));
    
    enhancedGroups.forEach(group => {
      keyboardShortcuts.registerGroup(group);
    });
    
    return () => {
      enhancedGroups.forEach(group => {
        keyboardShortcuts.unregisterGroup(group.id);
      });
    };
  }, [keyboardShortcuts, addOutput]);
  
  // Demo text editor state
  const [editorText, setEditorText] = useState(`Welcome to the Keyboard Shortcuts Demo!

Try these shortcuts:
• Cmd+/ (or Ctrl+/) - Show shortcuts panel
• Cmd+K - Clear output
• Cmd+Shift+D - Show demo alert
• Cmd+A - Select all (when not in input)
• Cmd+S - Save (demo)
• Cmd+Z - Undo (demo)
• Escape - Close any open panels

Type in this editor and try the shortcuts!`);
  
  return (
    <div style={{
      fontFamily: 'var(--font-family-sans)',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: getSpacing(6),
      backgroundColor: colors.background,
      color: colors.textPrimary,
      minHeight: '100vh'
    }}>
      <h1 style={{
        fontSize: 'var(--font-size-3xl)',
        fontWeight: 'var(--font-weight-bold)',
        marginBottom: getSpacing(6),
        color: colors.primary
      }}>
        ⌨️ Design System - Keyboard Shortcuts
      </h1>
      
      {/* Demo Controls */}
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Interactive Demo
        </h2>
        
        <div style={{ display: 'flex', gap: getSpacing(3), marginBottom: getSpacing(4), flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            onClick={() => setPanelOpen(true)}
          >
            Show Shortcuts Panel (Cmd+/)
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => {
              setDemoOutput([]);
              addOutput('Output cleared');
            }}
          >
            Clear Output (Cmd+K)
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              addOutput('Demo alert triggered!');
              alert('Demo shortcut executed! 🎉');
            }}
          >
            Demo Alert (Cmd+Shift+D)
          </Button>
        </div>
        
        <div style={{
          padding: getSpacing(3),
          backgroundColor: colors.surface,
          borderRadius: 'var(--border-radius-md)',
          border: `1px solid ${colors.border}`,
          fontSize: 'var(--font-size-sm)',
          color: colors.textSecondary
        }}>
          <strong>💡 Tip:</strong> Try using the keyboard shortcuts instead of clicking the buttons. 
          The shortcuts work globally when this demo is in focus.
        </div>
      </section>
      
      {/* Mock Editor */}
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Mock Code Editor
        </h2>
        
        <div style={{
          border: `1px solid ${colors.border}`,
          borderRadius: 'var(--border-radius-md)',
          overflow: 'hidden'
        }}>
          {/* Editor toolbar */}
          <div style={{
            padding: getSpacing(2),
            backgroundColor: colors.surface,
            borderBottom: `1px solid ${colors.borderSubtle}`,
            display: 'flex',
            alignItems: 'center',
            gap: getSpacing(3),
            fontSize: 'var(--font-size-xs)',
            color: colors.textSecondary
          }}>
            <span>📄 demo.txt</span>
            <span>•</span>
            <span>Line 1, Column 1</span>
            {selectedText && (
              <>
                <span>•</span>
                <span style={{ color: colors.primary }}>{selectedText}</span>
              </>
            )}
          </div>
          
          {/* Editor content */}
          <textarea
            value={editorText}
            onChange={e => setEditorText(e.target.value)}
            style={{
              width: '100%',
              height: '300px',
              padding: getSpacing(4),
              border: 'none',
              outline: 'none',
              backgroundColor: colors.background,
              color: colors.textPrimary,
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family-mono)',
              lineHeight: 1.6,
              resize: 'vertical'
            }}
            placeholder="Start typing..."
          />
        </div>
      </section>
      
      {/* Output Log */}
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Action Log
        </h2>
        
        <div style={{
          height: '200px',
          border: `1px solid ${colors.border}`,
          borderRadius: 'var(--border-radius-md)',
          backgroundColor: colors.surface,
          padding: getSpacing(3),
          overflowY: 'auto',
          fontFamily: 'var(--font-family-mono)',
          fontSize: 'var(--font-size-xs)'
        }}>
          {demoOutput.length === 0 ? (
            <div style={{ color: colors.textTertiary, fontStyle: 'italic' }}>
              No actions yet. Try using some keyboard shortcuts!
            </div>
          ) : (
            demoOutput.map((line, index) => (
              <div
                key={index}
                style={{
                  marginBottom: getSpacing(1),
                  color: colors.textSecondary,
                  opacity: 1 - (index * 0.1) // Fade older entries
                }}
              >
                {line}
              </div>
            ))
          )}
        </div>
      </section>
      
      {/* Features Overview */}
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Keyboard Shortcuts System Features
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: getSpacing(4)
        }}>
          {[
            {
              title: 'Global Shortcuts',
              description: 'System-wide keyboard shortcuts that work across all components',
              icon: '🌐'
            },
            {
              title: 'Context Awareness',
              description: 'Shortcuts can be enabled/disabled based on context and conditions',
              icon: '🎯'
            },
            {
              title: 'Priority System',
              description: 'Higher priority shortcuts override lower ones when conflicts occur',
              icon: '📊'
            },
            {
              title: 'Input Field Handling',
              description: 'Smart detection of input fields with configurable bypass options',
              icon: '⌨️'
            },
            {
              title: 'Grouping & Organization',
              description: 'Organize related shortcuts into logical groups and categories',
              icon: '📁'
            },
            {
              title: 'Visual Management',
              description: 'Browse, search, and manage shortcuts through a comprehensive panel',
              icon: '🔍'
            },
            {
              title: 'Cross-Platform',
              description: 'Automatically adapts Cmd/Ctrl keys for Mac/Windows compatibility',
              icon: '💻'
            },
            {
              title: 'Performance Optimized',
              description: 'Efficient event handling with minimal performance impact',
              icon: '⚡'
            }
          ].map((feature, index) => (
            <div
              key={index}
              style={{
                padding: getSpacing(4),
                border: `1px solid ${colors.border}`,
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: colors.surface
              }}
            >
              <div style={{
                fontSize: 'var(--font-size-2xl)',
                marginBottom: getSpacing(2)
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: getSpacing(2),
                color: colors.textPrimary
              }}>
                {feature.title}
              </h3>
              <p style={{
                color: colors.textSecondary,
                fontSize: 'var(--font-size-sm)',
                lineHeight: 1.5,
                margin: 0
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
      
      {/* Usage Instructions */}
      <section>
        <h2 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Implementation Guide
        </h2>
        
        <div style={{
          padding: getSpacing(4),
          backgroundColor: colors.surface,
          borderRadius: 'var(--border-radius-md)',
          border: `1px solid ${colors.border}`
        }}>
          <pre style={{
            color: colors.textSecondary,
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family-mono)',
            lineHeight: 1.6,
            margin: 0,
            whiteSpace: 'pre-wrap'
          }}>
{`// 1. Wrap your app with KeyboardProvider
<KeyboardProvider>
  <App />
</KeyboardProvider>

// 2. Register shortcuts in components
const { registerShortcut } = useKeyboardShortcuts();

useEffect(() => {
  registerShortcut({
    id: 'save',
    key: 'cmd+s',
    description: 'Save file',
    handler: () => saveFile(),
    allowInInput: true
  });
}, []);

// 3. Use shortcut groups for organization
useKeyboardShortcutGroup({
  id: 'file-operations',
  title: 'File Operations',
  shortcuts: [
    { id: 'new', key: 'cmd+n', description: 'New file', handler: newFile },
    { id: 'open', key: 'cmd+o', description: 'Open file', handler: openFile }
  ]
});`}
          </pre>
        </div>
      </section>
      
      {/* Keyboard Shortcuts Panel */}
      <KeyboardShortcutsPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        searchable={true}
        showCategories={true}
        allowCustomization={false}
      />
    </div>
  );
};

export default KeyboardShortcutsDemo;