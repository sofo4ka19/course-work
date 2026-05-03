import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sidebar: "#0f0f13",
        "sidebar-border": "rgba(255,255,255,0.06)",
        "sidebar-active": "rgba(139,92,246,0.15)",
        surface: "#13131a",
        card: "#1c1b26",
        "card-border": "rgba(255,255,255,0.07)",
        accent: {
          50: "rgba(139,92,246,0.08)",
          100: "rgba(139,92,246,0.14)",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        success: {
          50: "rgba(16,185,129,0.08)",
          100: "rgba(16,185,129,0.14)",
          200: "rgba(16,185,129,0.25)",
          500: "#10b981",
          600: "#059669",
          700: "#34d399",
        },
        warn: {
          50: "rgba(234,179,8,0.08)",
          100: "rgba(234,179,8,0.14)",
          500: "#eab308",
          700: "#fbbf24",
        },
        danger: {
          50: "rgba(239,68,68,0.08)",
          100: "rgba(239,68,68,0.14)",
          200: "rgba(239,68,68,0.25)",
          500: "#ef4444",
          700: "#f87171",
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
