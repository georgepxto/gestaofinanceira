import type { ReactNode, HTMLAttributes } from "react";

type Porte = "heroi" | "destaque" | "linha";

const PORTE: Record<Porte, string> = {
  heroi: "font-num font-bold tracking-[-0.015em] text-[44px] leading-none",
  destaque: "font-num font-bold tracking-[-0.015em] text-[30px] leading-tight",
  linha: "font-mono text-sm",
};

interface ValorProps extends HTMLAttributes<HTMLSpanElement> {
  porte?: Porte;
  children: ReactNode;
}

/**
 * Dinheiro na tela. `.valor` garante tabular-nums e que nunca quebre
 * linha — a cor fica com quem chama, porque cor aqui é estado, não porte.
 *
 * **Por que `font-num` e não `font-display`.** Herói e destaque já foram Syne,
 * e o número saía apertado: a Syne tem contraforma alta e estreita, que em
 * numeral tabular — onde todo dígito ocupa a mesma caixa fixa — comprime o
 * traço. A Geist tem numeral mais largo, então segura o corpo de 44px sem o
 * `font-extrabold` que a Syne precisava. A Syne continua nos títulos, onde o
 * problema não existe; trocar lá jogaria fora a identidade da marca.
 *
 * **Por que −0.015em e não o aperto antigo de −0.05em.** O aperto era metade
 * do problema e vale para qualquer família: letter-spacing negativo em numeral
 * tabular encosta dígito em dígito. −0.015em é o valor testado no mock; voltar
 * ao aperto antigo traz o defeito de volta, mesmo com a Geist.
 *
 * Reverter a família é uma linha — `num: ['Syne', …]` no tailwind.config.js.
 * Reverter o tracking não: ele é a correção que sobrevive à escolha de fonte.
 */
export const Valor = ({ porte = "linha", className = "", children, ...rest }: ValorProps) => (
  <span className={`valor ${PORTE[porte]} ${className}`} {...rest}>
    {children}
  </span>
);
