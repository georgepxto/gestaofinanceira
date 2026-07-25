import type { ReactNode } from "react";

/**
 * Palavra em destaque no título — sublinhado orgânico esmeralda,
 * a mesma "pista" desenhada do hero da landing e do login.
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

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
}

/**
 * Cabeçalho padrão das abas: eyebrow mono esmeralda, título display
 * e descrição discreta — identidade visual única em todas as páginas.
 */
export const PageHeader = ({ eyebrow, title, description }: PageHeaderProps) => (
  <div>
    {eyebrow && (
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-1">
        {eyebrow}
      </p>
    )}
    <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
      {title}
    </h1>
    {description && (
      <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">{description}</p>
    )}
  </div>
);
