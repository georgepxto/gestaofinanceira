import { format, isToday, isYesterday, isThisYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrencyValue } from "./calculations";

/** O sinal de menos tipográfico. O hífen é mais curto que o "+" e desalinha a coluna. */
export const MENOS = "−";

/**
 * "R$ 4.507,60" com o sinal na frente: "−R$ 389,90". Com `positivo`, o valor
 * acima de zero ganha "+" — é assim que a entrada se distingue da saída sem cor
 * (não existe verde na interface).
 */
export function formatDinheiro(valor: number, { positivo = false } = {}): string {
  const sinal = valor < 0 ? MENOS : positivo && valor > 0 ? "+" : "";
  return `${sinal}R$\u00A0${formatCurrencyValue(Math.abs(valor))}`;
}

/** Os pedaços do número de destaque: o inteiro grande e os centavos elevados. */
export function partesDinheiro(valor: number, { positivo = false } = {}) {
  const texto = formatCurrencyValue(Math.abs(valor));
  const virgula = texto.lastIndexOf(",");
  return {
    sinal: valor < 0 ? MENOS : positivo && valor > 0 ? "+" : "",
    inteiro: `R$\u00A0${texto.slice(0, virgula)}`,
    centavos: texto.slice(virgula),
  };
}

const compacto = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/**
 * Rótulo de eixo: "R$ 0", "R$ 500", "R$ 1,5k", "R$ 12k". Uma casa só quando
 * precisa — é o que acaba com o "R$2k, R$2k, R$1k" de ticks arredondados demais.
 */
export function formatDinheiroCompacto(valor: number): string {
  const abs = Math.abs(valor);
  const sinal = valor < 0 ? MENOS : "";
  if (abs >= 1_000_000) return `${sinal}R$\u00A0${compacto.format(abs / 1_000_000)}mi`;
  if (abs >= 1_000) return `${sinal}R$\u00A0${compacto.format(abs / 1_000)}k`;
  return `${sinal}R$\u00A0${Math.round(abs)}`;
}

/**
 * Ticks "redondos" de 0 até cobrir `max`: passos de 1, 2, 2,5 ou 5 vezes uma
 * potência de 10. Cada tick é um valor distinto, então nenhum rótulo repete.
 */
export function ticksRedondos(max: number, quantos = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0];
  const bruto = max / quantos;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto;
  const ticks: number[] = [];
  for (let v = 0; v < max + passo * 0.999; v += passo) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

/** Cabeçalho de grupo de lista: "Hoje", "Ontem", "29 de set", "29 de set de 2025". */
export function rotuloDia(data: Date): string {
  if (isToday(data)) return "Hoje";
  if (isYesterday(data)) return "Ontem";
  return format(data, isThisYear(data) ? "d 'de' MMM" : "d 'de' MMM 'de' yyyy", { locale: ptBR });
}

/** Percentual inteiro em pt-BR: "64%". */
export function formatPercent(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}
