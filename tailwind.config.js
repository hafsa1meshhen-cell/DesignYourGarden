/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        ink: v('ink'),
        muted: v('muted'),
        line: v('line'),
        leaf: { DEFAULT: v('leaf'), 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a' },
        sun: { DEFAULT: '#facc15', 300: '#fde047', 400: '#facc15' },
        forest: { 900: '#04140c', 800: '#071d12', 700: '#0b2a1b', 600: '#103a25' },
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--leaf) / .25), 0 10px 40px -10px rgb(var(--leaf) / .45)',
        soft: '0 10px 30px -12px rgb(0 0 0 / .35)',
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
}
