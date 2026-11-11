/** @type {import('tailwindcss').Config} */
// Màu đọc từ biến CSS trong src/theme.generated.css (sinh bằng scripts/gen-theme.mjs) nên đổi sáng/tối không cần lớp dark:.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (prefix, family) =>
  Object.fromEntries(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].map((s) => [s, v(`${prefix}-${family}-${s}`)]));
const families = ["slate", "gray", "red", "amber", "emerald", "green", "sky", "blue", "rose", "orange", "purple", "indigo", "yellow", "teal", "cyan", "violet", "pink"];
const byContext = (prefix) => Object.fromEntries(families.map((f) => [f, scale(prefix, f)]));
const tokens = ["on-secondary-fixed-variant", "surface-container-low", "secondary-fixed", "tertiary-fixed", "surface-container-highest", "inverse-primary", "inverse-on-surface", "on-primary-fixed-variant", "on-primary", "surface-container-high", "surface-tint", "surface-variant", "secondary-container", "background", "secondary-fixed-dim", "on-primary-fixed", "tertiary-container", "on-tertiary-container", "tertiary", "on-surface-variant", "secondary", "tertiary-fixed-dim", "on-secondary-fixed", "primary-container", "on-tertiary-fixed-variant", "outline", "on-error", "surface", "on-primary-container", "primary-fixed-dim", "on-secondary", "on-surface", "on-secondary-container", "surface-bright", "outline-variant", "on-error-container", "on-background", "surface-dim", "on-tertiary-fixed", "primary-fixed", "on-tertiary", "surface-container", "error-container", "error", "primary", "surface-container-lowest", "inverse-surface", "nav", "nav-fg", "nav-muted", "nav-hover", "nav-active", "nav-active-fg", "nav-accent", "nav-line"];

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(tokens.map((t) => [t, v(t)])),
        ...byContext("bg"),
        // ── Legacy brand tokens (keep for existing pages) ──
        brand: {
          cyan: "#00d2ff",
          blue: "#0072ff",
          deep: "#032030",
        },
      },
      backgroundColor: byContext("bg"),
      borderColor: byContext("bd"),
      divideColor: byContext("bd"),
      ringColor: byContext("bd"),
      textColor: byContext("tx"),
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.375rem",
        xl: "0.625rem",
        "2xl": "0.875rem",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--shadow) / 0.06), 0 1px 1px rgb(var(--shadow) / 0.04)",
        lift: "0 8px 24px -8px rgb(var(--shadow) / 0.22), 0 2px 6px rgb(var(--shadow) / 0.08)",
      },
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "0.75rem",
        "space-lg": "1rem",
        "space-xl": "1.5rem",
        margin: "1.5rem",
        "margin-mobile": "0.75rem",
        "gutter-dense": "0.5rem",
        gutter: "1rem",
      },
      fontFamily: {
        "body-default": ["Be Vietnam Pro", "Inter", "sans-serif"],
        "body-sm": ["Be Vietnam Pro", "Inter", "sans-serif"],
        "body-medium": ["Be Vietnam Pro", "Inter", "sans-serif"],
        "body-sm-medium": ["Be Vietnam Pro", "Inter", "sans-serif"],
        "headline-lg": ["Be Vietnam Pro", "Inter", "sans-serif"],
        "headline-md": ["Be Vietnam Pro", "Inter", "sans-serif"],
        "headline-sm": ["Be Vietnam Pro", "Inter", "sans-serif"],
        title: ["Be Vietnam Pro", "Inter", "sans-serif"],
        "label-sm": ["Be Vietnam Pro", "Inter", "sans-serif"],
        "label-default": ["Be Vietnam Pro", "Inter", "sans-serif"],
        display: ["Be Vietnam Pro", "Inter", "sans-serif"],
        "code-mono": ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        title: ["14px", { lineHeight: "20px", letterSpacing: "0", fontWeight: "600" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.015em", fontWeight: "600" }],
        "headline-md": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-sm": ["16px", { lineHeight: "24px", letterSpacing: "-0.005em", fontWeight: "600" }],
        display: ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "body-default": ["14px", { lineHeight: "20px", letterSpacing: "0", fontWeight: "400" }],
        "body-medium": ["14px", { lineHeight: "20px", letterSpacing: "0", fontWeight: "500" }],
        "body-sm": ["13px", { lineHeight: "18px", letterSpacing: "0", fontWeight: "400" }],
        "body-sm-medium": ["13px", { lineHeight: "18px", letterSpacing: "0", fontWeight: "500" }],
        "label-default": ["12px", { lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "500" }],
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.03em", fontWeight: "600" }],
        "code-mono": ["12px", { lineHeight: "16px", letterSpacing: "0", fontWeight: "500" }],
      },
      keyframes: {
        fadeIn: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideUp: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pulseDot: { "0%": { boxShadow: "0 0 0 0 rgb(var(--live) / 0.55)" }, "70%": { boxShadow: "0 0 0 7px rgb(var(--live) / 0)" }, "100%": { boxShadow: "0 0 0 0 rgb(var(--live) / 0)" } },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out",
        slideUp: "slideUp 0.25s ease-out",
        pulseDot: "pulseDot 2s ease-out infinite",
      },
    },
  },
  plugins: [],
};
