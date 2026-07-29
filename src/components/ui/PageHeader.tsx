import type { ReactNode, HTMLAttributes } from "react";

/**
 * Palavra em destaque no título — sublinhado orgânico esmeralda,
 * a mesma "pista" desenhada do hero da landing e do login.
 *
 * É marca, não decoração: vale onde aparece uma vez e a pessoa está sendo
 * convencida. Nas telas internas saiu — quem abre o app 4× por dia precisa
 * ler o saldo, não ser convencido. Landing e login desenham o próprio SVG.
 */
export const Pista = ({ children }: { children: ReactNode }) => (
  <span className="relative inline-block" style={{ isolation: "isolate" }}>
    <svg
      aria-hidden="true"
      className="absolute left-0 w-full overflow-visible pointer-events-none"
      style={{ bottom: "-0.1em", height: "0.3em", zIndex: 0 }}
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
    >
      <path
        d="M0,6 C12,4 22,7 35,5 C48,3 58,6 72,4 C82,3 92,5 100,2"
        className="stroke-emerald-500 dark:stroke-emerald-400"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
    <span className="relative z-[1]">{children}</span>
  </span>
);

// `title` no DOM é uma string (tooltip); aqui é o `<h1>` da página.
interface PageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Seletor de mês, botão primário — o que assenta na borda direita do cabeçalho. */
  action?: ReactNode;
}

/**
 * Cabeçalho padrão das páginas: eyebrow mono esmeralda, título display
 * e descrição discreta — identidade visual única em todas as páginas.
 */
export const PageHeader = ({ eyebrow, title, description, action, className = "", ...rest }: PageHeaderProps) => (
  <div className={`flex items-end justify-between flex-wrap gap-5 mb-6 ${className}`} {...rest}>
    <div>
      {eyebrow && (
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-1">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display font-bold text-[34px] leading-[1.05] tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      {description && (
        <p className="text-[15px] text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>
      )}
    </div>
    {action}
  </div>
);
