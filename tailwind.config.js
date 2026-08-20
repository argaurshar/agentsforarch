/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Modernization pass (supersedes spec §4's no-radius/no-shadow rules at the
    // studio's request): default Tailwind radius/shadow scales are restored,
    // with soft warm-tinted elevation for cards.
    extend: {
      boxShadow: {
        card: '0 1px 2px rgb(23 20 14 / 0.04), 0 6px 20px -6px rgb(23 20 14 / 0.08)',
        'card-lg': '0 2px 4px rgb(23 20 14 / 0.05), 0 16px 40px -12px rgb(23 20 14 / 0.14)',
        btn: '0 1px 2px rgb(23 20 14 / 0.08), 0 4px 12px -4px rgb(224 86 31 / 0.35)',
      },
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
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant"', '"Cormorant Garamond"', 'Georgia', 'Cambria', 'serif'],
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
