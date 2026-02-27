'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Monitor, Terminal, Bot, Save, User, Palette, Code, Brain, Key, AlertCircle, CheckCircle, ExternalLink, LogOut, Calendar, Mail, CreditCard, Globe, Shield, GraduationCap } from 'lucide-react';
import { clientMemoryPreferences } from '@/lib/memory-preferences-client';
import { useAPIKeyStatus } from '@/hooks/useAPIKeyStatus';
import { APIKeyStorage, APIProvider } from '@/lib/api-key-storage';
import { APIKeySetupModal } from '@/components/settings/APIKeySetupModal';
import RemoteConnectionsTab from './settings/RemoteConnectionsTab';
import IntegrationsPanel from './settings/IntegrationsPanel';
import { SSHSetupModal } from './settings/SSHSetupModal';
import { SSHConnectionStorage } from '@/lib/ssh-connection-storage';
import type { SSHConnection } from '@/types/ssh';
import { ClaudeMdTab } from './claude-md';
import OnboardingAdminPanel from './onboarding/OnboardingAdminPanel';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
}

type SettingsTab = 'general' | 'editor' | 'terminal' | 'ai' | 'memory' | 'account' | 'remote' | 'team-brain' | 'onboarding-admin';

interface UserData {
  id: string;
  email: string;
  username: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  emailVerified: boolean;
  createdAt: string;
}

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
  
  // Claudish (Alternative Models)
  useClaudish: boolean;
  claudishModel: string;
  openrouterApiKey: string;
  
  // Memory
  memoryDetectionEnabled: boolean;
  memoryDetectionThreshold: number;
  memoryAutoGeneration: boolean;
  memoryEventTypes: {
    bugFix: boolean;
    featureCompletion: boolean;
    breakthrough: boolean;
    learning: boolean;
    architectureDecision: boolean;
    solutionDiscovery: boolean;
  };
  memoryNotifications: boolean;
  memoryNotificationSound: boolean;
  memoryTemplateCustomization: string;
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
  useClaudish: false,
  claudishModel: 'x-ai/grok-code-fast-1',
  openrouterApiKey: '',
  memoryDetectionEnabled: true,
  memoryDetectionThreshold: 70,
  memoryAutoGeneration: true,
  memoryEventTypes: {
    bugFix: true,
    featureCompletion: true,
    breakthrough: true,
    learning: true,
    architectureDecision: false,
    solutionDiscovery: false,
  },
  memoryNotifications: true,
  memoryNotificationSound: false,
  memoryTemplateCustomization: 'default',
};

export default function SettingsModal({ isOpen, onClose, fontSize, onFontSizeChange }: SettingsModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAPIKeySetup, setShowAPIKeySetup] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // SSH Remote Connections state
  const [sshConnections, setSSHConnections] = useState<SSHConnection[]>([]);
  const [activeSSHConnectionId, setActiveSSHConnectionId] = useState<string | null>(null);
  const [showSSHSetup, setShowSSHSetup] = useState(false);
  const [editingSSHConnection, setEditingSSHConnection] = useState<SSHConnection | null>(null);

  const apiKeyStatus = useAPIKeyStatus();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      // Load general settings from localStorage
      const savedSettings = localStorage.getItem('coder1-settings');
      let loadedSettings = defaultSettings;

      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        loadedSettings = { ...defaultSettings, ...parsed };
      } else if (fontSize) {
        loadedSettings = { ...loadedSettings, fontSize };
      }

      // Load memory preferences from database
      try {
        // First try migration from localStorage
        await clientMemoryPreferences.migrateFromLocalStorage();

        const memoryPrefs = await clientMemoryPreferences.getPreferences();
        loadedSettings = {
          ...loadedSettings,
          memoryDetectionEnabled: memoryPrefs.enabled,
          memoryDetectionThreshold: memoryPrefs.threshold,
          memoryAutoGeneration: memoryPrefs.autoGeneration,
          memoryEventTypes: memoryPrefs.eventTypes,
          memoryNotifications: memoryPrefs.notifications,
          memoryNotificationSound: memoryPrefs.notificationSound,
          memoryTemplateCustomization: memoryPrefs.templateType,
        };
      } catch (error) {
        console.error('Failed to load memory preferences from database:', error);
      }

      setSettings(loadedSettings);
    };

    loadSettings();
  }, [fontSize]);

  // Fetch user data when modal opens
  useEffect(() => {
    if (isOpen && !userData) {
      const fetchUserData = async () => {
        try {
          const response = await fetch('/api/v2/auth/me', {
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            setUserData(data.user);
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        } finally {
          setIsLoadingUser(false);
        }
      };

      fetchUserData();
    }

    if (isOpen) {
      fetch('/api/admin/auth')
        .then(r => r.json())
        .then(data => setIsAdmin(data.isAdmin === true))
        .catch(() => {});
    }
  }, [isOpen, userData]);

  // Load SSH connections
  useEffect(() => {
    const loadSSHConnections = () => {
      setSSHConnections(SSHConnectionStorage.getConnections());
      setActiveSSHConnectionId(SSHConnectionStorage.getActiveConnectionId());
    };

    loadSSHConnections();

    window.addEventListener('ssh-connections-updated', loadSSHConnections);
    return () => {
      window.removeEventListener('ssh-connections-updated', loadSSHConnections);
    };
  }, []);

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
  const saveSettings = async () => {
    // Save general settings to localStorage
    localStorage.setItem('coder1-settings', JSON.stringify(settings));
    setHasChanges(false);

    // Apply settings that need immediate effect
    if (onFontSizeChange) {
      onFontSizeChange(settings.fontSize);
    }

    try {
      // Save memory preferences to SQLite database
      await clientMemoryPreferences.savePreferences({
        enabled: settings.memoryDetectionEnabled,
        threshold: settings.memoryDetectionThreshold,
        autoGeneration: settings.memoryAutoGeneration,
        eventTypes: settings.memoryEventTypes,
        notifications: settings.memoryNotifications,
        notificationSound: settings.memoryNotificationSound,
        templateType: settings.memoryTemplateCustomization as any,
      });

      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2 rounded z-50';
      toast.textContent = '✅ Settings saved to SQLite database';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (error) {
      console.error('Failed to save memory preferences:', error);

      // Show error message
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded z-50';
      toast.textContent = '❌ Failed to save memory preferences';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/v2/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        // Clear local storage
        localStorage.clear();

        // Close modal
        onClose();

        // Redirect to login page
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  // SSH Connection handlers
  const handleAddSSHConnection = () => {
    setEditingSSHConnection(null);
    setShowSSHSetup(true);
  };

  const handleEditSSHConnection = (id: string) => {
    const conn = SSHConnectionStorage.getConnection(id);
    setEditingSSHConnection(conn);
    setShowSSHSetup(true);
  };

  const handleDeleteSSHConnection = (id: string) => {
    SSHConnectionStorage.deleteConnection(id);
  };

  const handleSSHConnect = (id: string) => {
    SSHConnectionStorage.setActiveConnectionId(id);
    const conn = SSHConnectionStorage.getConnection(id);
    if (conn) {
      SSHConnectionStorage.updateConnection(id, {
        lastStatus: 'connected',
        lastConnected: new Date().toISOString(),
      });
    }
  };

  const handleSSHDisconnect = () => {
    SSHConnectionStorage.setActiveConnectionId(null);
  };

  const handleSSHSave = (connection: SSHConnection) => {
    if (editingSSHConnection) {
      SSHConnectionStorage.updateConnection(connection.id, connection);
    } else {
      SSHConnectionStorage.saveConnection(connection);
    }
    setShowSSHSetup(false);
    setEditingSSHConnection(null);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general' as SettingsTab, label: 'General', icon: Monitor },
    { id: 'editor' as SettingsTab, label: 'Editor', icon: Code },
    { id: 'terminal' as SettingsTab, label: 'Terminal', icon: Terminal },
    { id: 'ai' as SettingsTab, label: 'AI/LLMs', icon: Bot },
    { id: 'memory' as SettingsTab, label: 'Memory', icon: Brain },
    { id: 'account' as SettingsTab, label: 'Account', icon: User },
    { id: 'remote' as SettingsTab, label: 'Remote', icon: Globe },
    { id: 'team-brain' as SettingsTab, label: 'Team Brain', icon: Brain },
    ...(isAdmin ? [{ id: 'onboarding-admin' as SettingsTab, label: 'Onboarding', icon: GraduationCap }] : []),
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
                      onChange={(e) => {
                        const newTheme = e.target.value as 'dark' | 'light';
                        updateSetting('theme', newTheme);
                        // Apply to DOM immediately
                        document.documentElement.classList.remove('dark', 'light');
                        document.documentElement.classList.add(newTheme);
                        // Persist immediately for fast page load (don't wait for Save)
                        const currentSettings = JSON.parse(localStorage.getItem('coder1-settings') || '{}');
                        currentSettings.theme = newTheme;
                        localStorage.setItem('coder1-settings', JSON.stringify(currentSettings));
                      }}
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text-primary">AI Settings</h3>
                  <button
                    onClick={() => setShowAPIKeySetup(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-coder1-cyan hover:bg-coder1-cyan-secondary text-white text-sm font-medium rounded transition-colors"
                  >
                    <Key className="w-4 h-4" />
                    Configure API Keys
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* API Provider Status */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      API Key Status
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* GLM Status Card */}
                      <div className={`p-4 rounded-lg border ${
                        apiKeyStatus.hasGLMKey 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-gray-800 border-border-default'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-sm font-medium text-text-primary">智谱 GLM 4.6</div>
                            <div className="text-xs text-text-muted">$0.10/M tokens</div>
                          </div>
                          {apiKeyStatus.hasGLMKey ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div className={`text-xs ${
                          apiKeyStatus.hasGLMKey ? 'text-green-300' : 'text-text-muted'
                        }`}>
                          {apiKeyStatus.hasGLMKey ? '✓ Configured' : 'Not configured'}
                        </div>
                        {apiKeyStatus.hasGLMKey && apiKeyStatus.activeProvider === 'glm' && (
                          <div className="mt-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded text-center">
                            ACTIVE
                          </div>
                        )}
                      </div>

                      {/* Anthropic Status Card */}
                      <div className={`p-4 rounded-lg border ${
                        apiKeyStatus.hasAnthropicKey 
                          ? 'bg-blue-500/10 border-blue-500/30' 
                          : 'bg-gray-800 border-border-default'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-sm font-medium text-text-primary">Anthropic Claude</div>
                            <div className="text-xs text-text-muted">$3.00/M tokens</div>
                          </div>
                          {apiKeyStatus.hasAnthropicKey ? (
                            <CheckCircle className="w-5 h-5 text-blue-400" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div className={`text-xs ${
                          apiKeyStatus.hasAnthropicKey ? 'text-blue-300' : 'text-text-muted'
                        }`}>
                          {apiKeyStatus.hasAnthropicKey ? '✓ Configured' : 'Not configured'}
                        </div>
                        {apiKeyStatus.hasAnthropicKey && apiKeyStatus.activeProvider === 'anthropic' && (
                          <div className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded text-center">
                            ACTIVE
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preference Display */}
                    <div className="p-3 bg-bg-tertiary rounded border border-border-default">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-primary">Provider Preference:</span>
                        <span className="text-sm font-semibold text-coder1-cyan">
                          {apiKeyStatus.preferredProvider === 'auto' 
                            ? 'Auto (Prefers GLM for cost)' 
                            : apiKeyStatus.preferredProvider === 'glm' 
                            ? 'Always GLM' 
                            : 'Always Anthropic'}
                        </span>
                      </div>
                    </div>

                    {/* Warning if no keys configured */}
                    {!apiKeyStatus.hasAnyKey && (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-yellow-300 font-semibold mb-1">
                            API Keys Required for AI Team
                          </p>
                          <p className="text-xs text-yellow-200/80 mb-3">
                            Configure at least one API key to use the Parallel Exploration (AI Team) feature.
                          </p>
                          <button
                            onClick={() => setShowAPIKeySetup(true)}
                            className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-medium rounded transition-colors"
                          >
                            Set Up API Keys
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Setup Guide Link */}
                    <a
                      href="https://docs.coder1.dev/ai-team/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-coder1-cyan hover:text-coder1-cyan-secondary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View API Key Setup Guide
                    </a>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border-default" />

                  {/* AI Feature Toggles */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      AI Features
                    </h4>
                    
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

                  {/* Divider */}
                  <div className="border-t border-border-default" />

                  {/* Alternative Models (Claudish) */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Alternative Models (Advanced)
                    </h4>
                    
                    <div className="p-4 bg-bg-tertiary rounded-lg border border-border-default space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.useClaudish}
                          onChange={(e) => {
                            updateSetting('useClaudish', e.target.checked);
                            // Sync to localStorage for CLI service
                            localStorage.setItem('use_claudish', e.target.checked.toString());
                          }}
                          className="rounded border-border-default"
                        />
                        <span className="text-sm font-medium text-text-primary">Enable Alternative Models (Claudish)</span>
                      </label>
                      
                      {/* OpenRouter API Key Input */}
                      {settings.useClaudish && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-text-primary">
                            <Key className="w-4 h-4 inline mr-1" />
                            OpenRouter API Key
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={settings.openrouterApiKey}
                              onChange={(e) => {
                                updateSetting('openrouterApiKey', e.target.value);
                                // Sync to localStorage for CLI service
                                localStorage.setItem('openrouter_api_key', e.target.value);
                              }}
                              placeholder="sk-or-v1-..."
                              className="flex-1 px-3 py-2 bg-bg-primary border border-border-default rounded text-text-primary text-sm"
                            />
                            {settings.openrouterApiKey && (
                              <CheckCircle className="w-5 h-5 text-green-500 self-center" />
                            )}
                          </div>
                          <p className="text-xs text-text-muted">
                            Get your API key from <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-coder1-cyan hover:underline">openrouter.ai</a>
                          </p>
                        </div>
                      )}
                      
                      <div className="text-xs text-text-muted space-y-2">
                        <p>
                          Access Grok, GPT-5, MiniMax, and other models via OpenRouter with 50-70% cost savings.
                        </p>
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-yellow-300 font-semibold mb-1">Requirements:</p>
                            <ul className="list-disc list-inside space-y-1 text-text-muted">
                              <li>Install: <code className="px-1 py-0.5 bg-bg-primary rounded">npm install -g claudish</code></li>
                              <li>OpenRouter API key (enter above when enabled)</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {settings.useClaudish && (
                        <div className="pt-3 border-t border-border-default">
                          <label className="block text-sm font-medium text-text-primary mb-2">
                            Model Selection
                          </label>
                          <select
                            value={settings.claudishModel}
                            onChange={(e) => {
                              updateSetting('claudishModel', e.target.value);
                              // Sync to localStorage for CLI service
                              localStorage.setItem('claudish_model', e.target.value);
                            }}
                            className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded text-text-primary text-sm"
                          >
                            <option value="x-ai/grok-code-fast-1">Grok Fast (Cheapest - ~$0.50/M)</option>
                            <option value="openai/gpt-5-codex">GPT-5 Codex (Balanced - ~$1.00/M)</option>
                            <option value="minimax/minimax-m2">MiniMax M2 (Alternative - ~$0.80/M)</option>
                            <option value="qwen/qwen3-vl-235b-a22b-instruct">Qwen 3 VL (Multimodal - ~$0.90/M)</option>
                            <option value="zhipu-ai/glm-4.6">GLM 4.6 (Chinese Market - ~$0.10/M)</option>
                          </select>
                          <p className="text-xs text-text-muted mt-2">
                            Selected model will be used for all AI features when Claudish is enabled.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border-default" />

                  {/* Legacy API Keys (for other features) */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-text-primary">Legacy API Keys</h4>
                    <p className="text-xs text-text-muted">
                      These keys are used for AI supervision and session summaries (not AI Team)
                    </p>
                    
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

                {/* API Key Setup Modal */}
                {showAPIKeySetup && (
                  <APIKeySetupModal
                    isOpen={showAPIKeySetup}
                    onClose={() => setShowAPIKeySetup(false)}
                    onComplete={() => setShowAPIKeySetup(false)}
                  />
                )}
              </div>
            )}

            {activeTab === 'memory' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Memory System Settings</h3>
                
                <div className="space-y-4">
                  {/* Master Toggle */}
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.memoryDetectionEnabled}
                        onChange={(e) => updateSetting('memoryDetectionEnabled', e.target.checked)}
                        className="rounded border-border-default"
                      />
                      <span className="text-sm text-text-primary font-medium">Enable Memory Detection</span>
                    </label>
                    <p className="text-xs text-text-muted mt-1 ml-6">
                      Automatically detect and suggest memory-worthy events during coding sessions
                    </p>
                  </div>

                  {settings.memoryDetectionEnabled && (
                    <>
                      {/* Detection Threshold */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Detection Threshold: {settings.memoryDetectionThreshold}%
                        </label>
                        <input
                          type="range"
                          value={settings.memoryDetectionThreshold}
                          onChange={(e) => updateSetting('memoryDetectionThreshold', parseInt(e.target.value))}
                          min="0"
                          max="100"
                          step="5"
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-text-muted mt-1">
                          <span>Conservative (0%)</span>
                          <span>Balanced (70%)</span>
                          <span>Aggressive (100%)</span>
                        </div>
                      </div>

                      {/* Auto-Generation */}
                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.memoryAutoGeneration}
                            onChange={(e) => updateSetting('memoryAutoGeneration', e.target.checked)}
                            className="rounded border-border-default"
                          />
                          <span className="text-sm text-text-primary">Auto-generate memories above threshold</span>
                        </label>
                        <p className="text-xs text-text-muted mt-1 ml-6">
                          Automatically create memories when confidence exceeds {settings.memoryDetectionThreshold}%
                        </p>
                      </div>

                      {/* Event Type Toggles */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Detect Event Types
                        </label>
                        <div className="space-y-2 ml-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.memoryEventTypes.bugFix}
                              onChange={(e) => updateSetting('memoryEventTypes', {...settings.memoryEventTypes, bugFix: e.target.checked})}
                              className="rounded border-border-default"
                            />
                            <span className="text-sm text-text-secondary">🐛 Bug Fixes</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.memoryEventTypes.featureCompletion}
                              onChange={(e) => updateSetting('memoryEventTypes', {...settings.memoryEventTypes, featureCompletion: e.target.checked})}
                              className="rounded border-border-default"
                            />
                            <span className="text-sm text-text-secondary">✨ Feature Completions</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.memoryEventTypes.breakthrough}
                              onChange={(e) => updateSetting('memoryEventTypes', {...settings.memoryEventTypes, breakthrough: e.target.checked})}
                              className="rounded border-border-default"
                            />
                            <span className="text-sm text-text-secondary">🎯 Breakthroughs</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.memoryEventTypes.learning}
                              onChange={(e) => updateSetting('memoryEventTypes', {...settings.memoryEventTypes, learning: e.target.checked})}
                              className="rounded border-border-default"
                            />
                            <span className="text-sm text-text-secondary">📚 Learning Moments</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.memoryEventTypes.architectureDecision}
                              onChange={(e) => updateSetting('memoryEventTypes', {...settings.memoryEventTypes, architectureDecision: e.target.checked})}
                              className="rounded border-border-default"
                            />
                            <span className="text-sm text-text-secondary">🏗️ Architecture Decisions</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.memoryEventTypes.solutionDiscovery}
                              onChange={(e) => updateSetting('memoryEventTypes', {...settings.memoryEventTypes, solutionDiscovery: e.target.checked})}
                              className="rounded border-border-default"
                            />
                            <span className="text-sm text-text-secondary">💡 Solution Discoveries</span>
                          </label>
                        </div>
                      </div>

                      {/* Notifications */}
                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.memoryNotifications}
                            onChange={(e) => updateSetting('memoryNotifications', e.target.checked)}
                            className="rounded border-border-default"
                          />
                          <span className="text-sm text-text-primary">Show memory notifications</span>
                        </label>
                        {settings.memoryNotifications && (
                          <label className="flex items-center gap-2 ml-6 mt-2">
                            <input
                              type="checkbox"
                              checked={settings.memoryNotificationSound}
                              onChange={(e) => updateSetting('memoryNotificationSound', e.target.checked)}
                              className="rounded border-border-default"
                            />
                            <span className="text-sm text-text-secondary">Play notification sound</span>
                          </label>
                        )}
                      </div>

                      {/* Template Customization */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Memory Template
                        </label>
                        <select
                          value={settings.memoryTemplateCustomization}
                          onChange={(e) => updateSetting('memoryTemplateCustomization', e.target.value)}
                          className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded text-text-primary"
                        >
                          <option value="default">Default Template</option>
                          <option value="detailed">Detailed Template</option>
                          <option value="minimal">Minimal Template</option>
                          <option value="technical">Technical Template</option>
                          <option value="learning">Learning-Focused Template</option>
                        </select>
                        <p className="text-xs text-text-muted mt-1">
                          Choose how memories are formatted and what details to include
                        </p>
                      </div>
                    </>
                  )}
                  
                  {/* Phase II Complete Notice */}
                  <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-green-400 mb-2">
                      <Brain className="w-4 h-4" />
                      Memory System Phase II - COMPLETE ✅
                    </h4>
                    <div className="space-y-2 text-sm text-text-secondary">
                      <p>
                        <span className="text-green-400 font-medium">SQLite Persistence Active:</span>{' '}
                        All preferences stored in production database
                      </p>
                      <p className="text-xs">
                        ✅ SQLite database storage with ACID properties<br/>
                        ✅ Automatic migration from localStorage completed<br/>
                        ✅ Full memory management interface at <code>/memories</code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'remote' && (
              <div className="space-y-8">
                {/* Deployment Integrations (Composio) */}
                <IntegrationsPanel />

                {/* Divider */}
                <div className="border-t border-border-default" />

                {/* SSH Remote Connections */}
                <RemoteConnectionsTab
                  connections={sshConnections}
                  activeConnectionId={activeSSHConnectionId}
                  onAdd={handleAddSSHConnection}
                  onEdit={handleEditSSHConnection}
                  onDelete={handleDeleteSSHConnection}
                  onConnect={handleSSHConnect}
                  onDisconnect={handleSSHDisconnect}
                />
              </div>
            )}

            {activeTab === 'team-brain' && (
              <ClaudeMdTab teamId={userData?.id ?? null} />
            )}



            {activeTab === 'onboarding-admin' && (
              <div className="p-4">
                <OnboardingAdminPanel teamId={userData?.id ?? null} />
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Account Information</h3>

                {isLoadingUser ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coder1-cyan"></div>
                  </div>
                ) : userData ? (
                  <div className="space-y-6">
                    {/* User Profile Card */}
                    <div className="p-6 bg-bg-tertiary rounded-lg border border-border-default">
                      <div className="flex items-start gap-4">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.3) 0%, rgba(251, 146, 60, 0.3) 100%)',
                            border: '2px solid rgba(0, 217, 255, 0.5)',
                            color: '#00D9FF',
                            boxShadow: '0 0 20px rgba(0, 217, 255, 0.4)',
                          }}
                        >
                          {userData.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xl font-semibold text-text-primary mb-1">
                            {userData.username}
                          </h4>
                          <p className="text-sm text-text-muted mb-3 break-all">
                            {userData.email}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-coder1-cyan/20 border border-coder1-cyan/40 rounded-md text-sm font-medium text-coder1-cyan">
                              {userData.subscriptionTier}
                            </span>
                            {userData.emailVerified && (
                              <span className="px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-md text-sm font-medium text-green-400">
                                ✓ Email Verified
                              </span>
                            )}
                            <span className={`px-3 py-1 rounded-md text-sm font-medium ${
                              userData.subscriptionStatus === 'active'
                                ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                                : 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400'
                            }`}>
                              {userData.subscriptionStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Account Details
                      </h4>

                      <div className="grid grid-cols-1 gap-3">
                        {/* User ID */}
                        <div className="p-3 bg-bg-tertiary rounded border border-border-default">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-text-muted mb-1">User ID</div>
                              <div className="text-sm text-text-primary font-mono">{userData.id}</div>
                            </div>
                          </div>
                        </div>

                        {/* Email */}
                        <div className="p-3 bg-bg-tertiary rounded border border-border-default">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-text-muted mb-1 flex items-center gap-2">
                                <Mail className="w-3 h-3" />
                                Email Address
                              </div>
                              <div className="text-sm text-text-primary break-all">{userData.email}</div>
                            </div>
                          </div>
                        </div>

                        {/* Account Created */}
                        <div className="p-3 bg-bg-tertiary rounded border border-border-default">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-text-muted mb-1 flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                Account Created
                              </div>
                              <div className="text-sm text-text-primary">{formatDate(userData.createdAt)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Subscription */}
                        <div className="p-3 bg-bg-tertiary rounded border border-border-default">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-text-muted mb-1 flex items-center gap-2">
                                <CreditCard className="w-3 h-3" />
                                Subscription
                              </div>
                              <div className="text-sm text-text-primary capitalize">{userData.subscriptionTier}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border-default" />

                    {/* Security Section */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        Security
                      </h4>

                      <button
                        onClick={async () => {
                          if (!userData?.email) return;

                          try {
                            const response = await fetch('/api/v2/auth/reset-password', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: userData.email }),
                            });

                            const data = await response.json();

                            if (response.ok) {
                              alert('Password reset email sent! Check your inbox.');
                            } else {
                              alert(data.error || 'Failed to send reset email');
                            }
                          } catch (error) {
                            alert('An error occurred. Please try again.');
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-transparent hover:bg-cyan-500/10 border border-border-default hover:border-cyan-500/40 rounded text-text-muted hover:text-cyan-400 text-sm transition-all"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Change Password
                      </button>

                      <p className="text-xs text-text-muted">
                        Click to receive a password reset email
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border-default" />

                    {/* Admin Panel - only visible when admin cookie is present */}
                    {isAdmin && (
                      <>
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                            <Shield className="w-4 h-4 text-cyan-400" />
                            Admin
                          </h4>
                          <a
                            href="/admin/overview"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded text-cyan-400 hover:text-cyan-300 text-sm transition-all"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            Open Admin Dashboard
                          </a>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-border-default" />
                      </>
                    )}

                    {/* Account Actions */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-text-muted flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Account Actions
                      </h4>

                      <button
                        onClick={handleLogout}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-transparent hover:bg-red-500/10 border border-border-default hover:border-red-500/40 rounded text-text-muted hover:text-red-400 text-sm transition-all"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Logout
                      </button>

                      <p className="text-xs text-text-muted text-center">
                        You will be redirected to the login page
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-sm text-yellow-300">
                      Unable to load account information. Please try refreshing the page.
                    </p>
                  </div>
                )}
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

      {showSSHSetup && (
        <SSHSetupModal
          isOpen={showSSHSetup}
          onClose={() => {
            setShowSSHSetup(false);
            setEditingSSHConnection(null);
          }}
          onSave={handleSSHSave}
          editingConnection={editingSSHConnection}
        />
      )}
    </div>
  );
}