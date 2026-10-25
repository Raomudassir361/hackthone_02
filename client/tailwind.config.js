/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        navy: 'var(--navy)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: '#0e826d',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: '#4b40b0',
        },
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        muted: 'var(--muted)',
        border: 'var(--border)',
      },
      borderRadius: {
        card: '12px',
        control: '8px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
