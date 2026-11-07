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
        canvas: "var(--canvas)",
        surface: {
          DEFAULT: "var(--surface)",
          panel: "var(--panel)",
          card: "var(--surface)",
          muted: "var(--border)",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border)",
          focus: "var(--accent)",
        },
        accent: "var(--accent)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "pain-border": "var(--pain-border)",
        "pain-text": "var(--pain-text)",
        "pain-background": "var(--pain-background)",
        "pain-hover": "var(--pain-hover)",
        "speak-background": "var(--speak-background)",
        studio: {
          text: "var(--text-primary)",
          muted: "var(--text-secondary)",
          dim: "var(--text-secondary)",
          red: "var(--pain-border)",
          amber: "var(--accent)",
          green: "var(--accent)",
          cyan: "var(--accent)",
        },
        clinical: {
          text: "var(--text-primary)",
          muted: "var(--text-secondary)",
          teal: "var(--accent)",
          "teal-light": "var(--surface)",
          amber: "var(--accent)",
          rose: "var(--pain-border)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
