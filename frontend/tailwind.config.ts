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
        surface: "var(--surface)",
        border: "var(--border)",
        accent: "var(--accent)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "pain-border": "var(--pain-border)",
        "pain-text": "var(--pain-text)",
        "pain-background": "var(--pain-background)",
        "pain-hover": "var(--pain-hover)",
        "speak-background": "var(--speak-background)",
        clinical: {
          text: "var(--text-primary)",
          teal: "var(--accent)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
