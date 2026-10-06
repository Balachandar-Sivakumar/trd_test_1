/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#090d16',
          800: '#0f172a',
          700: '#1e293b',
          600: '#334155',
        },
        trade: {
          buy: '#10b981', // emerald-500
          sell: '#f43f5e', // rose-500
          pending: '#f59e0b', // amber-500
          target: '#059669', // emerald-600
          stop: '#e11d48', // rose-600
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
