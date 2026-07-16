/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Hard rules (spec §4): no rounded corners, no shadows. Override the
    // Tailwind scales entirely so `rounded-*` / `shadow-*` can never sneak in.
    borderRadius: {
      none: '0',
      sm: '0',
      DEFAULT: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '0',
    },
    boxShadow: {
      none: 'none',
      sm: 'none',
      DEFAULT: 'none',
      md: 'none',
      lg: 'none',
      xl: 'none',
      '2xl': 'none',
      inner: 'none',
    },
    extend: {
      // Design tokens are defined as CSS variables in index.css (spec §10).
      colors: {
        ink: 'var(--ink)',
        ochre: 'var(--ochre)',
        'ochre-deep': 'var(--ochre-deep)',
        bone: 'var(--bone)',
        drafting: 'var(--drafting)',
        paper: 'var(--paper)',
        graphite: 'var(--graphite)',
        mist: 'var(--mist)',
        hairline: 'var(--hairline)',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        label: '0.14em',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};
