/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        falu: {
          blue: '#0B2347',
          light: '#F4F7F6',
          accent: '#3B82F6'
        }
      }
    },
  },
  plugins: [],
}