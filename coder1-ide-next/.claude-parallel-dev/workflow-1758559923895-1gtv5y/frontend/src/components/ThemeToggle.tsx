import React from 'react';
import { useTheme, Theme } from '../context/ThemeContext';

/**
 * Theme Toggle Component
 * 
 * Provides a user interface for switching between light, dark, and auto themes.
 * Features:
 * - Visual indicators for each theme state
 * - Keyboard navigation support
 * - Accessible button design
 * - Auto theme shows system preference
 */
export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, actualTheme } = useTheme();

  const themes: Array<{ value: Theme; label: string; icon: string }> = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'auto', label: 'Auto', icon: '🔄' },
  ];

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme selection">
      <div className="theme-toggle-label">
        <span className="theme-label-text">Theme</span>
        {theme === 'auto' && (
          <span className="theme-indicator">
            (using {actualTheme})
          </span>
        )}
      </div>
      
      <div className="theme-options">
        {themes.map((themeOption) => (
          <button
            key={themeOption.value}
            className={`theme-option ${theme === themeOption.value ? 'active' : ''}`}
            onClick={() => handleThemeChange(themeOption.value)}
            role="radio"
            aria-checked={theme === themeOption.value}
            aria-label={`Switch to ${themeOption.label} theme`}
            title={`Switch to ${themeOption.label} theme`}
            type="button"
          >
            <span className="theme-icon" aria-hidden="true">
              {themeOption.icon}
            </span>
            <span className="theme-text">
              {themeOption.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Compact Theme Toggle Component
 * 
 * A minimal theme toggle that cycles through themes on click.
 * Perfect for toolbars or compact layouts.
 */
export const CompactThemeToggle: React.FC = () => {
  const { theme, setTheme, actualTheme } = useTheme();

  const getNextTheme = (currentTheme: Theme): Theme => {
    const cycle: Theme[] = ['light', 'dark', 'auto'];
    const currentIndex = cycle.indexOf(currentTheme);
    return cycle[(currentIndex + 1) % cycle.length];
  };

  const getThemeIcon = () => {
    if (theme === 'auto') {
      return actualTheme === 'dark' ? '🌙🔄' : '☀️🔄';
    }
    return theme === 'dark' ? '🌙' : '☀️';
  };

  const getThemeLabel = () => {
    if (theme === 'auto') {
      return `Auto (${actualTheme})`;
    }
    return theme === 'dark' ? 'Dark' : 'Light';
  };

  const handleToggle = () => {
    setTheme(getNextTheme(theme));
  };

  return (
    <button
      className="compact-theme-toggle"
      onClick={handleToggle}
      aria-label={`Current theme: ${getThemeLabel()}. Click to change theme.`}
      title={`Current theme: ${getThemeLabel()}. Click to change theme.`}
      type="button"
    >
      <span className="theme-icon" aria-hidden="true">
        {getThemeIcon()}
      </span>
      <span className="sr-only">
        Toggle theme
      </span>
    </button>
  );
};