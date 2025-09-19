/**
 * Sound Alert Toggle Component
 * 
 * Provides a compact icon-only toggle for enabling/disabling sound alerts when Claude Code completes tasks.
 * Includes sound sampling dropdown for preset selection. Matches other terminal button styling.
 */

import React, { useState, useEffect, useRef } from 'react';
import { soundAlertService, SoundPreset } from '../services/SoundAlertService';

interface SoundAlertToggleProps {
  onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const SoundAlertToggle: React.FC<SoundAlertToggleProps> = ({
  onMouseEnter,
  onMouseLeave,
  className = '',
  style = {}
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showPresetMenu, setShowPresetMenu] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<SoundPreset>('gentle');
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number}>({top: 0, left: 0});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load initial state from service
  useEffect(() => {
    setIsEnabled(soundAlertService.getEnabled());
    setSelectedPreset(soundAlertService.getPreset());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowPresetMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle main button click (toggle enabled/disabled)
   */
  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newState = !isEnabled;
    setIsEnabled(newState);
    soundAlertService.setEnabled(newState);

    // Play test sound when enabling
    if (newState) {
      setIsPlaying(true);
      try {
        await soundAlertService.testSound();
      } catch (error) {
        console.warn('Failed to play test sound:', error);
      }
      
      // Reset playing state after animation
      setTimeout(() => setIsPlaying(false), 600);
    }

    console.log(`🔊 Sound alerts ${newState ? 'enabled' : 'disabled'}`);
  };

  /**
   * Handle right-click to show preset menu
   */
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!showPresetMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: Math.max(0, rect.left)  // Ensure it doesn't go off-screen
      });
    }
    
    setShowPresetMenu(!showPresetMenu);
  };

  /**
   * Handle preset selection
   */
  const handlePresetSelect = async (preset: SoundPreset) => {
    setSelectedPreset(preset);
    soundAlertService.setPreset(preset);
    
    // Sample the selected preset
    setIsPlaying(true);
    try {
      await soundAlertService.samplePreset(preset);
    } catch (error) {
      console.warn('Failed to sample preset:', error);
    }
    
    setTimeout(() => setIsPlaying(false), 600);
    setShowPresetMenu(false);
    
    console.log(`🔊 Sound preset changed to: ${preset}`);
  };

  /**
   * Handle mouse enter with sound alert context
   */
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  };

  const icon = isEnabled ? '🔊' : '🔇';
  const presets = soundAlertService.getAvailablePresets();
  const selectedPresetName = presets.find(p => p.key === selectedPreset)?.name || 'Gentle';
  
  const tooltipText = isEnabled 
    ? `Sound alerts: On (${selectedPresetName}) • Right-click to change sound`
    : 'Sound alerts: Off • Right-click to change sound';
    
  const buttonClasses = [
    'terminal-control-btn',
    'sound-toggle-compact',
    isEnabled ? 'sound-enabled' : '',
    isPlaying ? 'playing' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <>
      <button
        ref={buttonRef}
        className={buttonClasses}
        onClick={handleToggle}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onMouseLeave}
        data-tooltip={tooltipText}
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          zIndex: 9999,
          transition: 'all 0.3s ease',
          minWidth: '32px',
          padding: '6px 8px',
          fontSize: '14px',
          lineHeight: '1',
          ...style
        }}
        aria-label={tooltipText}
        title={tooltipText}
      >
        {icon}
      </button>
      
      {showPresetMenu && (
        <div
          ref={dropdownRef}
          className="sound-preset-dropdown"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            background: '#24283b',
            border: '2px solid #7aa2f7',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            zIndex: 10000,
            minWidth: '180px',
            overflow: 'hidden'
          }}
        >
          <div style={{ 
            padding: '8px 12px', 
            borderBottom: '1px solid #414868',
            fontSize: '12px',
            fontWeight: '600',
            color: '#c0caf5',
            background: '#1f2335'
          }}>
            Sound Presets
          </div>
          {presets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handlePresetSelect(preset.key)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: selectedPreset === preset.key ? '#7aa2f7' : 'transparent',
                color: selectedPreset === preset.key ? '#1a1b26' : '#c0caf5',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (selectedPreset !== preset.key) {
                  e.currentTarget.style.backgroundColor = '#363a52';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPreset !== preset.key) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{ fontWeight: '500' }}>{preset.name}</div>
              <div style={{ 
                fontSize: '11px', 
                opacity: 0.7,
                color: selectedPreset === preset.key ? '#1a1b26' : '#9aa5ce'
              }}>
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default SoundAlertToggle;