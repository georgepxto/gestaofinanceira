import type { ReactNode, HTMLAttributes } from "react";

type Porte = "heroi" | "destaque" | "medio" | "linha";

const PORTE: Record<Porte, string> = {
  // O saldo herói da escala: 40px no celular, 56px no desktop.
  heroi: "tracking-[-0.02em] text-[40px] md:text-[56px] leading-none",
  destaque: "tracking-[-0.02em] text-[24px] md:text-[28px] leading-tight",
  // Valor de indicador (KpiStrip) e de bloco: um degrau acima do corpo.
  medio: "text-[20px] leading-tight",
  // Valor em lista: acompanha o corpo — 15px no celular, 14px no desktop.
  linha: "text-[15px] md:text-sm",
};

interface ValorProps extends HTMLAttributes<HTMLSpanElement> {
  porte?: Porte;
  children: ReactNode;
}

/**
 * Dinheiro na tela. `.valor` dá a Geist Mono, os dígitos tabulares e a
 * proibição de quebrar linha — dinheiro cortado ao meio é pior que dinheiro
 * apertado. A cor fica com quem chama, porque cor aqui é estado, não porte.
 * Peso sempre 400: a hierarquia é o corpo.
 *
 * Para o número de destaque com centavos elevados e contagem, use
 * <BalanceHero> ou <AnimatedNumber>; este é o valor estático.
 */
export const Valor = ({ porte = "linha", className = "", children, ...rest }: ValorProps) => (
  <span className={`valor font-normal ${PORTE[porte]} ${className}`} {...rest}>
    {children}
  </span>
);
