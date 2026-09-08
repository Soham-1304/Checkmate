/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        palette: {
          bg: '#E5F0EC',        // Pale sage / mint background
          primary: '#017374',   // Deep teal
          'primary-dark': '#015758',
          'primary-hover': '#006263',
          secondary: '#8EC8BA', // Mint / soft sage teal
          orange: '#E37820',    // Vivid warm orange
          'orange-hover': '#c96414',
          yellow: '#FEB519',    // Warm golden amber / yellow
          'yellow-light': '#fef3c7',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(1, 115, 116, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'card-hover': '0 6px 12px -2px rgba(1, 115, 116, 0.08), 0 3px 6px -2px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
