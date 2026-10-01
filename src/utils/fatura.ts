import { format } from "date-fns";
import { getMesFaturaCartao } from "./calculations";
import type { CartaoCredito, Gasto, MeuGasto, TransacaoCartao } from "../types";

// A fatura de um cartão num mês — a mesma conta em Cartões e no Início, para
// os dois nunca mostrarem números diferentes. A fatura é o que o banco cobra:
// valor cheio de cada compra, dividida ou emprestada; o que as pessoas te
// devolvem entra pelo A receber.

export interface DadosFatura {
  meusGastos: MeuGasto[];
  transacoes: TransacaoCartao[];
  /** Empréstimos (tabela `gastos`) feitos no cartão. */
  emprestimos: Gasto[];
  pagamentos: { cartao_id: string; mes: string; valor_pago: number }[];
}

/** Mês ("yyyy-MM") da fatura em que uma compra feita em `dataIso` cai. */
export const mesDaFatura = (dataIso: string, cartao: CartaoCredito) =>
  format(getMesFaturaCartao(dataIso, cartao.melhor_dia_compra || cartao.dia_vencimento, cartao.dia_vencimento), "yyyy-MM");

/** O que entra na fatura do mês ("yyyy-MM"). */
export function itensDaFatura(cartao: CartaoCredito, mes: string, d: DadosFatura) {
  const transacoes = d.transacoes.filter((t) => t.cartao_id === cartao.id && mesDaFatura(t.data, cartao) === mes);
  const gastos = d.meusGastos.filter((g) => {
    if (g.cartao_id !== cartao.id) return false;
    // Fixo ativo entra todo mês a partir da fatura em que começou.
    if (g.categoria === "fixo" && g.ativo) {
      return mes >= mesDaFatura(g.data, cartao) && !g.meses_suspensos?.includes(mes);
    }
    return mesDaFatura(g.data, cartao) === mes;
  });
  const emprestimos = d.emprestimos.filter((g) => g.cartao_id === cartao.id && mesDaFatura(g.data_inicio, cartao) === mes);
  return { transacoes, gastos, emprestimos };
}

/** Quanto do mês já foi pago ao banco. */
export const pagoDaFatura = (cartao: CartaoCredito, mes: string, d: DadosFatura) =>
  d.pagamentos.find((p) => p.cartao_id === cartao.id && p.mes === mes)?.valor_pago || 0;

/** O que ainda falta pagar da fatura do mês. */
export function valorDaFatura(cartao: CartaoCredito, mes: string, d: DadosFatura) {
  const { transacoes, gastos, emprestimos } = itensDaFatura(cartao, mes, d);
  const bruto =
    transacoes.filter((t) => !t.pago).reduce((s, t) => s + t.valor, 0) +
    gastos.filter((g) => !g.pago).reduce((s, g) => s + g.valor, 0) +
    emprestimos.reduce((s, g) => s + g.valor_total / g.num_parcelas, 0);
  return Math.max(0, bruto - pagoDaFatura(cartao, mes, d));
}
