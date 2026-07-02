import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ocbc: {
          red: '#E30613',
          dark: '#B00009',
          ink: '#16161D',
          slate: '#5B5B6B',
          mist: '#F5F5F8',
          line: '#EAEAF0',
          gold: '#C8A45C',
          green: '#1F9D6B',
          amber: '#E8A33D',
          blue: '#2F6BFF',
          // Deep "night" palette for the overnight While-You-Were-Away hero card.
          night: '#171734',
          nightdeep: '#0D0D1E',
          glow: '#34D399',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 14px rgba(20,20,30,0.06)',
        lift: '0 12px 40px rgba(20,20,30,0.12)',
        glow: '0 8px 30px rgba(227,6,19,0.18)',
        night: '0 18px 50px rgba(13,13,30,0.45)',
        header: '0 10px 30px rgba(227,6,19,0.28)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '70%,100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'rise-in': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Soft halo for the live agent-mode status dot.
        'status-pulse': {
          '0%': { boxShadow: '0 0 0 0 rgba(255,255,255,0.55)' },
          '70%,100%': { boxShadow: '0 0 0 6px rgba(255,255,255,0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite',
        shimmer: 'shimmer 1.6s infinite',
        'rise-in': 'rise-in 0.35s ease both',
        'status-pulse': 'status-pulse 2s ease-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
