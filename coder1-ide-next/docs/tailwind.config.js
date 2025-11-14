/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx,md,mdx}',
    './components/**/*.{js,jsx,ts,tsx,md,mdx}',
    './theme.config.tsx',
  ],
  theme: {
    extend: {
      colors: {
        // Coder1 brand colors
        coder1: {
          blue: '#3B82F6',
          purple: '#8B5CF6',
          dark: '#0F172A',
          surface: '#1E293B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};
