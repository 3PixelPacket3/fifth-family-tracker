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
        cartel: {
          bg: "#090a0f",
          surface: "#12141d",
          card: "#171a26",
          border: "#262b3d",
          gold: "#d4af37",
          goldLight: "#f3e5ab",
          crimson: "#991b1b",
          crimsonBright: "#dc2626",
          emerald: "#10b981",
        },
      },
      maxHeight: {
        block: "564px",
      },
    },
  },
  plugins: [],
};
export default config;
