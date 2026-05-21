/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#e11d48',
        'accent-dark': '#fb4d6e',
        warn: '#f59e0b',
        info: '#3b82f6',
      },
    },
  },
  plugins: [],
}
