import type { ReactNode, HTMLAttributes } from "react";

type Tom = "neutro" | "acento" | "alerta" | "perigo";

const TOM: Record<Tom, string> = {
  neutro: "text-fg-2",
  // Sem ênfase por cor: o antigo "acento" esmeralda vira o neutro.
  acento: "text-fg-2",
  alerta: "text-accent-ink",
  perigo: "text-danger-ink",
};

interface RotuloProps extends HTMLAttributes<HTMLElement> {
  tom?: Tom;
  as?: "p" | "span";
  children: ReactNode;
}

/** Rótulo de campo, métrica e coluna: 12px, sentence case, Switzer. */
export const Rotulo = ({ children, tom = "neutro", as: Tag = "p", className = "", ...rest }: RotuloProps) => (
  <Tag className={`text-xs ${TOM[tom]} ${className}`} {...rest}>
    {children}
  </Tag>
);
