/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        retro: {
          bg: '#1A1A2E',      // Deep space blue
          panel: '#2D2D44',   // 16-bit slate
          light: '#E0E0FF',   // Bright lavender-white
          purple: '#9D50BB',  // Vibrant purple gradient start
          magenta: '#6E48AA', // Vibrant purple gradient end
          cyan: '#00F5FF',    // Neon cyan for data
          lime: '#39FF14',    // Neon lime for success
          red: '#FF0055',     // Vibrant red for errors/danger
          gold: '#FFD700',    // For premium players/rank
        },
        snes: {
          light: '#C0C0C0',
          dark: '#808080',
          purple: '#9D50BB',  // Upgraded to more vibrant
          lavender: '#A18FD1',
          blue: '#1A1A2E',    // Upgraded to deeper blue
          accent: '#FF0055',  // Upgraded to neon red
        },
        brand: {
          50: '#f0f5ff',
          100: '#e0eaff',
          500: '#9D50BB', 
          600: '#6E48AA',
          700: '#52348A',
          800: '#1A1A2E',
          900: '#0F0F1B',
        },
      },
      fontFamily: {
        retro: ['"Pixelify Sans"', 'cursive'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        pixel: ['"Silkscreen"', 'cursive'],
      },
    },
  },
  plugins: [],
};
