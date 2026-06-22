import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "Inter", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        base: "#0b0e16",
        panel: "#141a2a",
        line: "#28304a",
        brand: "#6e8bff",
        brand2: "#38e0c8",
        ok: "#2dd4a7",
        warn: "#f7a93b",
        danger: "#fb6f84",
        muted: "#8c95ad",
      },
    },
  },
  plugins: [],
};
export default config;
