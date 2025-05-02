/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef7ff',
          100: '#d9eaff',
          200: '#bbd8ff',
          300: '#8ebeff',
          400: '#599bff',
          500: '#4285F4', // Google Blue
          600: '#2a68da',
          700: '#2150b3',
          800: '#1e4692',
          900: '#1e3c78',
          950: '#16264d',
        },
        secondary: {
          50: '#fefce8',
          100: '#fdface',
          200: '#fbf392',
          300: '#f9e54c',
          400: '#F4B400', // Google Yellow
          500: '#e7a500',
          600: '#ca7e00',
          700: '#a15b03',
          800: '#85490a',
          900: '#723c0f',
          950: '#431f06',
        },
        accent: {
          50: '#fef2f3',
          100: '#fde6e7',
          200: '#fbd0d5',
          300: '#f7aab2',
          400: '#f27886',
          500: '#DB4437', // Google Red
          600: '#c42d2d',
          700: '#a62125',
          800: '#891e23',
          900: '#731d24',
          950: '#400b0f',
        },
        success: {
          50: '#effef7',
          100: '#d7faeb',
          200: '#b2f2d4',
          300: '#78e4af',
          400: '#3dcf89',
          500: '#0F9D58', // Google Green
          600: '#0a8049',
          700: '#0c673d',
          800: '#0e5332',
          900: '#0c442a',
          950: '#053018',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        fadeIn: 'fadeIn 0.3s ease-in-out',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      }
    },
  },
  plugins: [],
};