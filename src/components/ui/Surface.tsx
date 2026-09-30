import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article";
  /** "nenhum" quando o filho cuida do espaçamento (lista que vai de borda a borda). */
  padding?: "padrao" | "nenhum";
  children: ReactNode;
}

/**
 * O card do app: --surface-1 sobre --bg, raio de 4px, e nada mais. Sem borda,
 * sem sombra — a separação é a diferença de tom. Nunca um dentro do outro.
 */
export const Surface = forwardRef<HTMLElement, SurfaceProps>(function Surface(
  { as: Tag = "div", padding = "padrao", className = "", children, ...rest },
  ref,
) {
  return (
    <Tag
      // @ts-expect-error — o ref serve às três tags; o TS não estreita a união.
      ref={ref}
      className={`bg-surface-1 rounded min-w-0 ${padding === "padrao" ? "p-4 md:p-5" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
});

interface SurfaceHeaderProps {
  titulo: ReactNode;
  /** Legenda à direita do título ("Últimos 6 meses") ou um link ("Ver todos"). */
  acao?: ReactNode;
  descricao?: ReactNode;
  className?: string;
  /** Nível do título: seções da página são h2. */
  as?: "h2" | "h3";
}

/** Título de seção (16px, 500) com uma ação discreta à direita. */
export function SurfaceHeader({ titulo, acao, descricao, className = "", as: H = "h2" }: SurfaceHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div className="min-w-0">
        <H className="text-base font-medium text-fg">{titulo}</H>
        {descricao && <p className="text-xs text-fg-3 mt-0.5">{descricao}</p>}
      </div>
      {acao && <div className="shrink-0 text-sm text-fg-2">{acao}</div>}
    </div>
  );
}
