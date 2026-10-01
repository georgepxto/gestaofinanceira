import { format } from "date-fns";
import { getMesFaturaCartao } from "./calculations";
import type { CartaoCredito, MeuGasto } from "../types";

// Regras de "quanto eu gastei no mês", as mesmas em Lançamentos, Início e
// Metas. Antes o Início somava o valor cheio do dividido, contava o fixo pela
// data de criação e a compra no crédito pela data da compra, e mostrava um
// "Meus gastos" que não batia com Lançamentos.

/** No dividido — o comum e o fixo dividido —, o que conta é a minha parte. */
export const valorDaMinhaParte = (g: MeuGasto) =>
  (g.categoria === "dividido" || g.categoria === "fixo") && g.minha_parte ? g.minha_parte : g.valor;

/**
 * Mês ("yyyy-MM") em que o gasto pesa: no crédito, o da fatura — pela mesma
 * regra de Cartões (getMesFaturaCartao), que também olha o dia de vencimento.
 * Antes daqui saía uma versão simplificada, e a mesma compra podia cair num mês
 * em Lançamentos e em outro na fatura.
 */
export function mesDoGasto(g: MeuGasto, cartoes: CartaoCredito[]): string {
  if (g.tipo === "credito" && g.cartao_id) {
    const cartao = cartoes.find((c) => c.id === g.cartao_id);
    if (cartao) {
      const melhorDia = cartao.melhor_dia_compra || cartao.dia_vencimento;
      return format(getMesFaturaCartao(g.data, melhorDia, cartao.dia_vencimento), "yyyy-MM");
    }
  }
  return g.data.substring(0, 7);
}

/** Gastos do mês, sem os fixos (que têm a própria soma). */
export function gastosPessoaisDoMes(gastos: MeuGasto[], cartoes: CartaoCredito[], mes: Date): MeuGasto[] {
  const chave = format(mes, "yyyy-MM");
  return gastos.filter((g) => g.categoria !== "fixo" && mesDoGasto(g, cartoes) === chave);
}
