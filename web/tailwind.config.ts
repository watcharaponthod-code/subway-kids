import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: { game: ["'Press Start 2P'", "monospace"] },
      colors: {
        brand: {
          purple: "#5352ed",
          yellow: "#ffd700",
          red: "#ff4757",
          dark: "#0f0f1a",
          card: "#1a1a2e",
          road: "#16213e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
