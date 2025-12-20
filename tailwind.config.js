export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          900: "#0b1220",
          800: "#0f172a", // primary dark
          700: "#14243a",
          accent: "#06b6d4", // teal/cyan accent (neon-ish)
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
