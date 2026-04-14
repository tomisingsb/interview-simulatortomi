import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#0a0a0a",
          950: "#070707",
          900: "#0f0f0f",
          800: "#161616",
          700: "#1f1f1f",
          600: "#2a2a2a",
          500: "#3a3a3a",
        },
        gloss: {
          pink: "#ff2e93",
          cyan: "#4ee2f0",
          purple: "#a855f7",
          yellow: "#fde047",
          orange: "#fb923c",
          lime: "#a3e635",
        },
      },
      borderRadius: {
        chunk: "1.75rem",
        pill: "999px",
      },
      boxShadow: {
        sticker: "0 0 0 2px rgba(255,255,255,0.06), 0 12px 32px -8px rgba(0,0,0,0.6)",
        glow: "0 0 24px -4px var(--tw-shadow-color)",
      },
    },
  },
  plugins: [],
};

export default config;
