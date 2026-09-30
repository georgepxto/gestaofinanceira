/** @type {import('tailwindcss').Config} */

/* Cor a partir de uma variável CSS de src/index.css.
   As variáveis guardam hex (é o que o sistema documenta e o que o DevTools
   mostra), então a opacidade do Tailwind (`bg-accent/12`) sai por color-mix em
   vez do `rgb(var() / a)` que exigiria guardar canais soltos. */
const token = (nome) => ({ opacityValue }) =>
  opacityValue === undefined || opacityValue === "1"
    ? `var(${nome})`
    : `color-mix(in srgb, var(${nome}) calc(${opacityValue} * 100%), transparent)`;

export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    // Substitui a escala inteira, não estende: raio acima de 4px não existe.
    // Os degraus antigos (md/lg/xl/2xl/3xl) apontam para 4px durante a
    // migração, para que tela ainda não refeita já perca a curva; o guarda
    // (scripts/check-design-system.sh) barra o uso deles em arquivo migrado.
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '4px',
      md: '4px',
      lg: '4px',
      xl: '4px',
      '2xl': '4px',
      '3xl': '4px',
      // Só para o ponto de 8px de categoria e cartão. Pílula não usa.
      full: '9999px',
    },
    extend: {
      colors: {
        page: token('--bg'),
        surface: {
          1: token('--surface-1'),
          2: token('--surface-2'),
          3: token('--surface-3'),
        },
        line: token('--line'),
        scrim: 'var(--scrim)',
        fg: {
          DEFAULT: token('--fg'),
          2: token('--fg-2'),
          3: token('--fg-3'),
        },
        accent: {
          DEFAULT: token('--accent'),
          fg: token('--accent-fg'),
          ink: token('--accent-ink'),
        },
        danger: {
          DEFAULT: token('--danger'),
          ink: token('--danger-ink'),
        },
        cat: {
          1: token('--cat-1'),
          2: token('--cat-2'),
          3: token('--cat-3'),
          4: token('--cat-4'),
          5: token('--cat-5'),
          6: token('--cat-6'),
          7: token('--cat-7'),
          8: token('--cat-8'),
        },
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
      // Nada acima de 500. Os pesos nomeados mais altos caem em 500 para que o
      // legado não pinte negrito enquanto não é migrado.
      fontWeight: {
        title: '450',
        semibold: '500',
        bold: '500',
        extrabold: '500',
        black: '500',
      },
      fontFamily: {
        sans: ['Switzer', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
