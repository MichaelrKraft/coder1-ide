'use client';

import React, { useState, useEffect } from 'react';
import { X, Monitor, Terminal, Bot, Save, User, Palette, Code } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
}

type SettingsTab = 'general' | 'editor' | 'terminal' | 'ai';

interface Settings {
  // General
  theme: 'dark' | 'light';
  autoSave: boolean;
  autoSaveDelay: number;
  
  // Editor
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  
  // Terminal
  terminalFontSize: number;
  terminalFontFamily: string;
  terminalScrollback: number;
  
  // AI
  aiSupervision: boolean;
  aiSuggestions: boolean;
  claudeApiKey: string;
  openaiApiKey: string;
}

const defaultSettings: Settings = {
  theme: 'dark',
  autoSave: true,
  autoSaveDelay: 1000,
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  lineNumbers: true,
  terminalFontSize: 13,
  terminalFontFamily: 'monospace',
  terminalScrollback: 1000,
  aiSupervision: true,
  aiSuggestions: true,
  claudeApiKey: '',
  openaiApiKey: '',
};

export default function SettingsModal({ isOpen, onClose, fontSize, onFontSizeChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('coder1-settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings({ ...defaultSettings, ...parsed });
    } else if (fontSize) {
      setSettings(prev => ({ ...prev, fontSize }));
    }
  }, [fontSize]);

  // Update settings
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    
    // Apply font size immediately if changed
    if (key === 'fontSize' && onFontSizeChange) {
      onFontSizeChange(value as number);
    }
  };

  // Save settings
  const saveSettings = () => {
    localStorage.setItem('coder1-settings', JSON.stringify(settings));
    setHasChanges(false);
    
    // Apply settings that need immediate effect
    if (onFontSizeChange) {
      onFontSizeChange(settings.fontSize);
    }
    
    // Show success message
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2 rounded z-50';
    toast.textContent = 'Settings saved successfully';
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general' as SettingsTab, label: 'General', icon: Monitor },
    { id: 'editor' as SettingsTab, label: 'Editor', icon: Code },
    { id: 'terminal' as SettingsTab, label: 'Terminal', icon: Terminal },
    { id: 'ai' as SettingsTab, label: 'AI', icon: Bot },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-default">
          <h2 className="text-xl font-semibold text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-primary rounded transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-border-default p-4">
            <nav className="space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded transition-all ${
                      activeTab === tab.id
                        ? 'bg-orange-500/20 text-orange-400 border-l-2 border-orange-500'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Settings Panel */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">General Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Theme
                    </label>
                    <select
                      value={settings.theme}
                      onChange={(e) => updateSetting('theme', e.target.value as 'dark' | 'light')}
                      className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded text-text-primary"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.autoSave}
                        onChange={(e) => updateSetting('autoSave', e.target.checked)}
                        className="rounded border-border-default"
                      />
                      <span className="text-sm text-text-primary">Enable Auto-save</span>
                    </label>
                  </div>

                  {settings.autoSave && (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Auto-save Delay (ms)
                      </label>
                      <input
                        type="number"
                        value={settings.autoSaveDelay}
                        onChange={(e) => updateSetting('autoSaveDelay', parseInt(e.target.value))}
                        min="500"
                        max="10000"
                        step="500"
                        className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded text-text-primary"
                      />
                    </div>
                  )}

                  {/* Alpha Release Notice */}
                  <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-orange-400 mb-2">
                      <Monitor className="w-4 h-4" />
                      Alpha Release Status
                    </h4>
                    <div className="space-y-2 text-sm text-text-secondary">
                      <p>
                        <span className="text-orange-400 font-medium">Enhanced StatusLine:</span>{' '}
                        Temporarily disabled during alpha testing. 
                      </p>
                      <p className="text-xs">
                        Advanced status components (model info, cost tracking, repo stats) will be available in the next release. 
                        Core IDE functionality is fully operational.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Editor Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Font Size: {settings.fontSize}px
                    </label>
                    <input
                      type="range"
                      value={settings.fontSize}
                      onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                      min="10"
                      max="24"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Tab Size: {settings.tabSize}
                    </label>
                    <input
                      type="range"
                      value={settings.tabSize}
                      onChange={(e) => updateSetting('tabSize', parseInt(e.target.value))}
                      min="2"
                      max="8"
                      step="2"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.wordWrap}
                        onChange={(e) => updateSetting('wordWrap', e.target.checked)}
                        className="rounded border-border-default"
                      />
                      <span className="text-sm text-text-primary">Word Wrap</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.minimap}
                        onChange={(e) => updateSetting('minimap', e.target.checked)}
                        className="rounded border-border-default"
                      />
                      <span className="text-sm text-text-primary">Show Minimap</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.lineNumbers}
                        onChange={(e) => updateSetting('lineNumbers', e.target.checked)}
                        className="rounded border-border-default"
                      />
                      <span className="text-sm text-text-primary">Show Line Numbers</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'terminal' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Terminal Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Terminal Font Size: {settings.terminalFontSize}px
                    </label>
                    <input
                      type="range"
                      value={settings.terminalFontSize}
                      onChange={(e) => updateSetting('terminalFontSize', parseInt(e.target.value))}
                      min="10"
                      max="20"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Font Family
                    </label>
                    <select
                      value={settings.terminalFontFamily}
                      onChange={(e) => updateSetting('terminalFontFamily', e.target.value)}
                      className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded text-text-primary"
                    >
                      <option value="monospace">Monospace</option>
                      <option value="'Courier New', monospace">Courier New</option>
                      <option value="'Fira Code', monospace">Fira Code</option>
                      <option value="'Cascadia Code', monospace">Cascadia Code</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Scrollback Lines: {settings.terminalScrollback}
                    </label>
                    <input
                      type="range"
                      value={settings.terminalScrollback}
                      onChange={(e) => updateSetting('terminalScrollback', parseInt(e.target.value))}
                      min="100"
                      max="10000"
                      step="100"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">AI Settings</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.aiSupervision}
                        onChange={(e) => updateSetting('aiSupervision', e.target.checked)}
                        className="rounded border-border-default"
                      />
                      <span className="text-sm text-text-primary">Enable AI Supervision</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.aiSuggestions}
                        onChange={(e) => updateSetting('aiSuggestions', e.target.checked)}
                        className="rounded border-border-default"
                      />
                      <span className="text-sm text-text-primary">Enable AI Suggestions</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Claude API Key
                    </label>
                    <input
                      type="password"
                      value={settings.claudeApiKey}
                      onChange={(e) => updateSetting('claudeApiKey', e.target.value)}
                      placeholder="sk-ant-api..."
                      className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded text-text-primary"
                    />
                    <p className="text-xs text-text-muted mt-1">
                      Used for AI supervision and session summaries
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      OpenAI API Key (Optional)
                    </label>
                    <input
                      type="password"
                      value={settings.openaiApiKey}
                      onChange={(e) => updateSetting('openaiApiKey', e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded text-text-primary"
                    />
                    <p className="text-xs text-text-muted mt-1">
                      Used as fallback when Claude is unavailable
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-border-default">
          <div className="text-sm text-text-muted">
            {hasChanges && <span className="text-orange-400">You have unsaved changes</span>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              disabled={!hasChanges}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}