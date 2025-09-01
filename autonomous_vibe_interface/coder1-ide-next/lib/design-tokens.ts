/**
 * Design Tokens - Preserved from Original IDE
 * 
 * IMPORTANT: These are the exact values from the current IDE.
 * DO NOT MODIFY without checking the original implementation.
 */

export const colors = {
  // Background colors - exact from current IDE
  bg: {
    primary: '#0a0a0a',
    secondary: '#1a1a1a',
    tertiary: 'rgba(255, 255, 255, 0.03)',
    float: 'rgba(255, 255, 255, 0.05)',
  },
  
  // Glass morphism
  glass: {
    bg: 'rgba(255, 255, 255, 0.03)',
    backdrop: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  
  // Cyan accent - your exact values
  cyan: {
    primary: '#00D9FF',
    secondary: '#06b6d4',
    light: '#67e8f9',
    accent: '#0891b2',
  },
  
  // Purple accent
  purple: {
    primary: '#8b5cf6',
    secondary: '#a78bfa',
  },
  
  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#a0a0a0',
    muted: '#6b7280',
    accent: '#00D9FF',
  },
  
  // Status colors
  status: {
    success: '#8b5cf6', // Changed from green to purple as per your design
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#00D9FF',
  },
} as const;

export const glows = {
  // Orange glow - your EXACT values
  orange: {
    border: 'rgba(251, 146, 60, 0.3)',
    borderHover: 'rgba(251, 146, 60, 0.6)',
    soft: '0 0 10px rgba(251, 146, 60, 0.2)',
    medium: '0 0 20px rgba(251, 146, 60, 0.4)',
    intense: '0 0 40px rgba(251, 146, 60, 0.6)',
    combined: `
      0 0 10px rgba(251, 146, 60, 0.2),
      0 0 20px rgba(251, 146, 60, 0.1),
      inset 0 0 10px rgba(251, 146, 60, 0.05)
    `,
    combinedHover: `
      0 0 20px rgba(251, 146, 60, 0.4),
      0 0 40px rgba(251, 146, 60, 0.2),
      inset 0 0 15px rgba(251, 146, 60, 0.1)
    `,
  },
  
  // Cyan glow
  cyan: {
    soft: '0 0 10px rgba(0, 217, 255, 0.2)',
    medium: '0 0 20px rgba(0, 217, 255, 0.4)',
    intense: '0 0 40px rgba(0, 217, 255, 0.6)',
    borderHover: '#00D9FF',
  },
  
  // Purple glow
  purple: {
    soft: '0 0 10px rgba(139, 92, 246, 0.2)',
    medium: '0 0 20px rgba(139, 92, 246, 0.4)',
    intense: '0 0 40px rgba(139, 92, 246, 0.6)',
    borderHover: '#8b5cf6',
  },
  
  // Green glow
  green: {
    soft: '0 0 10px rgba(34, 197, 94, 0.2)',
    medium: '0 0 20px rgba(34, 197, 94, 0.4)',
    intense: '0 0 40px rgba(34, 197, 94, 0.6)',
    borderHover: '#22c55e',
  },
  
  // Blue glow
  blue: {
    soft: '0 0 10px rgba(59, 130, 246, 0.2)',
    medium: '0 0 20px rgba(59, 130, 246, 0.4)',
    intense: '0 0 40px rgba(59, 130, 246, 0.6)',
    borderHover: '#3b82f6',
  },
} as const;

export const spacing = {
  // Terminal header - exact measurements
  terminalHeader: {
    height: '48px',
    padding: '0 12px',
    aiTeamButtonRight: '120px', // Exact position from right
  },
  
  // Panel sizes
  panels: {
    leftDefault: '15%', // Reduced from 20% as per your improvements
    rightDefault: '15%', // Reduced from 20%
    centerDefault: '70%', // Increased from 60%
  },
} as const;

export const animations = {
  // Your exact transition timings
  transitions: {
    all: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fast: 'all 0.2s ease-out',
    smooth: 'all 0.3s ease-out',
  },
  
  // Keyframe animations
  keyframes: {
    pulseGlow: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    shimmer: 'shimmer 3s linear infinite',
    fadeIn: 'fadeIn 0.3s ease-out',
    slideDown: 'slideDown 0.2s ease-out',
  },
} as const;

export const typography = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
} as const;