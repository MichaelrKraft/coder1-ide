'use client';

import React, { useState } from 'react';
import { X, Search, Command } from 'lucide-react';

interface ShortcutItem {
  command: string;
  shortcut: string;
  description?: string;
}

interface ShortcutCategory {
  name: string;
  shortcuts: ShortcutItem[];
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts: ShortcutCategory[] = [
  {
    name: 'File',
    shortcuts: [
      { command: 'New File', shortcut: 'Ctrl+N', description: 'Create a new file' },
      { command: 'Open File', shortcut: 'Ctrl+O', description: 'Open an existing file' },
      { command: 'Save', shortcut: 'Ctrl+S', description: 'Save current file' },
      { command: 'Save As', shortcut: 'Ctrl+Shift+S', description: 'Save with a new name' },
      { command: 'Close Editor', shortcut: 'Ctrl+W', description: 'Close current editor' },
    ]
  },
  {
    name: 'Edit',
    shortcuts: [
      { command: 'Undo', shortcut: 'Ctrl+Z', description: 'Undo last action' },
      { command: 'Redo', shortcut: 'Ctrl+Y', description: 'Redo last undone action' },
      { command: 'Cut', shortcut: 'Ctrl+X', description: 'Cut selected text' },
      { command: 'Copy', shortcut: 'Ctrl+C', description: 'Copy selected text' },
      { command: 'Paste', shortcut: 'Ctrl+V', description: 'Paste from clipboard' },
      { command: 'Find', shortcut: 'Ctrl+F', description: 'Find in current file' },
      { command: 'Replace', shortcut: 'Ctrl+H', description: 'Find and replace' },
      { command: 'Select All', shortcut: 'Ctrl+A', description: 'Select all text' },
    ]
  },
  {
    name: 'View',
    shortcuts: [
      { command: 'Toggle Explorer', shortcut: 'Ctrl+Shift+E', description: 'Show/hide file explorer' },
      { command: 'Toggle Terminal', shortcut: 'Ctrl+`', description: 'Show/hide terminal' },
      { command: 'Toggle Output', shortcut: 'Ctrl+Shift+U', description: 'Show/hide output panel' },
      { command: 'Zoom In', shortcut: 'Ctrl+=', description: 'Increase font size' },
      { command: 'Zoom Out', shortcut: 'Ctrl+-', description: 'Decrease font size' },
      { command: 'Reset Zoom', shortcut: 'Ctrl+0', description: 'Reset to default size' },
    ]
  },
  {
    name: 'Run',
    shortcuts: [
      { command: 'Run Code', shortcut: 'F5', description: 'Execute current file' },
      { command: 'Debug', shortcut: 'F9', description: 'Start debugging session' },
      { command: 'Stop', shortcut: 'Shift+F5', description: 'Stop execution' },
      { command: 'Step Over', shortcut: 'F10', description: 'Step over in debugger' },
      { command: 'Step Into', shortcut: 'F11', description: 'Step into function' },
    ]
  },
  {
    name: 'Terminal',
    shortcuts: [
      { command: 'Clear Terminal', shortcut: 'Ctrl+L', description: 'Clear terminal output' },
      { command: 'Kill Process', shortcut: 'Ctrl+C', description: 'Terminate running process' },
      { command: 'New Terminal', shortcut: 'Ctrl+Shift+`', description: 'Open new terminal' },
    ]
  },
  {
    name: 'Navigation',
    shortcuts: [
      { command: 'Go to Line', shortcut: 'Ctrl+G', description: 'Jump to specific line' },
      { command: 'Go to Symbol', shortcut: 'Ctrl+Shift+O', description: 'Navigate to symbol' },
      { command: 'Go to File', shortcut: 'Ctrl+P', description: 'Quick file open' },
      { command: 'Next Tab', shortcut: 'Ctrl+Tab', description: 'Switch to next tab' },
      { command: 'Previous Tab', shortcut: 'Ctrl+Shift+Tab', description: 'Switch to previous tab' },
    ]
  },
  {
    name: 'AI Features',
    shortcuts: [
      { command: 'Toggle Supervision', shortcut: 'Ctrl+Shift+A', description: 'Enable/disable AI supervision' },
      { command: 'Session Summary', shortcut: 'Ctrl+Shift+S', description: 'Generate session summary' },
      { command: 'AI Explain', shortcut: 'Ctrl+Shift+E', description: 'Explain selected code' },
      { command: 'AI Fix', shortcut: 'Ctrl+Shift+F', description: 'Fix selected code with AI' },
    ]
  }
];

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter shortcuts based on search and category
  const filteredShortcuts = shortcuts
    .filter(category => !selectedCategory || category.name === selectedCategory)
    .map(category => ({
      ...category,
      shortcuts: category.shortcuts.filter(
        shortcut =>
          shortcut.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
          shortcut.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (shortcut.description && shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }))
    .filter(category => category.shortcuts.length > 0);

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const formatShortcut = (shortcut: string) => {
    if (isMac) {
      return shortcut
        .replace(/Ctrl/g, '⌘')
        .replace(/Alt/g, '⌥')
        .replace(/Shift/g, '⇧');
    }
    return shortcut;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-default">
          <div className="flex items-center gap-3">
            <Command className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-semibold text-text-primary">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-primary rounded transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-border-default">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border-default rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-orange-500/50"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 px-4 pt-4 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 text-sm rounded transition-all whitespace-nowrap ${
              !selectedCategory
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            All
          </button>
          {shortcuts.map(category => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-3 py-1.5 text-sm rounded transition-all whitespace-nowrap ${
                selectedCategory === category.name
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-auto p-4">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              No shortcuts found matching &quot;{searchTerm}&quot;
            </div>
          ) : (
            <div className="space-y-6">
              {filteredShortcuts.map(category => (
                <div key={category.name}>
                  <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-3">
                    {category.name}
                  </h3>
                  <div className="space-y-2">
                    {category.shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded hover:bg-bg-primary transition-colors"
                      >
                        <div className="flex-1">
                          <div className="text-text-primary">{shortcut.command}</div>
                          {shortcut.description && (
                            <div className="text-xs text-text-muted mt-0.5">{shortcut.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {formatShortcut(shortcut.shortcut).split('+').map((key, i) => (
                            <React.Fragment key={i}>
                              {i > 0 && <span className="text-text-muted">+</span>}
                              <kbd className="px-2 py-1 text-xs bg-bg-tertiary border border-border-default rounded font-mono">
                                {key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-default text-center text-xs text-text-muted">
          {isMac ? (
            <span>⌘ = Command, ⌥ = Option, ⇧ = Shift</span>
          ) : (
            <span>Shortcuts shown for Windows/Linux. On Mac, Ctrl = ⌘ Command</span>
          )}
        </div>
      </div>
    </div>
  );
}