/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#050816',
        secondary: '#aaa6c3',
        tertiary: '#151030',
        'black-100': '#100d25',
        'black-200': '#090325',
        violet: '#915eff',
        'violet-dark': '#6b21a8',
        'violet-light': '#b794f6',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern': "url('/src/assets/herobg.png')",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'violet': '0 0 40px rgba(145, 94, 255, 0.4)',
        'violet-lg': '0 0 60px rgba(145, 94, 255, 0.6)',
      },
    },
  },
  plugins: [],
};
