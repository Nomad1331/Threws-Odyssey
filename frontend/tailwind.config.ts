import type { Config } from "tailwindcss";

/**
 * Tailwind theme.
 *
 * Every colour points at a CSS variable defined in `src/app/globals.css`; this
 * keeps one palette in one place and lets a future light/dark switch change the
 * variables without rewriting component classes. Only tokens actually used by
 * the components are declared here — dead palette entries were removed so the
 * config cannot drift from the UI.
 */
const config: Config = {
  // Files scanned for class names. Keep these globs narrow: every extra path
  // slows the build and can keep unused utilities alive.
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
        // Legacy names kept because layout.tsx uses them; both resolve to the
        // same variables as text-primary/accent.
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
