import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dehqon Bozori green
        primary: {
          DEFAULT: '#1D9E75',
          50: '#EEF9F4',
          100: '#D7F0E5',
          200: '#B0E1CC',
          300: '#7FCEAE',
          400: '#48B78D',
          500: '#1D9E75',
          600: '#158063',
          700: '#12654E',
          800: '#0F5040',
          900: '#0C4134',
        },
        // Warm neutral background so the site feels like a bazaar, not a dashboard
        sand: {
          DEFAULT: '#FAF7F1',
          100: '#F5F1E8',
          200: '#E9E3D6',
          300: '#D9D1BF',
        },
        ink: '#1C2A24',
        muted: '#6D7D75',
        harvest: '#D98324',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28, 42, 36, 0.06), 0 6px 20px rgba(28, 42, 36, 0.06)',
        'card-hover': '0 2px 4px rgba(28, 42, 36, 0.08), 0 12px 28px rgba(28, 42, 36, 0.10)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease infinite',
      },
    },
  },
  plugins: [],
};

export default config;
