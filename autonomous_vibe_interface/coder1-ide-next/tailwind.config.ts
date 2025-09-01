import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Your exact colors from current IDE
        'coder1': {
          'cyan': '#00D9FF',
          'cyan-secondary': '#06b6d4',
          'cyan-light': '#67e8f9',
          'purple': '#8b5cf6',
          'orange': 'rgba(251, 146, 60, 0.3)',
          'orange-hover': 'rgba(251, 146, 60, 0.6)',
        },
        'bg': {
          'primary': '#0a0a0a',
          'secondary': '#1a1a1a',
          'tertiary': 'rgba(255, 255, 255, 0.03)',
          'glass': 'rgba(255, 255, 255, 0.05)',
        },
        'border': {
          'default': 'rgba(255, 255, 255, 0.08)',
          'hover': 'rgba(0, 217, 255, 0.3)',
          'active': 'rgba(0, 217, 255, 0.5)',
        },
        'text': {
          'primary': '#ffffff',
          'secondary': '#a0a0a0',
          'muted': '#6b7280',
        }
      },
      boxShadow: {
        // Your exact glow effects
        'glow-orange': '0 0 20px rgba(251, 146, 60, 0.4)',
        'glow-orange-intense': '0 0 40px rgba(251, 146, 60, 0.6)',
        'glow-cyan': '0 0 20px rgba(0, 217, 255, 0.4)',
        'glow-cyan-intense': '0 0 40px rgba(0, 217, 255, 0.6)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.4)',
      },
      animation: {
        'pulse-glow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 3s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
export default config