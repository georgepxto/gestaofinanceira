import type { ParcelaAtiva, ResumoMensal, SaldoDevedor } from "../types";

// O que uma pessoa te deve, juntando as duas fontes que A receber tem:
// o que falta do mês (empréstimos e divisões do mês, menos o que ela já
// pagou) e as cobranças em aberto (dívidas que ficaram, inclusive o resto de
// meses fechados). Somar as duas é certo aqui: o mês fechado sai do mês e
// entra como cobrança, então nada conta duas vezes.

export interface PendenciaDoMes {
  total: number;
  pago: number;
  falta: number;
  fechado: boolean;
  itens: ParcelaAtiva[];
}

export interface Pendencias {
  mes: PendenciaDoMes;
  /** Cobranças em aberto, da mais antiga para a mais nova. */
  cobrancas: SaldoDevedor[];
  emCobrancas: number;
  total: number;
}

export interface FontesReceber {
  resumoDoMes: ResumoMensal[];
  parcelasDoMes: ParcelaAtiva[];
  saldosDevedores: SaldoDevedor[];
  getTotalPagoParcial: (pessoa: string) => number;
  isMesFechado: (pessoa: string) => boolean;
}

const centavos = (v: number) => Math.round(v * 100) / 100;

export function pendenciasDaPessoa(pessoa: string, f: FontesReceber): Pendencias {
  const total = f.resumoDoMes.find((r) => r.pessoa === pessoa)?.total || 0;
  const pago = f.getTotalPagoParcial(pessoa);
  const fechado = f.isMesFechado(pessoa);
  // Mês fechado: o que faltava virou cobrança.
  const falta = fechado ? 0 : centavos(Math.max(0, total - pago));
  const cobrancas = f.saldosDevedores
    .filter((d) => d.pessoa === pessoa && d.valor_atual > 0.009)
    .sort((a, b) => (a.data_criacao || "").localeCompare(b.data_criacao || ""));
  const emCobrancas = centavos(cobrancas.reduce((s, d) => s + d.valor_atual, 0));
  return {
    mes: { total, pago, falta, fechado, itens: f.parcelasDoMes.filter((p) => p.gasto.pessoa === pessoa) },
    cobrancas,
    emCobrancas,
    total: centavos(falta + emCobrancas),
  };
}

/** Para onde vai um pagamento: o mês ou uma cobrança. */
export interface Alvo {
  chave: "mes" | string;
  rotulo: string;
  falta: number;
}

/** Reparte um valor pelos alvos na ordem: o mês primeiro, depois as cobranças mais antigas. */
export function distribuir(valor: number, alvos: Alvo[]) {
  let resta = centavos(valor);
  const partes: { alvo: Alvo; valor: number }[] = [];
  for (const alvo of alvos) {
    if (resta <= 0) break;
    const v = centavos(Math.min(resta, alvo.falta));
    if (v > 0) partes.push({ alvo, valor: v });
    resta = centavos(resta - v);
  }
  return partes;
}
