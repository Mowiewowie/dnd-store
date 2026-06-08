/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#f5e6c8',
        ink: '#2c1810',
        gold: '#c9a84c',
        ember: '#8b2500',
        stone: '#4a4a4a',
      },
    },
  },
  plugins: [],
};
