import type { Config } from 'tailwindcss'

const config: Config = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			coder1: {
  				cyan: '#00D9FF',
  				'cyan-secondary': '#06b6d4',
  				'cyan-light': '#67e8f9',
  				purple: '#8b5cf6',
  				orange: 'rgba(251, 146, 60, 0.3)',
  				'orange-hover': 'rgba(251, 146, 60, 0.6)'
  			},
  			bg: {
  				primary: '#0a0a0a',
  				secondary: '#1a1a1a',
  				tertiary: 'rgba(255, 255, 255, 0.03)',
  				glass: 'rgba(255, 255, 255, 0.05)'
  			},
  			border: 'hsl(var(--border))',
  			text: {
  				primary: '#ffffff',
  				secondary: '#a0a0a0',
  				muted: '#6b7280'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		boxShadow: {
  			'glow-orange': '0 0 20px rgba(251, 146, 60, 0.4)',
  			'glow-orange-intense': '0 0 40px rgba(251, 146, 60, 0.6)',
  			'glow-cyan': '0 0 20px rgba(0, 217, 255, 0.4)',
  			'glow-cyan-intense': '0 0 40px rgba(0, 217, 255, 0.6)',
  			'glow-purple': '0 0 20px rgba(139, 92, 246, 0.4)'
  		},
  		animation: {
  			'pulse-glow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			shimmer: 'shimmer 3s linear infinite'
  		},
  		keyframes: {
  			shimmer: {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    // Tour highlight classes - ensure they're included in production build
    'tour-highlight-blue',
    'tour-highlight-orange', 
    'tour-highlight-turquoise',
    // Tour backdrop and overlay classes
    'bg-black/50',
    'fixed',
    'inset-0',
    'pointer-events-none',
    'tour-tooltip',
    // Glow shadows
    'shadow-glow-cyan',
    'shadow-glow-orange',
    'shadow-glow-cyan-intense',
    'shadow-glow-orange-intense',
  ]
}
export default config