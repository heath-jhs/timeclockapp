/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1d4ed8', // blue-700
        secondary: '#6b7280' // gray-500
      }
    },
  },
  plugins: [],
}
