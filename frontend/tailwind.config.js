/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm off-black surface palette. Slight brown undertone reads
        // less "blue startup dashboard" than the old navy.
        ink: {
          bg:     "#0d0e12",
          panel:  "#14151b",
          rise:   "#1a1b22",
          line:   "#262730",
          line2:  "#33343e",
          text:   "#e8e6e1",
          dim:    "#9b9a94",
          faint:  "#6e6c65",
        },
        // Single warm accent. Data colors kept muted to feel editorial
        // rather than gamified.
        accent: "#c89c4c",
        pos:    "#7ba974",
        neg:    "#c87670",
        tier: {
          S: "#c89c4c",
          A: "#7ba974",
          B: "#7d95b5",
          C: "#a69168",
          D: "#b07d5c",
          F: "#a96560",
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        serif:   ['Fraunces', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      },
    },
  },
  plugins: [],
};
