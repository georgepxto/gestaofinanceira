import type { ReactNode, HTMLAttributes } from "react";

type Tom = "neutro" | "acento" | "alerta" | "perigo";

const TOM: Record<Tom, string> = {
  neutro: "text-zinc-400 dark:text-zinc-500",
  acento: "text-emerald-600 dark:text-emerald-400",
  alerta: "text-amber-700 dark:text-amber-400",
  perigo: "text-red-600 dark:text-red-400",
};

interface RotuloProps extends HTMLAttributes<HTMLElement> {
  tom?: Tom;
  /** `span` para rótulos que vivem em linha — o corpo do rótulo é o mesmo. */
  as?: "p" | "span";
  children: ReactNode;
}

/**
 * Rótulo mono maiúsculo de card, coluna e métrica — o elemento mais
 * repetido do app. O eyebrow de página é maior e vive no `PageHeader`.
 */
export const Rotulo = ({
  children,
  tom = "neutro",
  as: Tag = "p",
  className = "",
  ...rest
}: RotuloProps) => (
  <Tag
    className={`font-mono text-[10px] font-medium uppercase tracking-[0.16em] ${TOM[tom]} ${className}`}
    {...rest}
  >
    {children}
  </Tag>
);
