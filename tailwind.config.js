/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#F6F0E2', 50: '#FFFCF5', 100: '#FBF7EE', 200: '#EFE6D2', 300: '#E2D6BC' },
        sky: { DEFAULT: '#5AAEE0', 50: '#EEF7FD', 100: '#D9EEFA', 400: '#7DC0E8', 500: '#5AAEE0', 600: '#3F96CC', 700: '#2E7AAD' },
        ink: { DEFAULT: '#141414', 2: '#3A3A3A', 3: '#6E6A62' },
        offwhite: '#FFFBF2'
      },
      fontFamily: { sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'Inter', 'sans-serif'] },
      boxShadow: {
        soft: '0 1px 2px rgba(60,45,20,.05), 0 8px 24px -12px rgba(60,45,20,.18)',
        lift: '0 2px 6px rgba(60,45,20,.06), 0 18px 40px -16px rgba(60,45,20,.28)'
      },
      borderRadius: { '2xl': '1.1rem', '3xl': '1.5rem' }
    }
  },
  plugins: []
};
