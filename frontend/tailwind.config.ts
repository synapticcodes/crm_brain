import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        display: ['var(--font-display)', 'serif'],
      },
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        stroke: 'rgb(var(--stroke) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        teal: 'rgb(var(--teal) / <alpha-value>)',
        moss: 'rgb(var(--moss) / <alpha-value>)',
      },
      boxShadow: {
        soft: '0 6px 18px rgba(15, 23, 42, 0.08)',
        card: '0 10px 24px rgba(15, 23, 42, 0.12)',
      },
    },
  },
} satisfies Config
