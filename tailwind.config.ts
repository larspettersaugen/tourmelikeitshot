import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        stage: {
          page: 'rgb(var(--stage-page) / <alpha-value>)',
          surface: 'rgb(var(--stage-surface) / <alpha-value>)',
          card: 'rgb(var(--stage-card) / <alpha-value>)',
          border: 'rgb(var(--stage-border) / <alpha-value>)',
          muted: 'rgb(var(--stage-muted) / <alpha-value>)',
          accent: 'rgb(var(--stage-accent) / <alpha-value>)',
          accentHover: 'rgb(var(--stage-accent-hover) / <alpha-value>)',
          fg: 'rgb(var(--stage-fg) / <alpha-value>)',
          /** Text on amber accent buttons (high contrast in both themes) */
          accentFg: 'rgb(var(--stage-accent-fg) / <alpha-value>)',
          /** Tour date “day sheet” accents */
          neonCyan: 'rgb(var(--stage-neon-cyan) / <alpha-value>)',
          violet: 'rgb(var(--stage-violet) / <alpha-value>)',
          neonGreen: 'rgb(var(--stage-neon-green) / <alpha-value>)',
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 32px -8px rgb(var(--stage-neon-cyan) / 0.45)',
        'glow-cyan-sm': '0 0 18px -4px rgb(var(--stage-neon-cyan) / 0.28)',
        'card-inset': 'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },
    },
  },
  plugins: [],
};
export default config;
