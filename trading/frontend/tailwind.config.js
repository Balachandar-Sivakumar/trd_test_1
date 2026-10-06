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
        brand: {
          dark: '#0b0e14',
          card: '#121722',
          cardBorder: '#1e2638',
          accent: '#3b82f6',
          bull: '#10b981',
          bear: '#ef4444',
          pending: '#f59e0b',
          live: '#06b6d4',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
