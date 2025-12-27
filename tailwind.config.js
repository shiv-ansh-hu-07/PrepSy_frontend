export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
  extend: {
    colors: {
      paper: "#f7f8fc",
      card: "#ffffff",
      borderSoft: "#e6e8ef",
      primary: "#7b8bbd",
      primarySoft: "#e9ecf6",
      textMain: "#2e2f33",
      textMuted: "#6b7280",
    },
    boxShadow: {
      soft: "0 10px 40px rgba(0,0,0,0.06)",
    },
    fontFamily: {
      serif: ["Playfair Display", "serif"],
      sans: ["Inter", "system-ui"],
    },
  },
},

  plugins: [],
};
