/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // <--- Make sure this line is present
    "./public/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}