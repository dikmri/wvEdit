/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{svelte,ts}"],
  theme: {
    extend: {
      colors: {
        dark: {
          900: "#0a0a0a",
          800: "#111111",
          700: "#1a1a1a",
          600: "#242424",
          500: "#2e2e2e",
          400: "#3a3a3a",
          300: "#4a4a4a",
          200: "#666666",
          100: "#999999",
        },
        accent: {
          blue: "#4c8bf5",
          green: "#34d399",
          red: "#f87171",
          yellow: "#fbbf24",
        },
      },
    },
  },
  plugins: [],
};
