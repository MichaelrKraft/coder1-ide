import { useMemo } from 'react';
import { designTokens, getColor, getSpacing, getShadow } from './tokens';

// Type-safe design token access hook
export const useDesignTokens = () => {
  return useMemo(() => ({
    // Direct token access
    tokens: designTokens,
    
    // Helper functions
    getColor,
    getSpacing,
    getShadow,
    
    // Commonly used token collections
    colors: {
      // Semantic colors
      background: designTokens.colors.neutral[900],
      backgroundSecondary: designTokens.colors.neutral[850],
      backgroundTertiary: designTokens.colors.neutral[800],
      surface: designTokens.colors.neutral[800],
      surfaceHover: designTokens.colors.neutral[700],
      
      border: designTokens.colors.neutral[700],
      borderSubtle: designTokens.colors.neutral[800],
      
      textPrimary: '#c0caf5',
      textSecondary: designTokens.colors.neutral[500],
      textTertiary: designTokens.colors.neutral[600],
      textInverse: designTokens.colors.neutral[900],
      
      // Brand colors
      primary: designTokens.colors.primary[500],
      secondary: designTokens.colors.secondary[500],
      
      // Status colors
      success: designTokens.colors.success[500],
      warning: designTokens.colors.warning[500],
      error: designTokens.colors.error[500],
      
      // Special colors
      cyan: designTokens.colors.special.cyan,
      magenta: designTokens.colors.special.magenta,
      purple: designTokens.colors.special.purple,
      teal: designTokens.colors.special.teal,
      pink: designTokens.colors.special.pink,
    },
    
    // Typography presets
    typography: {
      heading1: {
        fontSize: designTokens.typography.fontSize['3xl'],
        fontWeight: designTokens.typography.fontWeight.bold,
        lineHeight: designTokens.typography.lineHeight.tight,
        letterSpacing: designTokens.typography.letterSpacing.tight,
      },
      heading2: {
        fontSize: designTokens.typography.fontSize['2xl'],
        fontWeight: designTokens.typography.fontWeight.semibold,
        lineHeight: designTokens.typography.lineHeight.tight,
      },
      heading3: {
        fontSize: designTokens.typography.fontSize.xl,
        fontWeight: designTokens.typography.fontWeight.semibold,
        lineHeight: designTokens.typography.lineHeight.snug,
      },
      body: {
        fontSize: designTokens.typography.fontSize.base,
        fontWeight: designTokens.typography.fontWeight.normal,
        lineHeight: designTokens.typography.lineHeight.normal,
      },
      bodySmall: {
        fontSize: designTokens.typography.fontSize.sm,
        fontWeight: designTokens.typography.fontWeight.normal,
        lineHeight: designTokens.typography.lineHeight.normal,
      },
      caption: {
        fontSize: designTokens.typography.fontSize.xs,
        fontWeight: designTokens.typography.fontWeight.normal,
        lineHeight: designTokens.typography.lineHeight.snug,
        color: designTokens.colors.neutral[500],
      },
      code: {
        fontFamily: designTokens.typography.fontFamily.mono.join(', '),
        fontSize: designTokens.typography.fontSize.sm,
        fontWeight: designTokens.typography.fontWeight.normal,
      }
    },
    
    // Component style presets
    components: {
      button: {
        base: {
          fontFamily: designTokens.typography.fontFamily.sans.join(', '),
          fontWeight: designTokens.typography.fontWeight.medium,
          borderRadius: designTokens.borderRadius.md,
          cursor: 'pointer',
          transition: `all ${designTokens.animation.duration.normal} ${designTokens.animation.easing.out}`,
          border: 'none',
          outline: 'none',
        },
        sizes: {
          sm: {
            height: designTokens.components.button.height.sm,
            padding: designTokens.components.button.padding.sm,
            fontSize: designTokens.typography.fontSize.sm,
          },
          base: {
            height: designTokens.components.button.height.base,
            padding: designTokens.components.button.padding.base,
            fontSize: designTokens.typography.fontSize.base,
          },
          lg: {
            height: designTokens.components.button.height.lg,
            padding: designTokens.components.button.padding.lg,
            fontSize: designTokens.typography.fontSize.lg,
          }
        },
        variants: {
          primary: {
            backgroundColor: designTokens.colors.primary[500],
            color: '#ffffff',
            boxShadow: designTokens.shadows.glow.blue,
          },
          secondary: {
            backgroundColor: designTokens.colors.secondary[500],
            color: '#ffffff',
            boxShadow: designTokens.shadows.glow.orange,
          },
          outline: {
            backgroundColor: 'transparent',
            color: designTokens.colors.primary[500],
            border: `1px solid ${designTokens.colors.primary[500]}`,
            boxShadow: designTokens.shadows.glow.blue,
          },
          ghost: {
            backgroundColor: 'transparent',
            color: designTokens.colors.neutral[500],
            border: 'none',
          },
          success: {
            backgroundColor: designTokens.colors.success[500],
            color: '#ffffff',
            boxShadow: designTokens.shadows.glow.green,
          },
          danger: {
            backgroundColor: designTokens.colors.error[500],
            color: '#ffffff',
            boxShadow: designTokens.shadows.glow.red,
          }
        }
      },
      
      input: {
        base: {
          fontFamily: designTokens.typography.fontFamily.sans.join(', '),
          fontSize: designTokens.typography.fontSize.base,
          color: '#c0caf5',
          backgroundColor: designTokens.colors.neutral[800],
          border: `1px solid ${designTokens.colors.neutral[700]}`,
          borderRadius: designTokens.borderRadius.md,
          padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
          transition: `all ${designTokens.animation.duration.normal} ${designTokens.animation.easing.out}`,
          outline: 'none',
        },
        sizes: {
          sm: {
            height: designTokens.components.input.height.sm,
            fontSize: designTokens.typography.fontSize.sm,
            padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
          },
          base: {
            height: designTokens.components.input.height.base,
            fontSize: designTokens.typography.fontSize.base,
            padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
          },
          lg: {
            height: designTokens.components.input.height.lg,
            fontSize: designTokens.typography.fontSize.lg,
            padding: `${designTokens.spacing[4]} ${designTokens.spacing[5]}`,
          }
        }
      },
      
      card: {
        base: {
          backgroundColor: designTokens.colors.neutral[800],
          border: `1px solid ${designTokens.colors.neutral[700]}`,
          borderRadius: designTokens.components.card.borderRadius,
          padding: designTokens.components.card.padding,
          boxShadow: designTokens.shadows.md,
        }
      }
    },
    
    // Animation presets
    animations: {
      fadeIn: {
        opacity: 0,
        transition: `opacity ${designTokens.animation.duration.normal} ${designTokens.animation.easing.out}`,
      },
      slideIn: {
        transform: 'translateY(8px)',
        opacity: 0,
        transition: `all ${designTokens.animation.duration.normal} ${designTokens.animation.easing.out}`,
      },
      scaleIn: {
        transform: 'scale(0.95)',
        opacity: 0,
        transition: `all ${designTokens.animation.duration.fast} ${designTokens.animation.easing.bounce}`,
      }
    }
  }), []);
};

// Hook for accessing specific token categories
export const useColors = () => {
  const { colors } = useDesignTokens();
  return colors;
};

export const useTypography = () => {
  const { typography } = useDesignTokens();
  return typography;
};

export const useComponentStyles = () => {
  const { components } = useDesignTokens();
  return components;
};

export const useAnimations = () => {
  const { animations } = useDesignTokens();
  return animations;
};

// CSS-in-JS helper for styled-components or emotion
export const createStyledProps = (tokenPath: string) => {
  const keys = tokenPath.split('.');
  let value: any = designTokens;
  
  for (const key of keys) {
    value = value?.[key];
  }
  
  return value;
};

// CSS custom property helper
export const cssVar = (tokenName: string, fallback?: string): string => {
  return `var(--${tokenName}${fallback ? `, ${fallback}` : ''})`;
};

// Theme class generator for CSS modules
export const generateThemeClasses = () => {
  return {
    // Color classes
    'text-primary': { color: cssVar('color-text-primary') },
    'text-secondary': { color: cssVar('color-text-secondary') },
    'bg-surface': { backgroundColor: cssVar('color-surface') },
    'bg-primary': { backgroundColor: cssVar('color-primary-500') },
    
    // Typography classes
    'heading-1': {
      fontSize: cssVar('font-size-3xl'),
      fontWeight: cssVar('font-weight-bold'),
      lineHeight: cssVar('line-height-tight'),
    },
    'body-text': {
      fontSize: cssVar('font-size-base'),
      lineHeight: cssVar('line-height-normal'),
    },
    
    // Component classes
    'button-base': {
      padding: cssVar('button-padding-base'),
      borderRadius: cssVar('border-radius-md'),
      transition: 'all var(--duration-normal) var(--easing-out)',
    }
  };
};

export default useDesignTokens;