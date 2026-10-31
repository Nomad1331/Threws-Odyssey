import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0B1120", // Deep Medical Slate
        surface: {
          DEFAULT: "#1E293B", // Muted Clinical Navy
          light: "#283548",
          dark: "#0F172A",
        },
        border: {
          DEFAULT: "#334155",
          subtle: "#1E293B",
        },
        clinical: {
          text: "#F8FAFC", // Pure Crisp Chalk (WCAG AAA)
          muted: "#94A3B8", // Soft Slate
          teal: "#0D9488", // Therapeutic Teal Primary
          "teal-light": "#14B8A6",
          amber: "#F59E0B", // Soft Amber (States/Alerts)
          rose: "#E11D48", // Emergency alerts
        },
      },
      boxShadow: {
        "aura-idle": "0 0 25px -5px rgba(13, 148, 136, 0.25)",
        "aura-active": "0 0 45px -5px rgba(20, 184, 166, 0.4)",
        "aura-pulse": "0 0 60px 0px rgba(13, 148, 136, 0.35)",
        "card-subtle": "0 4px 20px -2px rgba(0, 0, 0, 0.3)",
      },
      keyframes: {
        "gentle-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "50%": { transform: "scale(1.05)", opacity: "1" },
        },
        "ripple-aura": {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "50%": { transform: "scale(1.15)", opacity: "0.2" },
          "100%": { transform: "scale(1.25)", opacity: "0" },
        },
      },
      animation: {
        "gentle-pulse": "gentle-pulse 2.4s ease-in-out infinite",
        "ripple-aura": "ripple-aura 2.2s cubic-bezier(0, 0.2, 0.8, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
