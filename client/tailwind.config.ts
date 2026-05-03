import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sidebar: "#0f0f13",
        "sidebar-border": "rgba(255,255,255,0.06)",
        "sidebar-active": "rgba(139,92,246,0.15)",
        surface: "#f8f7ff",
        card: "#ffffff",
        "card-border": "#ede9fe",
        accent: {
          50: "#faf5ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        success: {
          50: "#f0fdf4",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          700: "#065f46",
        },
        warn: {
          50: "#fefce8",
          100: "#fef9c3",
          500: "#eab308",
          700: "#713f12",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#ef4444",
          700: "#991b1b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
