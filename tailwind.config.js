/* DO NOT add plugins with @apply here. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        bg3: "var(--bg3)",
        border: "var(--border)",
        accent: "var(--accent)",
        accent2: "var(--accent2)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        text: "var(--text)",
        muted: "var(--muted)",
        surface: "#13131a",
        surface2: "#1c1c27",
        "electric-500": "#7c6ef5",
        "electric-600": "#6b5ce6",
        "navy-900": "#0a0a0f",
      },
    },
  },
  plugins: [],
};
