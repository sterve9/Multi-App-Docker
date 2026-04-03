/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        farm: {
          green: '#2d6a4f',
          'green-light': '#52b788',
          'green-pale': '#d8f3dc',
          orange: '#e76f00',
          'orange-light': '#f4a261',
          yellow: '#f0c419',
          brown: '#6b4226',
          cream: '#fefae0',
        },
      },
    },
  },
  plugins: [],
}
