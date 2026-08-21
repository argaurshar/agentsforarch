/** @type {import('tailwindcss').Config} */

// Every brand colour is mapped through `rgb(var(--x-rgb) / <alpha-value>)`.
// This matters: mapping a colour to a bare `var(--x)` hex string makes Tailwind's
// colour parser bail, and EVERY alpha modifier on it (`bg-ink/70`, `bg-ochre/10`,
// `border-ochre/30`) is then silently dropped from the build — scrims stop
// dimming and tinted panels render with no background at all.
const token = (name) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

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
        // Reserved for the PRIMARY button only — an accent glow everywhere reads as noise.
        btn: '0 1px 2px rgb(23 20 14 / 0.08), 0 4px 12px -4px rgb(224 86 31 / 0.35)',
      },
      // Design tokens are defined as CSS variables in index.css (spec §10).
      colors: {
        ink: token('ink'),
        'ink-raised': token('ink-raised'),
        ochre: token('ochre'),
        'ochre-deep': token('ochre-deep'),
        bone: token('bone'),
        drafting: token('drafting'),
        paper: token('paper'),
        graphite: token('graphite'),
        mist: token('mist'),
        'mist-faint': token('mist-faint'),
        hairline: token('hairline'),
        // Semantic ramp — the accent means "primary action", never "error".
        danger: token('danger'),
        'danger-soft': token('danger-soft'),
        warning: token('warning'),
        'warning-soft': token('warning-soft'),
        success: token('success'),
        'success-soft': token('success-soft'),
      },
      // One type scale. Nothing smaller than 0.75rem, and only these steps.
      fontSize: {
        'display-xl': ['2.375rem', { lineHeight: '1.05', fontWeight: '600', letterSpacing: '-0.024em' }],
        'display-lg': ['2rem', { lineHeight: '1.08', fontWeight: '600', letterSpacing: '-0.022em' }],
        title: ['1.0625rem', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.012em' }],
        heading: ['0.9375rem', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.01em' }],
        body: ['0.875rem', { lineHeight: '1.55' }],
        label: ['0.8125rem', { lineHeight: '1.2', fontWeight: '500' }],
        caption: ['0.75rem', { lineHeight: '1.45' }],
      },
      borderRadius: {
        control: '0.5rem', // icon buttons, thumbnails, small badges
        field: '0.75rem', // inputs, selects, sub-panels, notices, list rows
        card: '1rem', // cards, drawers, modals, previews, empty states
      },
      fontFamily: {
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant"', '"Cormorant Garamond"', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // Subtle tint steps used by soft accent/semantic panels.
      opacity: {
        8: '0.08',
        12: '0.12',
      },
      // One motion source: every `transition-*` utility carries the house curve.
      transitionDuration: {
        DEFAULT: '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
