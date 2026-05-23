/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Premium Fitness Colors
        surface: "#13131a",
        surface2: "#1c1c27",
        accent: "#7c6ef5",
        accent2: "#00d4aa",
        // Electric Orange Theme (Premium)
        electric: {
          50: "#fff5ee",
          500: "#FF6B35",
          600: "#e65a28",
        },
        // Deep Navy
        navy: {
          900: "#1A1A2E",
          800: "#2a3348",
          700: "#3c4963",
          500: "#647599",
          300: "#a2abc3",
        },
        // Status Colors
        success: { 500: "#10b981", 600: "#059669" },
        warning: { 500: "#f59e0b", 600: "#d97706" },
        danger: { 500: "#ef4444", 600: "#dc2626" },
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s infinite",
        fadeIn: "fadeIn 0.3s ease-in",
        slideUp: "slideUp 0.3s ease-out",
        flame: "flame 2s ease-in-out infinite",
        bounce: "bounce 1s infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        flame: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.2)", opacity: "0.8" },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [
    ({ addComponents }) => {
      addComponents({
        ".btn-primary": {
          "@apply": "px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-all",
        },
        ".btn-ghost": {
          "@apply": "px-4 py-2 hover:bg-surface2 rounded-lg transition-all",
        },
        ".card": {
          "@apply": "bg-surface2 border border-surface rounded-xl p-4 hover:shadow-lg transition-shadow",
        },
        ".badge": {
          "@apply": "inline-block px-2 py-1 text-xs rounded-full bg-accent text-white",
        },
        ".text-gradient": {
          "@apply": "bg-gradient-to-r from-electric-500 to-accent2 bg-clip-text text-transparent",
        },
        ".status-online": {
          "@apply": "inline-block w-2 h-2 bg-success-500 rounded-full animate-pulse",
        },
        ".skeleton": {
          "@apply": "animate-shimmer bg-gradient-to-r from-surface via-surface2 to-surface bg-[length:1000px_100%]",
        },
      });
    },
  ],
};
