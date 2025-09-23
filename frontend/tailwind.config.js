/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ff6b35', // 메인 주황색
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        dark: {
          50: '#f8f8f8',
          100: '#e3e3e3',
          200: '#c8c8c8',
          300: '#a4a4a4',
          400: '#9aa0a6',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#2f2f30',
          850: '#1f1f20',
          900: '#131314',
        },
        light: {
          50: '#FBFBFB',
          100: '#f2f2f2',
          200: '#e6e6e6',
          300: '#d9d9d9',
          400: '#cccccc',
          500: '#bfbfbf',
          600: '#b3b3b3',
          700: '#a6a6a6',
          800: '#999999',
          850: '#8c8c8c',
          900: '#808080',
        }
      },
      spacing: {
        '13': '3.25rem',
        '15': '3.75rem',
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
      },
      animation: {
        'pulse-recording': 'pulse 2s infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}