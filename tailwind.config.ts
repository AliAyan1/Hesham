import type { Config } from "tailwindcss";

const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0F4C75",
          teal: "#1D9E75",
          navy: "#0D2137",
          lightBlue: "#EFF6FF",
          lightTeal: "#E1F5EE",
          darkTeal: "#0F6E56",
          darkBlue: "#083358",
          goldMuted: "#FEF3C7",
          gold: "#D97706",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
