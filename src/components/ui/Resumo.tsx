import type { ReactNode } from "react";
import { Card } from "./Card";
import { Rotulo } from "./Rotulo";

interface ResumoProps {
  children: ReactNode;
  className?: string;
  "data-tour"?: string;
}

/**
 * A faixa de KPIs no topo da tela — cinco telas desenhavam esta mesma grade à
 * mão, com a string do container igual caractere por caractere.
 *
 * A grade é `auto-fit`, não colunas fixas: o número de métricas muda por tela
 * (três em Contas, quatro em Devedores) e a faixa se reorganiza sozinha em vez
 * de deixar coluna vazia. É por isso que ela não tem divisória vertical — com
 * quebra de linha, o `divide-x` risca no lugar errado.
 */
export const Resumo = ({ children, className = "", "data-tour": dataTour }: ResumoProps) => (
  <Card
    padding="resumo"
    data-tour={dataTour}
    className={`grid gap-x-7 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] ${className}`}
  >
    {children}
  </Card>
);

interface ResumoItemProps {
  rotulo: ReactNode;
  /** O valor já formatado — normalmente um `<Valor>`. */
  children: ReactNode;
  /** A linha fina de contexto sob o valor ("3 entradas", "pagamentos do período"). */
  apoio?: ReactNode;
  tomRotulo?: "neutro" | "acento";
  "data-tour"?: string;
}

/**
 * Uma célula da faixa: rótulo, valor, e a linha de apoio que explica o valor.
 *
 * Não formata moeda — recebe a string pronta de `formatCurrency`. Se ele
 * formatasse, seria o segundo lugar do app a decidir como dinheiro aparece, e
 * é exatamente isso que a guarda impede.
 */
export const ResumoItem = ({
  rotulo,
  children,
  apoio,
  tomRotulo = "neutro",
  "data-tour": dataTour,
}: ResumoItemProps) => (
  <div className="min-w-0" data-tour={dataTour}>
    <Rotulo tom={tomRotulo}>{rotulo}</Rotulo>
    {children}
    {apoio && (
      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{apoio}</p>
    )}
  </div>
);
