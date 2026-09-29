/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Os dois neutros da marca que não existem na escala zinc.
        'app-dark': '#0A0A0B', // fundo de tela no dark
        'app-row':  '#FCFCFC', // painel/linha quase-branco no light
        // Landing: aponta para as variáveis com escopo em .lp (landing.css).
        // Fora da landing essas variáveis não existem, então nada no app muda.
        lp: {
          bg: 'var(--lp-bg)',
          fg: 'var(--lp-fg)',
          muted: 'var(--lp-muted)',
          line: 'var(--lp-line)',
          surface: 'var(--lp-surface)',
          track: 'var(--lp-track)',
          acc: 'var(--lp-acc)',
          hi: 'var(--lp-hi)',
          ink: 'var(--lp-ink)',
        },
      },
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
        // Números grandes. Não é a `display` porque a Syne aperta numeral tabular,
        // e não é a `mono` porque em 44px a largura fixa da mono fica mecânica.
        num: ['Geist', 'sans-serif'],
        sans: ['Switzer', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
