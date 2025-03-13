/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'wave-bar': {
          '0%': {
            background: '#3370ff',
            marginTop: '3%',
            height: '40%',
          },
          '50%': {
            background: '#3370ff',
            marginTop: '0%',
            height: '80%',
          },
          '100%': {
            background: '#3370ff',
            marginTop: '3%',
            height: '40%',
          }
        },
        'wave-bar-green': {
          '0%': {
            background: '#10B981',
            marginTop: '3%',
            height: '40%',
          },
          '50%': {
            background: '#10B981',
            marginTop: '0%',
            height: '80%',
          },
          '100%': {
            background: '#10B981',
            marginTop: '3%',
            height: '40%',
          }
        }
      },
      animation: {
        'wave-bar': 'wave-bar 1s infinite linear',
        'wave-bar-green': 'wave-bar-green 1s infinite linear',
      },
    },
  },
  plugins: [],
}; 