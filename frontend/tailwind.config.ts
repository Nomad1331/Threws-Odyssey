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
        canvas: "#09090b", // Deep Studio Obsidian (Zinc 950)
        surface: {
          DEFAULT: "#121215", // Matte Industrial Charcoal
          panel: "#18181b", // Studio Rack Surface (Zinc 900)
          card: "#18181b",
          muted: "#27272a", // Zinc 800
        },
        border: {
          DEFAULT: "#27272a", // Precision 1px Studio Edge
          subtle: "#1c1c20",
          focus: "#52525b",
        },
        studio: {
          text: "#f4f4f5", // High-Contrast Chalk (Zinc 100)
          muted: "#71717a", // Technical Readout Gray (Zinc 500)
          dim: "#52525b", // Zinc 600
          red: "#ef4444", // Recording Active LED
          amber: "#f59e0b", // Processing / Warning State
          green: "#22c55e", // Operational / Ready State
          cyan: "#06b6d4", // Digital Oscilloscope Phosphor
        },
        // Backward-compatible semantic tokens
        clinical: {
          text: "#f4f4f5",
          muted: "#71717a",
          teal: "#18181b",
          "teal-light": "#f4f4f5",
          amber: "#f59e0b",
          rose: "#ef4444",
        },
      },
      boxShadow: {
        "tactile-switch": "0 4px 0 0 #000, 0 6px 12px rgba(0, 0, 0, 0.5)",
        "tactile-pressed": "inset 0 3px 6px rgba(0, 0, 0, 0.8)",
        "panel-rim": "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 4px 20px rgba(0, 0, 0, 0.6)",
        "led-red": "0 0 10px 1px rgba(239, 68, 68, 0.6)",
        "led-amber": "0 0 10px 1px rgba(245, 158, 11, 0.5)",
        "led-green": "0 0 10px 1px rgba(34, 197, 94, 0.5)",
        "aura-idle": "none",
        "aura-active": "none",
        "aura-pulse": "none",
        "card-subtle": "0 2px 10px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
