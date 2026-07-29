import { forwardRef } from "react";
import type { ReactNode, HTMLAttributes } from "react";

type Padding = "conteudo" | "resumo" | "compacto" | "nenhum";

const PADDING: Record<Padding, string> = {
  compacto: "p-4",
  conteudo: "p-5",
  resumo: "p-6 md:p-7",
  // Tabela e empty state: quem manda no espaçamento é o filho.
  nenhum: "",
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  as?: "div" | "section";
  children: ReactNode;
}

/**
 * A superfície branca do app. Uma borda, um raio, uma sombra — não há
 * uma quinta forma de esquecer o `shadow-sm`.
 *
 * Vale também para o painel de modal: é a mesma superfície, só que centrada e
 * com largura própria. Enquanto foi string copiada, dois modais ficaram com
 * `border-zinc-100` e o de suspensão perdeu a sombra.
 *
 * Encaminha `ref` porque quem usa o painel de modal precisa dele para o foco
 * (`useFocusTrap`).
 *
 * Cards de cor própria (zonas de perigo) continuam escritos à mão:
 * o fundo e a borda deles comunicam estado, não a superfície padrão.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = "conteudo", as: Tag = "div", className = "", children, ...rest }, ref) => (
    <Tag
      ref={ref}
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm ${PADDING[padding]} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
);

Card.displayName = "Card";
