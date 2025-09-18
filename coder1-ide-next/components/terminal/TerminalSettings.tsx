'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Zap, Speaker, ChevronDown, Shield, BarChart } from 'lucide-react';
import { soundAlertService, SoundPreset } from '@/lib/sound-alert-service';
import { logger } from '@/lib/logger';

interface TerminalSettingsProps {
  // Existing thinking mode props
  thinkingMode: 'normal' | 'think' | 'think_hard' | 'ultrathink';
  setThinkingMode: (mode: 'normal' | 'think' | 'think_hard' | 'ultrathink') => void;
  showThinkingDropdown: boolean;
  setShowThinkingDropdown: (show: boolean) => void;
  
  // Existing audio alerts props
  audioAlertsEnabled: boolean;
  setAudioAlertsEnabled: (enabled: boolean) => void;
  selectedSoundPreset: SoundPreset;
  setSelectedSoundPreset: (preset: SoundPreset) => void;
  showSoundPresetDropdown: boolean;
  setShowSoundPresetDropdown: (show: boolean) => void;
  soundButtonRef: React.RefObject<HTMLButtonElement>;
  soundDropdownRef: React.RefObject<HTMLDivElement>;
  
  // New terminal settings props (connecting to parent state)
  terminalSettings: TerminalSettingsState;
  setTerminalSettings: (settings: TerminalSettingsState) => void;
  
  // Terminal reference for writeln
  xtermRef: React.RefObject<any>;
}

interface TerminalSettingsState {
  skipPermissions: boolean;
  statusLine: {
    enabled: boolean;
    showFile: boolean;
    showModel: boolean;
    showTokens: boolean;
  };
}

export default function TerminalSettings({
  thinkingMode,
  setThinkingMode,
  showThinkingDropdown,
  setShowThinkingDropdown,
  audioAlertsEnabled,
  setAudioAlertsEnabled,
  selectedSoundPreset,
  setSelectedSoundPreset,
  showSoundPresetDropdown,
  setShowSoundPresetDropdown,
  soundButtonRef,
  soundDropdownRef,
  terminalSettings,
  setTerminalSettings,
  xtermRef
}: TerminalSettingsProps) {
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside both the dropdown and the settings button
      const isOutsideDropdown = settingsDropdownRef.current && !settingsDropdownRef.current.contains(target);
      const isOutsideButton = settingsButtonRef.current && !settingsButtonRef.current.contains(target);
      
      if (showSettingsDropdown && isOutsideDropdown && isOutsideButton) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsDropdown]);

  // Listen for tour events to open/close settings
  useEffect(() => {
    const handleOpenSettings = () => {
      calculateDropdownPosition();
      setShowSettingsDropdown(true);
    };
    
    const handleCloseSettings = () => {
      setShowSettingsDropdown(false);
    };
    
    window.addEventListener('tour:openTerminalSettings', handleOpenSettings);
    window.addEventListener('tour:closeTerminalSettings', handleCloseSettings);
    
    return () => {
      window.removeEventListener('tour:openTerminalSettings', handleOpenSettings);
      window.removeEventListener('tour:closeTerminalSettings', handleCloseSettings);
    };
  }, []);

  // Recalculate position on scroll/resize when dropdown is open
  useEffect(() => {
    if (!showSettingsDropdown) return;

    const handlePositionUpdate = () => {
      calculateDropdownPosition();
    };

    window.addEventListener('scroll', handlePositionUpdate, true);
    window.addEventListener('resize', handlePositionUpdate);
    
    return () => {
      window.removeEventListener('scroll', handlePositionUpdate, true);
      window.removeEventListener('resize', handlePositionUpdate);
    };
  }, [showSettingsDropdown]);

  // Calculate dropdown position based on button location
  const calculateDropdownPosition = () => {
    if (settingsButtonRef.current) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Updated dropdown height to match new max-height
      const dropdownHeight = 520; // Matches max-h-[520px]
      const dropdownWidth = 280;
      
      let top = rect.bottom + 8; // Gap below button
      let left = rect.left;
      
      // Check if dropdown would go off-screen vertically
      const spaceBelow = viewportHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      
      if (spaceBelow < dropdownHeight) {
        // Not enough space below, check if we should position above
        if (spaceAbove > spaceBelow && spaceAbove > 200) {
          // Position above the button
          top = Math.max(10, rect.top - dropdownHeight - 8);
        } else {
          // Not enough space above either, position at top of viewport with scroll
          top = Math.max(10, rect.bottom + 8);
          // Let the overflow-y-auto handle the scrolling
        }
      }
      
      // If it would go off-screen horizontally, adjust left
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 20;
      }
      
      // Ensure horizontal position is never off-screen
      left = Math.max(10, left);
      
      setDropdownPosition({ top, left });
    }
  };

  // Handle settings button click
  const handleSettingsClick = () => {
    if (!showSettingsDropdown) {
      calculateDropdownPosition();
    }
    setShowSettingsDropdown(!showSettingsDropdown);
  };

  return (
    <div className="relative">
      {/* Settings Button */}
      <button
        data-tour="terminal-settings-button"
        ref={settingsButtonRef}
        onClick={handleSettingsClick}
        className="terminal-control-btn p-1.5 rounded-md"
        title="Terminal Settings"
        style={{
          background: 'linear-gradient(135deg, rgba(125, 211, 252, 0.1) 0%, rgba(187, 154, 247, 0.1) 100%)',
          border: `1px solid rgba(0, 217, 255, 0.3)`,
          boxShadow: '0 0 10px rgba(0, 217, 255, 0.2), 0 0 20px rgba(0, 217, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          position: 'relative' as const,
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.5)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 146, 60, 0.4), 0 0 40px rgba(251, 146, 60, 0.2), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          e.currentTarget.style.backdropFilter = 'blur(6px)';
          (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(6px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.3)';
          e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 217, 255, 0.2), 0 0 20px rgba(0, 217, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.backdropFilter = 'blur(4px)';
          (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(4px)';
        }}
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Settings Dropdown - Portal Rendered */}
      {showSettingsDropdown && typeof window !== 'undefined' && createPortal(
        <div
          ref={settingsDropdownRef}
          className="fixed min-w-[280px] max-h-[520px] bg-bg-secondary border border-border-default rounded-lg shadow-xl overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            background: '#0a0a0a',
            borderColor: '#00D9FF',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 217, 255, 0.1)',
            zIndex: 9999,
            position: 'fixed',
            pointerEvents: 'auto'
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border-default bg-bg-tertiary">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-coder1-cyan" />
              <span className="text-sm font-semibold text-coder1-cyan uppercase tracking-wider">Terminal Settings</span>
            </div>
          </div>

          {/* Think Mode Section */}
          <div className="p-4 border-b border-border-default">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-coder1-cyan" />
              <span className="text-sm font-medium text-text-primary">Claude Think Mode</span>
              <span className="text-xs text-text-muted">(next command only)</span>
            </div>
            <div className="space-y-2">
              {[
                { mode: 'normal', label: 'Normal', tokens: '-5s' },
                { mode: 'think', label: 'Think', tokens: '-15s' },
                { mode: 'think_hard', label: 'Think Hard', tokens: '-30s' },
                { mode: 'ultrathink', label: 'Ultrathink', tokens: '-60s' }
              ].map((item) => (
                <button
                  key={item.mode}
                  onClick={() => {
                    setThinkingMode(item.mode as typeof thinkingMode);
                    xtermRef.current?.writeln(`\r\nThinking mode: ${item.label} (${item.tokens})`);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-bg-tertiary transition-colors ${
                    thinkingMode === item.mode ? 'text-coder1-cyan bg-coder1-purple bg-opacity-20' : 'text-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${thinkingMode === item.mode ? 'bg-coder1-cyan' : 'bg-border-default'}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-xs text-text-muted">{item.tokens}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Alerts Section */}
          <div className="p-4 border-b border-border-default">
            <div className="flex items-center gap-2 mb-3">
              <Speaker className="w-4 h-4 text-coder1-cyan" />
              <span className="text-sm font-medium text-text-primary">Task Completion Alerts</span>
            </div>
            <div className="space-y-3">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Enable alerts (&gt;20s tasks)</span>
                <button
                  onClick={() => {
                    const newState = !audioAlertsEnabled;
                    setAudioAlertsEnabled(newState);
                    soundAlertService.setEnabled(newState);
                    
                    if (newState) {
                      xtermRef.current?.writeln('\r\n🔊 Audio alerts enabled');
                      xtermRef.current?.writeln(`Sound preset: ${selectedSoundPreset}`);
                      xtermRef.current?.writeln('You will hear sounds when Claude Code tasks take longer than 20 seconds');
                      soundAlertService.testSound();
                    } else {
                      xtermRef.current?.writeln('\r\n🔇 Audio alerts disabled');
                    }
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    audioAlertsEnabled ? 'bg-coder1-cyan' : 'bg-border-default'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    audioAlertsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Sound Preset Selector */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Sound preset</span>
                <select
                  value={selectedSoundPreset}
                  onChange={(e) => {
                    const preset = e.target.value as SoundPreset;
                    setSelectedSoundPreset(preset);
                    soundAlertService.setPreset(preset);
                    soundAlertService.samplePreset(preset);
                    xtermRef.current?.writeln(`\r\n🔊 Sound preset changed to: ${soundAlertService.getAvailablePresets().find(p => p.key === preset)?.name}`);
                  }}
                  className="bg-bg-primary border border-border-default rounded px-2 py-1 text-sm text-text-primary"
                  disabled={!audioAlertsEnabled}
                >
                  {soundAlertService.getAvailablePresets().map((preset) => (
                    <option key={preset.key} value={preset.key}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Skip Permissions Section */}
          <div className="p-4 border-b border-border-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-coder1-cyan" />
                <span className="text-sm font-medium text-text-primary">Skip Permissions</span>
                {terminalSettings.skipPermissions && (
                  <span className="text-xs text-orange-400 bg-orange-400 bg-opacity-20 px-2 py-1 rounded">⚠️ DANGER</span>
                )}
              </div>
              <button
                onClick={() => {
                  try {
                    const newState = !terminalSettings.skipPermissions;
                    logger.debug('[TerminalSettings] Skip permissions toggle:', { current: terminalSettings.skipPermissions, new: newState });
                    
                    // Create validated new settings
                    const newSettings: TerminalSettingsState = {
                      ...terminalSettings,
                      skipPermissions: newState
                    };
                    
                    // Validate settings structure
                    if (typeof newSettings.skipPermissions !== 'boolean') {
                      throw new Error('Invalid skipPermissions value');
                    }
                    
                    setTerminalSettings(newSettings);
                    
                    // Save to localStorage with error handling
                    try {
                      localStorage.setItem('coder1-terminal-settings', JSON.stringify(newSettings));
                      logger.debug('[TerminalSettings] Skip permissions saved to localStorage');
                    } catch (storageError) {
                      logger.error('[TerminalSettings] Failed to save skip permissions to localStorage:', storageError);
                      throw new Error('Failed to save settings');
                    }
                    
                    // Dispatch custom event for same-tab updates
                    window.dispatchEvent(new CustomEvent('terminalSettingsChanged', {
                      detail: { key: 'coder1-terminal-settings', settings: newSettings }
                    }));
                    
                    if (newState) {
                      xtermRef.current?.writeln('\r\n⚠️ Skip Permissions ENABLED');
                      xtermRef.current?.writeln('Claude Code commands will use --dangerously-skip-permissions');
                      xtermRef.current?.writeln('⚠️ WARNING: This bypasses safety checks. Use with caution!');
                    } else {
                      xtermRef.current?.writeln('\r\n🛡️ Skip Permissions DISABLED');
                      xtermRef.current?.writeln('Claude Code will use normal permission checks');
                    }
                  } catch (error) {
                    logger.error('[TerminalSettings] Error toggling skip permissions:', error);
                    xtermRef.current?.writeln('\r\n❌ Error toggling skip permissions: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  }
                }}
                className={`w-12 h-6 rounded-full transition-colors ${
                  terminalSettings.skipPermissions ? 'bg-orange-400' : 'bg-border-default'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  terminalSettings.skipPermissions ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Status Line Section */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart className="w-4 h-4 text-coder1-cyan" />
                <span className="text-sm font-medium text-text-primary">Status Line</span>
              </div>
              <button
                onClick={() => {
                  try {
                    logger.debug('[TerminalSettings] Status line toggle clicked');
                    logger.debug('[TerminalSettings] Current state:', terminalSettings.statusLine.enabled);
                    
                    const newState = !terminalSettings.statusLine.enabled;
                    logger.debug('[TerminalSettings] New state will be:', newState);
                    
                    // Create validated new settings
                    const newSettings: TerminalSettingsState = {
                      ...terminalSettings,
                      statusLine: { 
                        ...terminalSettings.statusLine, 
                        enabled: newState 
                      }
                    };
                    
                    logger.debug('[TerminalSettings] Updating settings to:', newSettings);
                    
                    // Validate settings structure before saving
                    if (!newSettings.statusLine || typeof newSettings.statusLine.enabled !== 'boolean') {
                      throw new Error('Invalid settings structure after update');
                    }
                    
                    setTerminalSettings(newSettings);
                    
                    // Save to localStorage with error handling
                    try {
                      localStorage.setItem('coder1-terminal-settings', JSON.stringify(newSettings));
                      logger.debug('[TerminalSettings] Saved to localStorage successfully');
                    } catch (storageError) {
                      logger.error('[TerminalSettings] Failed to save to localStorage:', storageError);
                      throw new Error('Failed to save settings');
                    }
                    
                    // Dispatch custom event for same-tab updates
                    window.dispatchEvent(new CustomEvent('terminalSettingsChanged', {
                      detail: { key: 'coder1-terminal-settings', settings: newSettings }
                    }));
                    
                    if (newState) {
                      xtermRef.current?.writeln('\r\n📊 Status Line ENABLED');
                      xtermRef.current?.writeln('Session info will show at bottom of terminal');
                    } else {
                      xtermRef.current?.writeln('\r\n📊 Status Line DISABLED');
                    }
                  } catch (error) {
                    logger.error('[TerminalSettings] Error toggling status line:', error);
                    xtermRef.current?.writeln('\r\n❌ Error toggling status line: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  }
                }}
                className={`w-12 h-6 rounded-full transition-colors ${
                  terminalSettings.statusLine.enabled ? 'bg-coder1-cyan' : 'bg-border-default'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  terminalSettings.statusLine.enabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Status Line Options */}
            {terminalSettings.statusLine.enabled && (
              <div className="space-y-2 ml-4 border-l-2 border-border-default pl-3">
                {[
                  { key: 'showFile', label: 'Current file' },
                  { key: 'showModel', label: 'Model info' },
                  { key: 'showTokens', label: 'Session tokens' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary">{label}</span>
                    </div>
                    <button
                      onClick={() => {
                        try {
                          logger.debug(`[TerminalSettings] Toggling ${key}`);
                          const currentValue = terminalSettings.statusLine[key as keyof typeof terminalSettings.statusLine];
                          logger.debug(`[TerminalSettings] Current ${key}:`, currentValue);
                          
                          // Create validated new settings
                          const newSettings: TerminalSettingsState = {
                            ...terminalSettings,
                            statusLine: {
                              ...terminalSettings.statusLine,
                              [key]: !currentValue
                            }
                          };
                          
                          logger.debug(`[TerminalSettings] New ${key}:`, !currentValue);
                          
                          // Validate settings structure before saving
                          if (!newSettings.statusLine || typeof newSettings.statusLine[key as keyof typeof newSettings.statusLine] !== 'boolean') {
                            throw new Error(`Invalid ${key} value after update`);
                          }
                          
                          setTerminalSettings(newSettings);
                          
                          // Save to localStorage with error handling
                          try {
                            localStorage.setItem('coder1-terminal-settings', JSON.stringify(newSettings));
                            logger.debug('[TerminalSettings] Sub-option saved to localStorage successfully');
                          } catch (storageError) {
                            logger.error('[TerminalSettings] Failed to save sub-option to localStorage:', storageError);
                            throw new Error('Failed to save settings');
                          }
                          
                          // Dispatch custom event for same-tab updates
                          window.dispatchEvent(new CustomEvent('terminalSettingsChanged', {
                            detail: { key: 'coder1-terminal-settings', settings: newSettings }
                          }));
                        } catch (error) {
                          logger.error(`[TerminalSettings] Error toggling ${key}:`, error);
                          xtermRef.current?.writeln(`\r\n❌ Error toggling ${label}: ` + (error instanceof Error ? error.message : 'Unknown error'));
                        }
                      }}
                      className={`w-8 h-4 rounded-full transition-colors ${
                        terminalSettings.statusLine[key as keyof typeof terminalSettings.statusLine] ? 'bg-coder1-cyan' : 'bg-border-default'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full bg-white transition-transform ${
                        terminalSettings.statusLine[key as keyof typeof terminalSettings.statusLine] ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Export settings state for use in Terminal.tsx
export type { TerminalSettingsState };