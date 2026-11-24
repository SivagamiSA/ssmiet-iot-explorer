import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Primary accent. If your logo's orange differs, change `500` (and adjust 600/700) here only.
        brand: { 50: "#FFF4EC", 100: "#FFE5D1", 500: "#E8590C", 600: "#CC4B06", 700: "#A63B04" },
        ink: { DEFAULT: "#18212D", soft: "#4A5565", faint: "#6B7685" },
        surface: "#F5F6F8",
        line: "#E2E5EA",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', "system-ui", "sans-serif"],
        sans: ['"Public Sans Variable"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(24,33,45,.06), 0 4px 14px rgba(24,33,45,.05)",
      },
    },
  },
  plugins: [],
} satisfies Config;
