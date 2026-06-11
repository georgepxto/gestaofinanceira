/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      zIndex: {
        dropdown: '10',
        sticky: '20',
        overlay: '40',
        modal: '50',
        'modal-top': '60',
        toast: '70',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['Switzer', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
