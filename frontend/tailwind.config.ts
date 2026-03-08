import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "#1E1E2E",
        input: "#1E1E2E",
        ring: "#C9A84C",
        background: "#0A0A0F",
        foreground: "#F0F0F5",
        primary: {
          DEFAULT: "#C9A84C",
          foreground: "#0A0A0F",
        },
        secondary: {
          DEFAULT: "#0F0F1A",
          foreground: "#F0F0F5",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#F0F0F5",
        },
        muted: {
          DEFAULT: "#13131F",
          foreground: "#8888A0",
        },
        accent: {
          DEFAULT: "#C9A84C",
          foreground: "#0A0A0F",
          hover: "#E2BC5E",
        },
        card: {
          DEFAULT: "#13131F",
          foreground: "#F0F0F5",
        },
        popover: {
          DEFAULT: "#13131F",
          foreground: "#F0F0F5",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Playfair Display", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      maxWidth: {
        container: "1280px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        shimmer: "shimmer 2s infinite linear",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
