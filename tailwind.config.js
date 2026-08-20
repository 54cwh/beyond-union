/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/*.html",
    "./template.html",
    "./assets/js/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "on-primary": "var(--color-on-primary)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        "accent-dark": "var(--color-accent-dark)",
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        destructive: "var(--color-destructive)",
        ring: "var(--color-ring)",
      },
      fontFamily: {
        heading: ["Inter", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "sans-serif"],
        body: ["Inter", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "sans-serif"],
      },
    },
  },
  plugins: [],
}
