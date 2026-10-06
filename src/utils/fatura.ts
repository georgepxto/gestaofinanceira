import { addMonths, format, parseISO, subMonths } from "date-fns";
import { getMesFaturaCartao } from "./calculations";
import { PARCELAS_MAX } from "./constants";
import type { AberturaCartao, CartaoCredito, Gasto, MeuGasto, TransacaoCartao } from "../types";

// A fatura e o limite de um cartão — a mesma conta em Cartões e no Início, para
// os dois nunca mostrarem números diferentes. A fatura é o que o banco cobra:
// valor cheio de cada compra, dividida ou emprestada; o que as pessoas te
// devolvem entra pelo A receber.
//
// A abertura é o retrato do cartão no dia em que a pessoa o conferiu com o
// banco: quanto faltava pagar da próxima fatura e quanto do limite estava
// usado. Tudo o que foi comprado até esse dia já está dentro desse retrato —
// lançar depois uma compra antiga (ou um fixo que já tinha sido cobrado) só
// explica o retrato, não soma de novo. O que o retrato tem e ninguém lançou
// fica como "sem detalhe". Se a pessoa informou também as faturas seguintes,
// mês a mês, o "sem detalhe" de cada uma cai na fatura certa; o que sobrar do
// limite usado fica sem mês.

export interface DadosFatura {
  meusGastos: MeuGasto[];
  transacoes: TransacaoCartao[];
  /** Empréstimos (tabela `gastos`) feitos no cartão. */
  emprestimos: Gasto[];
  pagamentos: { cartao_id: string; mes: string; valor_pago: number; created_at?: string }[];
}

const hojeIso = () => format(new Date(), "yyyy-MM-dd");
const mesesEntre = (de: string, ate: string) => {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
};
const somarMeses = (mes: string, n: number) => format(addMonths(parseISO(`${mes}-01`), n), "yyyy-MM");
const centavos = (v: number) => Math.round(v * 100) / 100;
/** Até onde olhar para frente: a parcela mais longa. */
const HORIZONTE = PARCELAS_MAX;

/** Mês ("yyyy-MM") da fatura em que uma compra feita em `dataIso` cai. */
export const mesDaFatura = (dataIso: string, cartao: CartaoCredito) =>
  format(getMesFaturaCartao(dataIso, cartao.melhor_dia_compra || cartao.dia_vencimento, cartao.dia_vencimento), "yyyy-MM");

/** Dia do vencimento da fatura do mês ("yyyy-MM-dd"). */
export function vencimentoDaFatura(mes: string, cartao: CartaoCredito) {
  const [ano, m] = mes.split("-").map(Number);
  const ultimo = new Date(ano, m, 0).getDate();
  return `${mes}-${String(Math.min(cartao.dia_vencimento || 1, ultimo)).padStart(2, "0")}`;
}

/** A próxima fatura a pagar num dia: a primeira que ainda não venceu. */
export function proximaFatura(cartao: CartaoCredito, diaIso = hojeIso()) {
  const mes = diaIso.substring(0, 7);
  return diaIso <= vencimentoDaFatura(mes, cartao) ? mes : somarMeses(mes, 1);
}

/** Uma data de compra que cai na fatura do mês — para lançar a parcela de uma compra antiga. */
export function dataNaFatura(cartao: CartaoCredito, mes: string, diaPreferido = 1) {
  for (let voltar = 0; voltar <= 2; voltar++) {
    const base = somarMeses(mes, -voltar);
    const [ano, m] = base.split("-").map(Number);
    const ultimo = new Date(ano, m, 0).getDate();
    for (const dia of [diaPreferido, 1, 15, ultimo]) {
      const data = `${base}-${String(Math.min(Math.max(dia, 1), ultimo)).padStart(2, "0")}`;
      if (mesDaFatura(data, cartao) === mes) return data;
    }
  }
  return `${mes}-01`;
}

/** Dia em que uma cobrança mensal (dia `dia`) entra na fatura do mês. */
const cobrancaMensal = (cartao: CartaoCredito, mes: string, dia: number) => dataNaFatura(cartao, mes, dia);

/**
 * As faturas que um fixo no cartão teria cobrado depois de `de` e antes de
 * `ate`: as que ficam de fora quando ele volta de uma pausa.
 */
export function faturasDoIntervalo(cartao: CartaoCredito, dia: number, de: string, ate: string) {
  const meses: string[] = [];
  for (let mes = mesDaFatura(de, cartao); mes <= mesDaFatura(ate, cartao); mes = somarMeses(mes, 1)) {
    const cobrada = cobrancaMensal(cartao, mes, dia);
    if (cobrada > de && cobrada < ate) meses.push(mes);
  }
  return meses;
}

/** Data da compra de uma parcela: a 3/10 de uma compra de julho tem data de setembro. */
const dataDaCompra = (data: string, parcelaAtual?: number, numParcelas?: number) =>
  (numParcelas || 1) > 1 && (parcelaAtual || 1) > 1
    ? format(subMonths(parseISO(data), (parcelaAtual || 1) - 1), "yyyy-MM-dd")
    : data;

/** O retrato do cartão. Cartão sem retrato começa vazio no dia em que foi cadastrado. */
export function aberturaDoCartao(cartao: CartaoCredito): AberturaCartao {
  const salva = typeof cartao.abertura === "string" ? safeParse(cartao.abertura) : cartao.abertura;
  if (salva && salva.em && salva.mes) return salva;
  // Cartões de antes: a "dívida inicial" era o que estava na fatura.
  const em = cartao.created_at ? format(new Date(cartao.created_at), "yyyy-MM-dd") : hojeIso();
  const divida = cartao.divida_inicial || 0;
  return { em, mes: proximaFatura(cartao, em), fatura: divida, usado: divida };
}

function safeParse(texto: string): AberturaCartao | null {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/** Uma cobrança no cartão: uma parcela, um fixo num mês, um empréstimo num mês. */
export interface Cobranca {
  origem: "transacao" | "gasto" | "compartilhado";
  id: string;
  valor: number;
  /** Fatura em que entra. */
  mes: string;
  /** Quando a compra foi feita (para parcelas, a data da 1ª). */
  compra: string;
  /** Marcada como paga no lançamento (não pela fatura). */
  pago: boolean;
  dataPagamento?: string;
}

/** As cobranças do cartão nas faturas de `de` até `ate`. */
function cobrancas(cartao: CartaoCredito, de: string, ate: string, d: DadosFatura): Cobranca[] {
  const lista: Cobranca[] = [];
  const dentro = (mes: string) => mes >= de && mes <= ate;

  d.transacoes
    .filter((t) => t.cartao_id === cartao.id)
    .forEach((t) => {
      const mes = mesDaFatura(t.data, cartao);
      if (dentro(mes))
        lista.push({ origem: "transacao", id: t.id, valor: t.valor, mes, compra: dataDaCompra(t.data, t.parcela_atual, t.num_parcelas), pago: t.pago });
    });

  d.meusGastos
    .filter((g) => g.cartao_id === cartao.id)
    .forEach((g) => {
      if (g.categoria === "fixo") {
        // Fixo entra todo mês a partir da fatura em que começou. O desativado
        // continua nas faturas que cobrou até o dia em que parou: tirá-lo das
        // faturas já pagas devolvia limite que nunca voltou. Sem esse dia
        // (desativado antes de o app guardá-lo), não há como saber, e ele sai.
        const parou = g.ativo === false ? g.encerrado_em || "" : null;
        if (parou === "") return;
        const inicio = mesDaFatura(g.data, cartao);
        for (let mes = de > inicio ? de : inicio; mes <= ate; mes = somarMeses(mes, 1)) {
          const compra = cobrancaMensal(cartao, mes, g.dia_vencimento || 1);
          if (parou && compra > parou) break;
          if (g.meses_suspensos?.includes(mes)) continue;
          lista.push({ origem: "gasto", id: g.id, valor: g.valor, mes, compra, pago: false });
        }
        return;
      }
      const mes = mesDaFatura(g.data, cartao);
      if (dentro(mes))
        lista.push({
          origem: "gasto",
          id: g.id,
          valor: g.valor,
          mes,
          compra: dataDaCompra(g.data, g.parcela_atual, g.num_parcelas),
          pago: g.pago,
          dataPagamento: g.data_pagamento,
        });
    });

  d.emprestimos
    .filter((e) => e.cartao_id === cartao.id)
    .forEach((e) => {
      // Parcelado: uma parcela por fatura. Recorrente: todo mês.
      const n = Math.max(1, e.num_parcelas || 1);
      const inicio = mesDaFatura(e.data_inicio, cartao);
      const ultimo = e.recorrente ? ate : somarMeses(inicio, n - 1);
      for (let mes = de > inicio ? de : inicio; mes <= ultimo && mes <= ate; mes = somarMeses(mes, 1)) {
        const k = mesesEntre(inicio, mes);
        const compra = e.recorrente ? format(addMonths(parseISO(e.data_inicio), k), "yyyy-MM-dd") : e.data_inicio;
        lista.push({ origem: "compartilhado", id: e.id, valor: e.valor_total / n, mes, compra, pago: false });
      }
    });

  return lista;
}

/** O que entra na fatura do mês ("yyyy-MM"). */
export function itensDaFatura(cartao: CartaoCredito, mes: string, d: DadosFatura) {
  const doMes = cobrancas(cartao, mes, mes, d);
  const ids = (origem: Cobranca["origem"]) => new Set(doMes.filter((c) => c.origem === origem).map((c) => c.id));
  const transacoes = ids("transacao");
  const gastos = ids("gasto");
  const emprestimos = ids("compartilhado");
  return {
    transacoes: d.transacoes.filter((t) => transacoes.has(t.id)),
    gastos: d.meusGastos.filter((g) => gastos.has(g.id)),
    emprestimos: d.emprestimos.filter((e) => emprestimos.has(e.id)),
  };
}

/** Pago antes do retrato: já estava fora do que o banco cobrava naquele dia. */
const pagoAntes = (c: Cobranca, a: AberturaCartao) => c.pago && (!c.dataPagamento || c.dataPagamento <= a.em);
/** Comprado até o dia do retrato: já está dentro dele. */
const dentroDoRetrato = (c: Cobranca, a: AberturaCartao) => c.compra <= a.em && !pagoAntes(c, a);

/** Pagamentos da fatura registrados depois do retrato. */
function pagamentosDaFatura(cartao: CartaoCredito, mes: string, d: DadosFatura, a: AberturaCartao) {
  return d.pagamentos
    .filter((p) => p.cartao_id === cartao.id && p.mes === mes)
    .filter((p) => mes > a.mes || !p.created_at || format(new Date(p.created_at), "yyyy-MM-dd") >= a.em)
    .reduce((s, p) => s + p.valor_pago, 0);
}

/** O retrato lido contra o que já foi lançado. */
export function resumoDaAbertura(cartao: CartaoCredito, d: DadosFatura) {
  const a = aberturaDoCartao(cartao);
  // Fixos e recorrentes só entram até o dia do retrato; parcelas, até a última.
  const doRetrato = cobrancas(cartao, a.mes, somarMeses(a.mes, HORIZONTE), d).filter((c) => dentroDoRetrato(c, a));
  const noMes = doRetrato.filter((c) => c.mes === a.mes);
  const depois = doRetrato.filter((c) => c.mes > a.mes);
  const lancadoNoMes = noMes.reduce((s, c) => s + c.valor, 0);
  const lancadoDepois = depois.reduce((s, c) => s + c.valor, 0);
  const semDetalheNoMes = Math.max(0, a.fatura - lancadoNoMes);
  // Faturas seguintes informadas: o que o banco mostra no mês e ninguém lançou.
  const semDetalhePorMes: Record<string, number> = {};
  Object.entries(a.seguintes || {}).forEach(([mes, valor]) => {
    if (mes <= a.mes || !(valor > 0)) return;
    const lancado = depois.filter((c) => c.mes === mes).reduce((s, c) => s + c.valor, 0);
    const falta = centavos(Math.max(0, valor - lancado));
    if (falta > 0) semDetalhePorMes[mes] = falta;
  });
  const semDetalheDosMeses = Object.values(semDetalhePorMes).reduce((s, v) => s + v, 0);
  // O que sobra do limite usado depois de tudo o que tem mês: fica sem mês.
  const semDetalheDepois = Math.max(0, a.usado - Math.max(a.fatura, lancadoNoMes) - lancadoDepois - semDetalheDosMeses);
  return {
    abertura: a,
    lancadoNoMes: centavos(lancadoNoMes),
    lancadoDepois: centavos(lancadoDepois),
    semDetalheNoMes: centavos(semDetalheNoMes),
    /** Das faturas seguintes informadas, o que ninguém lançou, por mês. */
    semDetalhePorMes,
    semDetalheDosMeses: centavos(semDetalheDosMeses),
    semDetalheDepois: centavos(semDetalheDepois),
    /** Ids que já estavam no retrato — "já estava na fatura". */
    idsDoRetrato: new Set(doRetrato.map((c) => `${c.origem}-${c.id}-${c.mes}`)),
  };
}

/** Fatura que venceu antes de o cartão entrar no Hedge: já foi paga. */
export const faturaAntesDoHedge = (cartao: CartaoCredito, mes: string) => mes < aberturaDoCartao(cartao).mes;

/** O que o banco mostrava para a fatura do mês e ninguém lançou. */
export function semDetalheDaFatura(cartao: CartaoCredito, mes: string, d: DadosFatura) {
  const a = aberturaDoCartao(cartao);
  if (mes < a.mes) return 0;
  const r = resumoDaAbertura(cartao, d);
  return mes === a.mes ? r.semDetalheNoMes : r.semDetalhePorMes[mes] || 0;
}

/** O total da fatura do mês, antes dos pagamentos. */
export function totalDaFatura(cartao: CartaoCredito, mes: string, d: DadosFatura) {
  const a = aberturaDoCartao(cartao);
  if (mes < a.mes) return 0;
  const itens = cobrancas(cartao, mes, mes, d).filter((c) => !(mes === a.mes && pagoAntes(c, a)));
  return centavos(itens.reduce((s, c) => s + c.valor, 0) + semDetalheDaFatura(cartao, mes, d));
}

/** Quanto do mês já foi pago: pelo registro de pagamento ou marcando os lançamentos. */
export function pagoDaFatura(cartao: CartaoCredito, mes: string, d: DadosFatura) {
  const a = aberturaDoCartao(cartao);
  if (mes < a.mes) return 0;
  const marcados = cobrancas(cartao, mes, mes, d)
    .filter((c) => c.pago && !pagoAntes(c, a))
    .reduce((s, c) => s + c.valor, 0);
  return centavos(Math.max(pagamentosDaFatura(cartao, mes, d, a), marcados));
}

/** O que ainda falta pagar da fatura do mês. */
export function valorDaFatura(cartao: CartaoCredito, mes: string, d: DadosFatura) {
  return centavos(Math.max(0, totalDaFatura(cartao, mes, d) - pagoDaFatura(cartao, mes, d)));
}

/**
 * Limite usado hoje, como o banco conta: a compra parcelada ocupa o valor
 * inteiro no dia da compra e cada fatura paga devolve o que pagou.
 */
export function limiteUsado(cartao: CartaoCredito, d: DadosFatura, hoje = hojeIso()) {
  const a = aberturaDoCartao(cartao);
  const r = resumoDaAbertura(cartao, d);
  const ate = somarMeses(mesDaFatura(hoje, cartao) > a.mes ? mesDaFatura(hoje, cartao) : a.mes, HORIZONTE);
  const lista = cobrancas(cartao, a.mes, ate, d);
  const comprado = lista.filter((c) => c.compra <= hoje && !pagoAntes(c, a)).reduce((s, c) => s + c.valor, 0);
  const meses = new Set<string>(lista.map((c) => c.mes));
  d.pagamentos.filter((p) => p.cartao_id === cartao.id && p.mes >= a.mes).forEach((p) => meses.add(p.mes));
  Object.keys(r.semDetalhePorMes).forEach((mes) => meses.add(mes));
  const devolvido = [...meses].reduce((s, mes) => s + pagoDaFatura(cartao, mes, d), 0);
  return centavos(Math.max(0, r.semDetalheNoMes + r.semDetalheDosMeses + r.semDetalheDepois + comprado - devolvido));
}

/**
 * Parcelas antigas sem detalhe que ainda faltam: o que o retrato tinha para
 * depois da próxima fatura, menos o que já foi pago além das faturas lançadas.
 */
export function semDetalheRestante(cartao: CartaoCredito, d: DadosFatura) {
  const a = aberturaDoCartao(cartao);
  const r = resumoDaAbertura(cartao, d);
  if (r.semDetalheDepois <= 0) return 0;
  const meses = new Set(d.pagamentos.filter((p) => p.cartao_id === cartao.id && p.mes > a.mes).map((p) => p.mes));
  const aMais = [...meses].reduce((s, mes) => s + Math.max(0, pagoDaFatura(cartao, mes, d) - totalDaFatura(cartao, mes, d)), 0);
  return centavos(Math.max(0, r.semDetalheDepois - aMais));
}

/** Monta o retrato a partir do que o app do banco mostra hoje. */
export function novaAbertura(
  cartao: { dia_vencimento: number; melhor_dia_compra?: number | null },
  limite: number,
  disponivel: number | null,
  fatura: number | null,
  hoje = hojeIso(),
  /** As faturas depois da próxima, na ordem: [a do mês seguinte, a do outro, ...]. */
  seguintes: number[] = []
): AberturaCartao {
  const mes = proximaFatura(cartao as CartaoCredito, hoje);
  const porMes: Record<string, number> = {};
  seguintes.forEach((v, i) => {
    if (v > 0) porMes[somarMeses(mes, i + 1)] = centavos(v);
  });
  const somaSeguintes = Object.values(porMes).reduce((s, v) => s + v, 0);
  // Sem o disponível, o limite usado é o que a pessoa informou, mês a mês.
  const usado = disponivel === null ? (fatura || 0) + somaSeguintes : Math.max(0, limite - disponivel);
  return {
    em: hoje,
    mes,
    fatura: fatura || 0,
    usado: centavos(Math.max(usado, (fatura || 0) + somaSeguintes)),
    ...(somaSeguintes > 0 ? { seguintes: porMes } : {}),
  };
}

/** O mês ("yyyy-MM") da fatura `n` meses depois da próxima. */
export const faturaDepoisDaProxima = (cartao: { dia_vencimento: number; melhor_dia_compra?: number | null }, n: number, hoje = hojeIso()) =>
  somarMeses(proximaFatura(cartao as CartaoCredito, hoje), n);
