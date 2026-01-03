/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#8b4513",
        secondary: "#d4a574",
        accent: "#f4e4d4",
        dark: "#1a120b",
        "dark-alt": "#2c1810",
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
      }
    },
  },
  plugins: [typography],
}
