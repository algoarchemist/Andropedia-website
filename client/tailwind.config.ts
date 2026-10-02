// DSN-06: theme overrides (not theme.extend) remove the banned defaults.
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    borderRadius: { none: '0', sm: '2px', DEFAULT: '2px', md: '4px' },
    boxShadow: { none: 'none' },
    fontFamily: {
      display: ['"Archivo Black"', '"Arial Black"', 'Impact', 'sans-serif'],
      body: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
    },
    // Only the DSN-03 tokens (defined in src/styles/tokens.css) plus transparent and currentColor.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      paper: 'var(--paper)',
      ink: 'var(--ink)',
      muted: 'var(--muted)',
      cobalt: 'var(--cobalt)',
      red: 'var(--red)',
      yellow: 'var(--yellow)',
      orange: 'var(--orange)',
      pink: 'var(--pink)',
      green: 'var(--green)',
      error: 'var(--error)',
    },
  },
  plugins: [],
};

export default config;
