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
 * A superfície branca do app. Uma borda, um raio e uma sombra que só existe no
 * claro — não há uma quinta forma de esquecer o `shadow-sm`.
 *
 * No escuro a sombra sai: preto sobre `#0A0A0B` não desenha nada, e o que
 * separa o cartão do fundo passa a ser a borda. Quem flutua (modal, dropdown,
 * toast) é exceção e pede a sombra de volta por `className` — ver os painéis
 * de modal, que passam `shadow-xl dark:shadow-black/60`.
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
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-2xl shadow-sm dark:shadow-none ${PADDING[padding]} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
);

Card.displayName = "Card";
