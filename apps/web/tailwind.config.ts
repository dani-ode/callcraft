import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        craft: {
          parchment: "#edd6bb", // (237,214,187) - Cream Draft Paper
          gold: "#e1b329",      // (225,179,41)  - Golden Yellow Sketch
          earth: "#8a715e",     // (138,113,94)  - Warm Earth Brown Ink
          charcoal: "#8b7e6d",  // (139,126,109) - Muted Craft Charcoal
          amber: "#ffb443",     // (255,180,67)  - Warm Amber Highlight
          darkwood: "#120e0b",
          panel: "#1c1713",
        },
      },
    },
  },
  plugins: [],
};

export default config;
