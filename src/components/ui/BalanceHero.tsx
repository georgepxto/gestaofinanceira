import type { ReactNode } from "react";
import { AnimatedNumber } from "./AnimatedNumber";

interface BalanceHeroProps {
  /** Rótulo pequeno acima do número ("Saldo livre"). */
  rotulo: ReactNode;
  valor: number;
  /** Linha de contexto abaixo ("o que sobra depois dos fixos do mês"). */
  contexto?: ReactNode;
  /** Complemento ao lado do número, menor ("de R$ 250,00" em Metas). */
  complemento?: ReactNode;
  /** Abaixo de zero, o número vai para --danger. Desligue onde negativo não é alarme. */
  perigoSeNegativo?: boolean;
  /** Força o número em --danger (orçamento estourado, por exemplo). */
  perigo?: boolean;
  /** Algo à direita do rótulo (o mês, uma pílula). */
  aoLado?: ReactNode;
  children?: ReactNode;
  className?: string;
  "data-tour"?: string;
}

/**
 * O número que a tela existe para mostrar. Grande, em Geist Mono de peso 400,
 * centavos elevados, e a contagem do valor antigo para o novo quando ele muda.
 *
 * Não é um card: senta direto no fundo da página, como o saldo do N26. Quem
 * precisa de mais (barra de limite, fileira de ações) passa como `children`.
 */
export function BalanceHero({
  rotulo,
  valor,
  contexto,
  complemento,
  perigoSeNegativo = true,
  perigo = false,
  aoLado,
  children,
  className = "",
  "data-tour": dataTour,
}: BalanceHeroProps) {
  const negativo = perigo || (perigoSeNegativo && valor < 0);
  return (
    <section className={`min-w-0 ${className}`} data-tour={dataTour}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg-2">{rotulo}</p>
        {aoLado}
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <AnimatedNumber
          valor={valor}
          centavosElevados
          className={`text-[40px] md:text-[56px] leading-none tracking-[-0.02em] font-normal ${
            negativo ? "text-danger-ink" : "text-fg"
          }`}
        />
        {complemento && <span className="valor text-base md:text-lg text-fg-2">{complemento}</span>}
      </p>
      {contexto && <p className="mt-3 text-sm text-fg-2">{contexto}</p>}
      {children}
    </section>
  );
}
