/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        field: {
          bg: "#0a1628",
          panel: "#0f1f36",
          line: "#1a3152",
          chalk: "#e8eef7",
          mute: "#8aa3c2",
        },
        diamond: {
          gold: "#f5c46b",
          red: "#e04e4e",
          green: "#3fd17a",
          blue: "#4aa3ff",
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
