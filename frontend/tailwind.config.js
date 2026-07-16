/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── FanGuide AI Design System ──────────────────────────────────────
        // Deep navy + gold palette inspired by the FIFA World Cup trophy
        brand: {
          50:  '#e8f0ff',
          100: '#c5d5ff',
          200: '#9fb8ff',
          300: '#7a9bff',
          400: '#5580ff',
          500: '#3060ff', // Primary brand blue
          600: '#2050e8',
          700: '#1040c0',
          800: '#083098',
          900: '#031878',
        },
        gold: {
          300: '#ffd84d',
          400: '#ffc80a',
          500: '#e6b000',
          600: '#cc9900',
        },
        stadium: {
          dark:   '#0A1628', // Deep navy — primary background
          card:   '#111f3a', // Slightly lighter for cards
          border: '#1e3160', // Subtle border
          muted:  '#2a4070', // Secondary text areas
          light:  '#4a6090', // Tertiary text / labels
        },
        density: {
          low:    '#22c55e', // Green
          medium: '#f59e0b', // Amber
          high:   '#ef4444', // Red
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':     'fadeIn 0.3s ease-out',
        'slide-up':    'slideUp 0.3s ease-out',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typing':      'typing 1.2s steps(3) infinite',
        'shimmer':     'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        typing: {
          '0%':   { content: '"."' },
          '33%':  { content: '".."' },
          '66%':  { content: '"..."' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0A1628 0%, #1e3160 50%, #0A1628 100%)',
        'card-gradient': 'linear-gradient(145deg, #111f3a, #1e3160)',
        'gold-gradient': 'linear-gradient(90deg, #ffc80a, #ffd84d, #e6b000)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
      },
      boxShadow: {
        'brand-glow': '0 0 24px rgba(48, 96, 255, 0.3)',
        'gold-glow':  '0 0 20px rgba(255, 200, 10, 0.4)',
        'card':       '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};
