// Design Tokens for CoderOne IDE
// Professional design system with consistent spacing, colors, typography, and animations

export const designTokens = {
  // Color System - Tokyo Night theme with professional enhancements
  colors: {
    // Primary palette
    primary: {
      50: '#f0f4ff',
      100: '#e0e9ff',
      200: '#c7d6fe',
      300: '#a5b9fc',
      400: '#8191f8',
      500: '#7aa2f7', // Main brand color
      600: '#6b93f0',
      700: '#5a7fde',
      800: '#4a6bc4',
      900: '#3d5a9c',
    },
    
    // Secondary palette  
    secondary: {
      50: '#fef7ee',
      100: '#fcebd6',
      200: '#f8d2ad',
      300: '#f4b479',
      400: '#ef8f43',
      500: '#ff9e64', // Orange accent
      600: '#e67e22',
      700: '#d35400',
      800: '#a04000',
      900: '#7e3300',
    },
    
    // Success palette
    success: {
      50: '#f0fff4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#9ece6a', // Green
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    
    // Error palette
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#f7768e', // Red
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    
    // Warning palette
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#e0af68', // Yellow
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    
    // Neutral palette (backgrounds, text)
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#737aa2', // Medium gray
      600: '#565f89', // Dark gray
      700: '#3b4261', // Darker gray
      800: '#24283b', // Background highlight
      850: '#1f2335', // Background secondary
      900: '#1a1b26', // Main background
      950: '#16161e', // Darkest background
    },
    
    // Special colors
    special: {
      cyan: '#7dcfff',
      magenta: '#bb9af7',
      purple: '#9d7cd8',
      teal: '#73daca',
      pink: '#ff007c',
    }
  },
  
  // Typography Scale
  typography: {
    fontFamily: {
      sans: [
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Ubuntu',
        'Cantarell',
        'Fira Sans',
        'Droid Sans',
        'Helvetica Neue',
        'sans-serif'
      ],
      mono: [
        'JetBrains Mono',
        'Monaco',
        'Menlo',
        'Courier New',
        'monospace'
      ]
    },
    
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
    },
    
    fontWeight: {
      thin: 100,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },
    
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
    
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    }
  },
  
  // Spacing Scale (4px base unit)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
    32: '8rem',     // 128px
  },
  
  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    glow: {
      blue: '0 0 20px rgba(122, 162, 247, 0.5)',
      orange: '0 0 20px rgba(255, 158, 100, 0.5)',
      green: '0 0 20px rgba(158, 206, 106, 0.5)',
      red: '0 0 20px rgba(247, 118, 142, 0.5)',
      purple: '0 0 20px rgba(187, 154, 247, 0.5)',
    }
  },
  
  // Animation & Transitions
  animation: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    }
  },
  
  // Z-Index Scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
  
  // Component-specific tokens
  components: {
    button: {
      height: {
        sm: '2rem',      // 32px
        base: '2.5rem',  // 40px
        lg: '3rem',      // 48px
      },
      padding: {
        sm: '0.5rem 0.75rem',   // 8px 12px
        base: '0.75rem 1rem',   // 12px 16px
        lg: '1rem 1.5rem',      // 16px 24px
      }
    },
    
    input: {
      height: {
        sm: '2rem',      // 32px
        base: '2.5rem',  // 40px
        lg: '3rem',      // 48px
      }
    },
    
    card: {
      padding: '1.5rem',  // 24px
      borderRadius: '0.5rem', // 8px
    }
  }
} as const;

// Type definitions for TypeScript support
export type DesignTokens = typeof designTokens;

// Helper functions for token access
export const getColor = (path: string): string => {
  const keys = path.split('.');
  let value: any = designTokens.colors;
  
  for (const key of keys) {
    value = value?.[key];
  }
  
  return value || path;
};

export const getSpacing = (key: keyof typeof designTokens.spacing): string => {
  return designTokens.spacing[key];
};

export const getShadow = (key: keyof typeof designTokens.shadows): string | typeof designTokens.shadows.glow => {
  return designTokens.shadows[key];
};

export default designTokens;