/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      boxShadow: {
        soft: '0 1px 2px rgba(16, 24, 40, 0.06)',
        card: '0 12px 30px rgba(15, 23, 42, 0.06)'
      }
    },
  },
  plugins: [],
};
