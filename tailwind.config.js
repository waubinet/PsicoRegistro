/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          50: "var(--c-50)", 100: "var(--c-100)", 200: "var(--c-200)",
          300: "var(--c-300)", 700: "var(--c-700)", 800: "var(--c-800)", 900: "var(--c-900)",
        },
        accent: { DEFAULT: "#3d6b63", soft: "#e4efed", dark: "#2c4f49" },
      },
      fontSize: {
        app: "var(--font-base)",
      },
    },
  },
  plugins: [],
};
