import type { Config } from "tailwindcss";

const config: Config = {
  // Tailwind сканує ці файли щоб зрозуміти які класи використовуються
  // і прибрати всі інші зі збірки — фінальний CSS буде маленьким
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // власні кольори для consistent дизайну
        primary: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
