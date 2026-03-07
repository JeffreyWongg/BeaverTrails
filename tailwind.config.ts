import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canada: {
          red: "#C8102E",
          "red-light": "#E8294E",
          "red-dark": "#A00C24",
          "red-muted": "rgba(200,16,46,0.15)",
          "red-glow": "rgba(200,16,46,0.25)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
