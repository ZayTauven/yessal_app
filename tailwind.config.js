/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: "#1A5C3A", light: "#2D7A4F", dim: "#1A5C3A1A" },
        gold: { DEFAULT: "#B8860B" },
        surface: { DEFAULT: "#FFFFFF", muted: "#F4F2EE", dark: "#0E1810" },
        ink: { DEFAULT: "#1C1C1A", muted: "#6B6B65", faint: "#A8A8A2" },
        border: { DEFAULT: "rgba(28,28,26,0.12)" },
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        medium: ["Inter_500Medium"],
        light: ["Inter_300Light"],
      },
    },
  },
  plugins: [],
};
