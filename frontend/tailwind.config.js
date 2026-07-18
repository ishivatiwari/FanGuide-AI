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
        // ── Pitch Green — secondary accent for status/density/live data ──
        pitch: {
          300: '#4dffa0',
          400: '#00ff87',
          500: '#00d46a',
          600: '#00a854',
          700: '#007a3d',
        },
        stadium: {
          dark:   '#061018', // Deeper navy — primary background
          card:   '#0d1f35', // Slightly lighter for cards
          border: '#1a3052', // Subtle border
          muted:  '#253d5e', // Secondary text areas
          light:  '#4a6080', // Tertiary text / labels
          panel:  '#081525', // Right panel background (darker)
        },
        density: {
          low:    '#00d46a', // Pitch green
          medium: '#f59e0b', // Amber
          high:   '#ef4444', // Red
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        data:    ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in':        'fadeIn 0.35s ease-out both',
        'fade-in-up':     'fadeInUp 0.4s ease-out both',
        'slide-up':       'slideUp 0.3s ease-out both',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        'bounce-in':      'bounceIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
        'pulse-slow':     'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-ring':     'pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse':     'glowPulse 2.5s ease-in-out infinite',
        'float':          'float 4s ease-in-out infinite',
        'shimmer':        'shimmer 1.5s infinite',
        'border-glow':    'borderGlow 2s ease-in-out infinite',
        'scale-in':       'scaleIn 0.25s cubic-bezier(0.34,1.2,0.64,1) both',
        'typing':         'typing 1.2s steps(3) infinite',
        'zone-pulse':     'zonePulse 2.5s ease-in-out infinite',
        'scan-line':      'scanLine 3s linear infinite',
        'thinking-dot':   'thinkingDot 1.4s ease-in-out infinite',
        'density-flash':  'densityFlash 0.6s ease-out',
        'card-enter':     'cardEnter 0.4s cubic-bezier(0.34,1.4,0.64,1) both',
        'countdown':      'countPulse 1s ease-in-out infinite',
        'sidebar-in':     'sidebarIn 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'panel-in':       'panelIn 0.55s cubic-bezier(0.22,1,0.36,1) both',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceIn: {
          '0%':   { opacity: '0', transform: 'scale(0.88) translateY(8px)' },
          '60%':  { opacity: '1', transform: 'scale(1.03) translateY(-2px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        cardEnter: {
          '0%':   { opacity: '0', transform: 'translateX(16px) scale(0.96)' },
          '60%':  { opacity: '1', transform: 'translateX(-2px) scale(1.01)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        pulseRing: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%':      { transform: 'scale(1.18)', opacity: '0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(48, 96, 255, 0.3)' },
          '50%':      { boxShadow: '0 0 28px rgba(48, 96, 255, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgba(255, 200, 10, 0.3)' },
          '50%':      { borderColor: 'rgba(255, 200, 10, 0.8)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        typing: {
          '0%':   { content: '"."' },
          '33%':  { content: '".."' },
          '66%':  { content: '"..."' },
        },
        zonePulse: {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%':      { opacity: '1', transform: 'scale(1.08)' },
        },
        scanLine: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        thinkingDot: {
          '0%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '50%':      { transform: 'scale(1)', opacity: '1' },
        },
        densityFlash: {
          '0%':   { opacity: '0.4' },
          '50%':  { opacity: '1' },
          '100%': { opacity: '0.85' },
        },
        countPulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.7' },
        },
        sidebarIn: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        panelIn: {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backgroundImage: {
        'hero-gradient':     'linear-gradient(135deg, #061018 0%, #0d1f35 50%, #061018 100%)',
        'hero-radial':       'radial-gradient(ellipse at 50% 0%, rgba(48,96,255,0.15) 0%, transparent 70%)',
        'card-gradient':     'linear-gradient(145deg, #0d1f35, #1a3052)',
        'card-gradient-alt': 'linear-gradient(145deg, #091729, #152840)',
        'gold-gradient':     'linear-gradient(90deg, #ffc80a, #ffd84d, #e6b000)',
        'gold-gradient-135': 'linear-gradient(135deg, #ffc80a, #ffd84d)',
        'brand-gradient':    'linear-gradient(135deg, #3060ff, #5580ff)',
        'pitch-gradient':    'linear-gradient(135deg, #00d46a, #00ff87)',
        'panel-gradient':    'linear-gradient(180deg, #081525 0%, #061018 100%)',
        'shimmer-gradient':  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        'mesh-gradient':     'radial-gradient(at 40% 20%, rgba(48,96,255,0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(255,200,10,0.05) 0px, transparent 50%)',
        'alert-gradient':    'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)',
        'density-low':       'linear-gradient(90deg, rgba(0,212,106,0.2), rgba(0,212,106,0.05))',
        'density-medium':    'linear-gradient(90deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
        'density-high':      'linear-gradient(90deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))',
      },
      boxShadow: {
        'brand-glow':    '0 0 24px rgba(48, 96, 255, 0.3)',
        'brand-glow-lg': '0 0 40px rgba(48, 96, 255, 0.45)',
        'gold-glow':     '0 0 20px rgba(255, 200, 10, 0.4)',
        'gold-glow-lg':  '0 0 36px rgba(255, 200, 10, 0.55)',
        'pitch-glow':    '0 0 20px rgba(0, 212, 106, 0.4)',
        'pitch-glow-lg': '0 0 36px rgba(0, 212, 106, 0.55)',
        'card':          '0 4px 24px rgba(0, 0, 0, 0.5)',
        'card-hover':    '0 8px 32px rgba(0, 0, 0, 0.6)',
        'card-sm':       '0 2px 12px rgba(0, 0, 0, 0.4)',
        'inner-glow':    'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'nav-active':    '0 0 16px rgba(48, 96, 255, 0.4)',
        'panel-glow':    '0 0 48px rgba(6,16,24,0.8), inset 0 0 1px rgba(255,255,255,0.04)',
        'zone-high':     '0 0 12px rgba(239,68,68,0.5)',
        'zone-medium':   '0 0 12px rgba(245,158,11,0.4)',
        'zone-low':      '0 0 12px rgba(0,212,106,0.4)',
      },
    },
  },
  plugins: [],
};
