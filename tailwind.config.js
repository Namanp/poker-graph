/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        poker: {
          green: '#1a472a',
          felt: '#2d5a27',
          gold: '#c9a84c',
          dark: '#0f1923',
          card: '#f5f0e8',
        },
      },
    },
  },
  plugins: [],
};
