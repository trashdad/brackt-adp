/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        snes: {
          light: '#C0C0C0',
          dark: '#808080',
          purple: '#7E60B0',
          lavender: '#A18FD1',
          blue: '#2E2E3E',
          accent: '#FF4136', // Red accent for some highlights
        },
        brand: {
          50: '#f0f5ff',
          100: '#e0eaff',
          500: '#7E60B0', // Re-mapping brand to SNES purple
          600: '#6447A0',
          700: '#52348A',
          800: '#2E2E3E',
          900: '#1A1A2A',
        },
      },
      fontFamily: {
        retro: ['"Press Start 2P"', 'cursive'],
        pixel: ['"Silkscreen"', 'cursive'],
      },
    },
  },
  plugins: [],
};
