import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark'; // Resolved theme (auto becomes light/dark)
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

/**
 * Theme Context Provider
 * 
 * Manages application theme state with:
 * - System preference detection for 'auto' mode
 * - Local storage persistence
 * - CSS custom property updates
 * - Prefers-color-scheme media query support
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'auto' 
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first, then fall back to default
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('calculator-theme') as Theme;
      return stored || defaultTheme;
    }
    return defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Set initial value
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Calculate actual theme (resolve 'auto')
  const actualTheme: 'light' | 'dark' = theme === 'auto' ? systemTheme : theme;

  // Update CSS custom properties when theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    root.setAttribute('data-theme', actualTheme);
    
    // Update CSS custom properties
    if (actualTheme === 'dark') {
      root.style.setProperty('--calc-bg', '#1a1a1a');
      root.style.setProperty('--calc-surface', '#2d2d2d');
      root.style.setProperty('--calc-text', '#ffffff');
      root.style.setProperty('--calc-text-secondary', '#b3b3b3');
      root.style.setProperty('--calc-border', '#404040');
      root.style.setProperty('--calc-button-bg', '#3d3d3d');
      root.style.setProperty('--calc-button-hover', '#4d4d4d');
      root.style.setProperty('--calc-button-active', '#5d5d5d');
      root.style.setProperty('--calc-operation-bg', '#ff6b35');
      root.style.setProperty('--calc-operation-hover', '#ff7a47');
      root.style.setProperty('--calc-equals-bg', '#4ade80');
      root.style.setProperty('--calc-equals-hover', '#65e296');
      root.style.setProperty('--calc-function-bg', '#6366f1');
      root.style.setProperty('--calc-function-hover', '#7c3aed');
    } else {
      root.style.setProperty('--calc-bg', '#f8fafc');
      root.style.setProperty('--calc-surface', '#ffffff');
      root.style.setProperty('--calc-text', '#1e293b');
      root.style.setProperty('--calc-text-secondary', '#64748b');
      root.style.setProperty('--calc-border', '#e2e8f0');
      root.style.setProperty('--calc-button-bg', '#f1f5f9');
      root.style.setProperty('--calc-button-hover', '#e2e8f0');
      root.style.setProperty('--calc-button-active', '#cbd5e1');
      root.style.setProperty('--calc-operation-bg', '#f97316');
      root.style.setProperty('--calc-operation-hover', '#ea580c');
      root.style.setProperty('--calc-equals-bg', '#16a34a');
      root.style.setProperty('--calc-equals-hover', '#15803d');
      root.style.setProperty('--calc-function-bg', '#3b82f6');
      root.style.setProperty('--calc-function-hover', '#2563eb');
    }
  }, [actualTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('calculator-theme', newTheme);
    }
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    actualTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access theme context
 * 
 * @throws Error if used outside of ThemeProvider
 * @returns Theme state and actions
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error(
      'useTheme must be used within a ThemeProvider. ' +
      'Make sure your component is wrapped with <ThemeProvider>.'
    );
  }
  
  return context;
};