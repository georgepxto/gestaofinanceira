import { format } from "date-fns";
import type { ContaBancaria, MeuGasto, Receita } from "../types";

// Saldo de uma conta HOJE. É a única conta de saldo do app: Início e Contas
// usam esta função para nunca mostrarem números diferentes para a mesma coisa.
//
// `saldo_atual` já inclui avulsos e pagamentos de fatura. Por cima dele entram
// as receitas fixas/recorrentes cujo dia já chegou e saem os gastos fixos e as
// contas a pagar (tipo "divida", débito) desta conta que já venceram no mês.

interface Movimentos {
  receitas: Receita[];
  gastosFixos: MeuGasto[];
  meusGastos: MeuGasto[];
  hoje?: Date;
}

const diaNoMes = (dia: number, hoje: Date) =>
  Math.min(dia, new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate());

/** O gasto fixo conta neste mês (ativo e não suspenso)? */
export const fixoValeNoMes = (g: MeuGasto, mes: string) =>
  g.ativo !== false && !g.meses_suspensos?.includes(mes);

export function saldoDaConta(conta: ContaBancaria, { receitas, gastosFixos, meusGastos, hoje = new Date() }: Movimentos) {
  const mes = format(hoje, "yyyy-MM");
  const hojeStr = format(hoje, "yyyy-MM-dd");
  const diaHoje = hoje.getDate();

  const recebidas = receitas.filter(
    (r) =>
      r.conta_id === conta.id &&
      (r.tipo === "fixo" || r.tipo === "recorrente") &&
      diaNoMes(r.dia_recebimento, hoje) <= diaHoje
  );
  const fixosPagos = gastosFixos.filter(
    (g) => g.conta_id === conta.id && fixoValeNoMes(g, mes) && diaNoMes(g.dia_vencimento || 1, hoje) <= diaHoje
  );
  const dividasPagas = meusGastos.filter(
    (g) =>
      g.categoria === "divida" &&
      g.tipo === "debito" &&
      g.conta_id === conta.id &&
      g.data.startsWith(mes) &&
      g.data <= hojeStr
  );

  const base = conta.saldo_atual ?? conta.saldo_inicial;
  const soma = <T extends { valor: number }>(xs: T[]) => xs.reduce((acc, x) => acc + x.valor, 0);
  return base + soma(recebidas) - soma(fixosPagos) - soma(dividasPagas);
}

/**
 * Gastos fixos do mês que ainda vão sair: os que não têm conta vinculada
 * (nunca descontados do saldo) e os vinculados cujo dia ainda não chegou.
 */
export function fixosAindaPorSair(gastosFixos: MeuGasto[], hoje = new Date()) {
  const mes = format(hoje, "yyyy-MM");
  return gastosFixos
    .filter((g) => fixoValeNoMes(g, mes))
    .filter((g) => !g.conta_id || diaNoMes(g.dia_vencimento || 1, hoje) > hoje.getDate())
    .reduce((acc, g) => acc + g.valor, 0);
}
