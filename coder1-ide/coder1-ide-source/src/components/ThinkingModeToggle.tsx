import React, { useState, useEffect, useRef } from 'react';
import './ThinkingModeToggle.css';
import { useFeatureFlag } from '../hooks/useFeatureFlag';

export type ThinkingMode = 'normal' | 'think' | 'think-hard' | 'ultrathink';

interface ThinkingModeConfig {
  id: ThinkingMode;
  label: string;
  description: string;
  icon: string;
  estimatedTime: string;
  tokenMultiplier: number;
}

const THINKING_MODES: ThinkingModeConfig[] = [
  {
    id: 'normal',
    label: 'Normal',
    description: 'Standard response speed',
    icon: '⚡',
    estimatedTime: '~5s',
    tokenMultiplier: 1.0,
  },
  {
    id: 'think',
    label: 'Think',
    description: 'More thoughtful responses',
    icon: '🤔',
    estimatedTime: '~15s',
    tokenMultiplier: 1.5,
  },
  {
    id: 'think-hard',
    label: 'Think Hard',
    description: 'Deep analysis and reasoning',
    icon: '🧠',
    estimatedTime: '~30s',
    tokenMultiplier: 2.0,
  },
  {
    id: 'ultrathink',
    label: 'Ultrathink',
    description: 'Maximum reasoning depth',
    icon: '💭',
    estimatedTime: '~60s',
    tokenMultiplier: 3.0,
  },
];

interface ThinkingModeToggleProps {
  value?: ThinkingMode;
  onChange?: (mode: ThinkingMode) => void;
  disabled?: boolean;
  compact?: boolean;
}

const ThinkingModeToggle: React.FC<ThinkingModeToggleProps> = ({
  value,
  onChange,
  disabled = false,
  compact = false,
}) => {

  const isEnabled = useFeatureFlag('THINKING_MODE_TOGGLE');
  const [selectedMode, setSelectedMode] = useState<ThinkingMode>('normal');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);


  // Load saved thinking mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('coder1-thinking-mode');
    if (saved && THINKING_MODES.find(m => m.id === saved)) {
      setSelectedMode(saved as ThinkingMode);
    }
  }, []);

  // Close dropdown when clicking outside (only for compact mode)
  useEffect(() => {
    if (!compact || !showDropdown) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [compact, showDropdown]);

  // Use controlled value if provided
  const currentMode = value || selectedMode;

  const handleModeChange = (mode: ThinkingMode) => {
    setSelectedMode(mode);
    localStorage.setItem('coder1-thinking-mode', mode);
    
    if (onChange) {
      onChange(mode);
    }
  };

  const getCurrentModeConfig = () => {
    return THINKING_MODES.find(m => m.id === currentMode) || THINKING_MODES[0];
  };

  if (!isEnabled) {
    return null;
  }

  if (compact) {
    const currentConfig = getCurrentModeConfig();
    
    return (
      <div className="thinking-mode-compact" ref={dropdownRef}>
        <button 
          className={`thinking-mode-indicator ${disabled ? 'disabled' : ''}`}
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          onMouseEnter={() => !showDropdown && setShowTooltip(currentConfig.id)}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <span className="mode-icon">{currentConfig.icon}</span>
          <span className="mode-label">{currentConfig.label}</span>
        </button>
        
        {showDropdown && (
          <div className="thinking-mode-dropdown">
            {THINKING_MODES.map((mode) => (
              <button
                key={mode.id}
                className={`thinking-mode-dropdown-item ${currentMode === mode.id ? 'active' : ''}`}
                onClick={() => {
                  handleModeChange(mode.id);
                  setShowDropdown(false);
                }}
              >
                <div className="dropdown-item-content">
                  <span className="mode-icon">{mode.icon}</span>
                  <span className="mode-label">{mode.label}</span>
                </div>
                <div className="dropdown-item-details">
                  <span className="mode-time">{mode.estimatedTime}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {showTooltip && !showDropdown && (
          <div className="thinking-mode-tooltip">
            <div className="tooltip-header">
              {currentConfig.icon} {currentConfig.label}
            </div>
            <div className="tooltip-description">
              {currentConfig.description}
            </div>
            <div className="tooltip-stats">
              <span>Time: {currentConfig.estimatedTime}</span>
              <span>Tokens: {currentConfig.tokenMultiplier}x</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`thinking-mode-toggle ${disabled ? 'disabled' : ''}`}>
      <div className="thinking-mode-header">
        <span className="thinking-icon">🧠</span>
        <span className="thinking-label">Thinking Mode</span>
      </div>
      
      <div className="thinking-mode-options">
        {THINKING_MODES.map((mode) => (
          <button
            key={mode.id}
            className={`thinking-mode-option ${currentMode === mode.id ? 'active' : ''}`}
            onClick={() => handleModeChange(mode.id)}
            disabled={disabled}
            onMouseEnter={() => setShowTooltip(mode.id)}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <div className="mode-content">
              <span className="mode-icon">{mode.icon}</span>
              <span className="mode-label">{mode.label}</span>
            </div>
            
            <div className="mode-details">
              <span className="mode-time">{mode.estimatedTime}</span>
              <span className="mode-tokens">{mode.tokenMultiplier}x</span>
            </div>
            
            {showTooltip === mode.id && (
              <div className="thinking-mode-tooltip">
                <div className="tooltip-description">
                  {mode.description}
                </div>
                <div className="tooltip-stats">
                  <div>Estimated time: {mode.estimatedTime}</div>
                  <div>Token usage: {mode.tokenMultiplier}x normal</div>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
      
      <div className="thinking-mode-info">
        <div className="current-mode">
          Current: <strong>{getCurrentModeConfig().label}</strong>
        </div>
        <div className="mode-description">
          {getCurrentModeConfig().description}
        </div>
      </div>
    </div>
  );
};

// Export helper functions for external use
export const getThinkingModeConfig = (mode: ThinkingMode) => {
  return THINKING_MODES.find(m => m.id === mode) || THINKING_MODES[0];
};

export const getCurrentThinkingMode = (): ThinkingMode => {
  const saved = localStorage.getItem('coder1-thinking-mode');
  return (saved && THINKING_MODES.find(m => m.id === saved)) 
    ? saved as ThinkingMode 
    : 'normal';
};

export default ThinkingModeToggle;