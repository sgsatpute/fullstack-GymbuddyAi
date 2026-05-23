/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#13131a",
        surface2: "#1c1c27",
        accent: "#7c6ef5",
        accent2: "#00d4aa",
      },
    },
  },
  plugins: [],
};
