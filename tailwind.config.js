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
        chess: {
          dark: '#1e293b',
          boardDark: '#739552',
          boardLight: '#ebecd0',
          boardDarkBlue: '#4b7399',
          boardLightBlue: '#eae9d2',
          boardDarkBrown: '#b58863',
          boardLightBrown: '#f0d9b5',
          panel: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          accent: '#10b981',
          accentHover: '#059669',
          blunder: '#ef4444',
          mistake: '#f97316',
          inaccuracy: '#eab308',
          good: '#3b82f6',
          excellent: '#06b6d4',
          best: '#10b981',
          brilliant: '#06b6d4',
          great: '#6366f1',
          missed: '#dc2626'
        }
      }
    },
  },
  plugins: [],
}
