/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5ff',
          100: '#e0eaff',
          500: '#4f6df5',
          600: '#3b5de7',
          700: '#2a4ad4',
          800: '#1e3a9f',
          900: '#162d6e',
        },
      },
    },
  },
  plugins: [],
};
