import { forwardRef } from "react";
import type { ReactNode, HTMLAttributes } from "react";

type Padding = "conteudo" | "resumo" | "compacto" | "nenhum";

const PADDING: Record<Padding, string> = {
  compacto: "p-4",
  conteudo: "p-4 md:p-5",
  resumo: "p-4 md:p-5",
  nenhum: "",
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  as?: "div" | "section";
  /** Obsoleto: o card não sangra mais até a borda no celular. */
  sangra?: boolean;
  children: ReactNode;
}

/**
 * Adaptador do nome antigo para a superfície do sistema (ver <Surface>):
 * --surface-1, raio de 4px, sem borda e sem sombra.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = "conteudo", as: Tag = "div", sangra: _sangra, className = "", children, ...rest }, ref) => (
    <Tag ref={ref} className={`bg-surface-1 rounded min-w-0 ${PADDING[padding]} ${className}`} {...rest}>
      {children}
    </Tag>
  )
);

Card.displayName = "Card";
