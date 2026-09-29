import { formatCurrency, formatCurrencyInteiro } from "../../utils/calculations";

/** "R$ 1.234,56", sem sinal. */
export const brl = (v: number) => formatCurrency(Math.abs(v));

/** "R$ 1.400", sem centavos. */
export const brl0 = (v: number) => formatCurrencyInteiro(v);

/** Entrada com "+", saída com "−" (sinal de menos, não hífen). */
export const signed = (v: number) => `${v > 0 ? "+" : "−"}${brl(v)}`;

/** Positivo na cor do texto; negativo no secundário. */
export const toneOf = (v: number) => (v > 0 ? "text-lp-fg" : "text-lp-muted");
