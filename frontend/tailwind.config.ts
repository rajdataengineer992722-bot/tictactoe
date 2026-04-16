import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        mist: "#f6f8fb",
        grid: "#d7dee8",
        coral: "#e95d4f",
        teal: "#0f9f9a",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(17, 24, 39, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
