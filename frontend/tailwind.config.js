/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#D4642A',
          50: '#FDF3EC',
          100: '#FAE2CF',
          200: '#F5C4A0',
          300: '#EFA070',
          400: '#E87840',
          500: '#D4642A',
          600: '#B85020',
          700: '#963F18',
          800: '#732F12',
          900: '#52200C',
        },
        surface: '#FDF8F5',
        dark: '#1a1a1a',
      },
      fontFamily: {
        sans: ['"Google Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
