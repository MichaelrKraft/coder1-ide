import React, { useState } from 'react';
import './ThemeCustomizer.css';

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontSize: string;
  spacing: string;
  shadow: string;
}

interface ThemeCustomizerProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyTheme: (theme: ThemeConfig) => void;
  currentCode?: string;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  isVisible,
  onClose,
  onApplyTheme,
  currentCode
}) => {
  const [theme, setTheme] = useState<ThemeConfig>({
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: '8px',
    fontSize: '16px',
    spacing: '16px',
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  });

  const [activeCategory, setActiveCategory] = useState<'colors' | 'typography' | 'layout' | 'effects'>('colors');

  const presetThemes = {
    modern: {
      primaryColor: '#3b82f6',
      secondaryColor: '#10b981',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      borderRadius: '12px',
      fontSize: '16px',
      spacing: '20px',
      shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    },
    dark: {
      primaryColor: '#6366f1',
      secondaryColor: '#14b8a6',
      backgroundColor: '#111827',
      textColor: '#f9fafb',
      borderRadius: '8px',
      fontSize: '16px',
      spacing: '16px',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
    },
    minimal: {
      primaryColor: '#374151',
      secondaryColor: '#6b7280',
      backgroundColor: '#f9fafb',
      textColor: '#111827',
      borderRadius: '4px',
      fontSize: '14px',
      spacing: '12px',
      shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    vibrant: {
      primaryColor: '#f59e0b',
      secondaryColor: '#ef4444',
      backgroundColor: '#fef3c7',
      textColor: '#92400e',
      borderRadius: '16px',
      fontSize: '18px',
      spacing: '24px',
      shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
    }
  };

  const updateTheme = (key: keyof ThemeConfig, value: string) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (presetName: keyof typeof presetThemes) => {
    setTheme(presetThemes[presetName]);
  };

  const handleApplyTheme = () => {
    onApplyTheme(theme);
    onClose();
  };

  const generateCustomizedCode = () => {
    if (!currentCode) return '';
    
    // Apply theme transformations to the code
    let customizedCode = currentCode;
    
    // Replace color values
    customizedCode = customizedCode.replace(/bg-blue-\d+/g, `bg-[${theme.primaryColor}]`);
    customizedCode = customizedCode.replace(/text-blue-\d+/g, `text-[${theme.primaryColor}]`);
    customizedCode = customizedCode.replace(/border-blue-\d+/g, `border-[${theme.primaryColor}]`);
    
    // Replace background colors
    customizedCode = customizedCode.replace(/bg-white/g, `bg-[${theme.backgroundColor}]`);
    customizedCode = customizedCode.replace(/bg-gray-\d+/g, `bg-[${theme.backgroundColor}]`);
    
    // Replace text colors
    customizedCode = customizedCode.replace(/text-gray-\d+/g, `text-[${theme.textColor}]`);
    customizedCode = customizedCode.replace(/text-black/g, `text-[${theme.textColor}]`);
    
    // Replace border radius
    const radiusValue = parseInt(theme.borderRadius);
    if (radiusValue <= 4) {
      customizedCode = customizedCode.replace(/rounded-\w+/g, 'rounded');
    } else if (radiusValue <= 8) {
      customizedCode = customizedCode.replace(/rounded-\w+/g, 'rounded-lg');
    } else if (radiusValue <= 12) {
      customizedCode = customizedCode.replace(/rounded-\w+/g, 'rounded-xl');
    } else {
      customizedCode = customizedCode.replace(/rounded-\w+/g, 'rounded-2xl');
    }
    
    return customizedCode;
  };

  if (!isVisible) return null;

  return (
    <div className="theme-customizer-overlay">
      <div className="theme-customizer-container">
        {/* Header */}
        <div className="theme-customizer-header">
          <h3 className="text-lg font-semibold text-gray-900">
            🎨 Theme Customizer
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close Theme Customizer"
          >
            ✕
          </button>
        </div>

        {/* Preset Themes */}
        <div className="theme-presets">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Presets</h4>
          <div className="preset-grid">
            {Object.entries(presetThemes).map(([name, preset]) => (
              <button
                key={name}
                onClick={() => applyPreset(name as keyof typeof presetThemes)}
                className="preset-card"
                style={{
                  background: `linear-gradient(135deg, ${preset.primaryColor}, ${preset.secondaryColor})`,
                  color: preset.textColor
                }}
              >
                <div className="preset-name">{name}</div>
                <div className="preset-preview">
                  <div 
                    className="preset-sample"
                    style={{
                      backgroundColor: preset.backgroundColor,
                      borderRadius: preset.borderRadius,
                      border: `1px solid ${preset.primaryColor}`
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Category Navigation */}
        <div className="category-tabs">
          {[
            { key: 'colors', label: '🎨 Colors', icon: '🎨' },
            { key: 'typography', label: '📝 Typography', icon: '📝' },
            { key: 'layout', label: '📐 Layout', icon: '📐' },
            { key: 'effects', label: '✨ Effects', icon: '✨' }
          ].map(category => (
            <button
              key={category.key}
              onClick={() => setActiveCategory(category.key as any)}
              className={`category-tab ${activeCategory === category.key ? 'active' : ''}`}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-label">{category.label.split(' ')[1]}</span>
            </button>
          ))}
        </div>

        {/* Theme Controls */}
        <div className="theme-controls">
          {activeCategory === 'colors' && (
            <div className="control-group">
              <div className="control-item">
                <label className="control-label">Primary Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => updateTheme('primaryColor', e.target.value)}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={theme.primaryColor}
                    onChange={(e) => updateTheme('primaryColor', e.target.value)}
                    className="color-text"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div className="control-item">
                <label className="control-label">Secondary Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={theme.secondaryColor}
                    onChange={(e) => updateTheme('secondaryColor', e.target.value)}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={theme.secondaryColor}
                    onChange={(e) => updateTheme('secondaryColor', e.target.value)}
                    className="color-text"
                    placeholder="#10b981"
                  />
                </div>
              </div>

              <div className="control-item">
                <label className="control-label">Background</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={theme.backgroundColor}
                    onChange={(e) => updateTheme('backgroundColor', e.target.value)}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={theme.backgroundColor}
                    onChange={(e) => updateTheme('backgroundColor', e.target.value)}
                    className="color-text"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div className="control-item">
                <label className="control-label">Text Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={theme.textColor}
                    onChange={(e) => updateTheme('textColor', e.target.value)}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={theme.textColor}
                    onChange={(e) => updateTheme('textColor', e.target.value)}
                    className="color-text"
                    placeholder="#1f2937"
                  />
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'typography' && (
            <div className="control-group">
              <div className="control-item">
                <label className="control-label">Font Size</label>
                <div className="slider-input-group">
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={parseInt(theme.fontSize)}
                    onChange={(e) => updateTheme('fontSize', e.target.value + 'px')}
                    className="slider"
                  />
                  <span className="slider-value">{theme.fontSize}</span>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'layout' && (
            <div className="control-group">
              <div className="control-item">
                <label className="control-label">Border Radius</label>
                <div className="slider-input-group">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={parseInt(theme.borderRadius)}
                    onChange={(e) => updateTheme('borderRadius', e.target.value + 'px')}
                    className="slider"
                  />
                  <span className="slider-value">{theme.borderRadius}</span>
                </div>
              </div>

              <div className="control-item">
                <label className="control-label">Spacing</label>
                <div className="slider-input-group">
                  <input
                    type="range"
                    min="8"
                    max="32"
                    value={parseInt(theme.spacing)}
                    onChange={(e) => updateTheme('spacing', e.target.value + 'px')}
                    className="slider"
                  />
                  <span className="slider-value">{theme.spacing}</span>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'effects' && (
            <div className="control-group">
              <div className="control-item">
                <label className="control-label">Shadow Intensity</label>
                <select
                  value={theme.shadow}
                  onChange={(e) => updateTheme('shadow', e.target.value)}
                  className="select-input"
                >
                  <option value="none">None</option>
                  <option value="0 1px 3px 0 rgba(0, 0, 0, 0.1)">Light</option>
                  <option value="0 4px 6px -1px rgba(0, 0, 0, 0.1)">Medium</option>
                  <option value="0 10px 15px -3px rgba(0, 0, 0, 0.1)">Heavy</option>
                  <option value="0 20px 25px -5px rgba(0, 0, 0, 0.1)">Extra Heavy</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Preview Sample */}
        <div className="theme-preview">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Preview</h4>
          <div 
            className="preview-sample"
            style={{
              backgroundColor: theme.backgroundColor,
              color: theme.textColor,
              borderRadius: theme.borderRadius,
              padding: theme.spacing,
              boxShadow: theme.shadow,
              fontSize: theme.fontSize
            }}
          >
            <div 
              className="sample-button"
              style={{
                backgroundColor: theme.primaryColor,
                color: theme.backgroundColor,
                borderRadius: theme.borderRadius,
                padding: `${parseInt(theme.spacing) / 2}px ${theme.spacing}`
              }}
            >
              Primary Button
            </div>
            <div 
              className="sample-text"
              style={{
                color: theme.textColor,
                marginTop: theme.spacing
              }}
            >
              Sample text with current theme settings
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="theme-actions">
          <button
            onClick={onClose}
            className="action-button outline"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyTheme}
            className="action-button primary"
          >
            ✅ Apply Theme
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomizer;