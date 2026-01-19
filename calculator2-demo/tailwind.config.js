/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ffd700',
        secondary: '#d4a574',
        accent: '#1a120b',
      },
    },
  },
  plugins: [],
}
