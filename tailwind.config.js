/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ember: "#ffb692",
        parchment: "#eae1dd",
        obsidian: "#131313",
        "hearth-ash": "#1f1b19",
        primary: "#ffb692",
        "on-primary": "#1a1c1c",
        background: "#131313",
        "on-background": "#eae1dd",
        "surface-container-low": "#1c1b1b",
        "surface-container-high": "#2a2a2a",
        "outline-variant": "#474747"
      },
      fontFamily: {
        headline: ["Epilogue", "sans-serif"],
        body: ["Epilogue", "sans-serif"],
        label: ["Epilogue", "sans-serif"],
        accent: ["Newsreader", "serif"]
      }
    },
  },
  plugins: [],
}
