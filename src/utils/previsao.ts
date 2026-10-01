import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import type { CartaoCredito, ContaBancaria, Gasto, TransacaoCartao } from "../types";
import { chaveMesPagamentoParcial, formatCurrency, formatMonthYear, isGastoAtivoNoMes } from "./calculations";
import { aberturaDoCartao, itensDaFatura, semDetalheRestante, valorDaFatura } from "./fatura";
import { comAbertura } from "./cartaoAbertura";
import {
  carregarLivro,
  estadoDaEntrada,
  fixosAindaPorSair,
  migrarContasLegadas,
  receitaNoMes,
  saldoDaConta,
  type Livro,
} from "./saldo";

// ═══════════════════════════════════════════════════════════════════════════
// PREVISÃO DO FIM DO MÊS — a mesma conta no Início e em Contas
//
//   fim do mês = saldo hoje
//              + o que ainda vai entrar (salário e receitas fixas ainda não caídas)
//              + o que as pessoas ainda vão te devolver deste mês (A receber)
//              − o que ainda vai sair (fixos que vencem, débitos com data futura)
//              − o que falta pagar da fatura do cartão deste mês
//
// Só conta o que tem conta escolhida (é o que mexe no saldo). Sempre o mês de
// hoje: é uma previsão a partir do saldo de agora.
// ═══════════════════════════════════════════════════════════════════════════

export interface LinhaPrevisao {
  descricao: string;
  valor: number;
  /** yyyy-MM-dd, quando tem dia. */
  dia?: string;
  /** Do que se trata: "Apple One", "fixo dividido, sua parte R$ 17,48"... */
  detalhe?: string;
}

export interface Previsao {
  mes: string;
  saldoHoje: number;
  vaiEntrar: number;
  vaoDevolver: number;
  vaiSair: number;
  faturas: number;
  fimDoMes: number;
  entradas: LinhaPrevisao[];
  devolucoes: LinhaPrevisao[];
  saidas: LinhaPrevisao[];
  faturasPorCartao: LinhaPrevisao[];
}

export interface DadosPrevisao {
  contas: ContaBancaria[];
  livro: Livro;
  cartoes: CartaoCredito[];
  transacoes: TransacaoCartao[];
  pagamentosFatura: { cartao_id: string; mes: string; valor_pago: number; created_at?: string }[];
  /** Pagamentos do mês de hoje (pagamentos_parciais). */
  pagamentosDoMes: { pessoa: string; valor: number }[];
  /** Descrições das cobranças em aberto, para saber quem já teve o mês fechado. */
  cobrancas: { pessoa: string; descricao: string }[];
}

const somar = (xs: LinhaPrevisao[]) => Math.round(xs.reduce((s, x) => s + x.valor, 0) * 100) / 100;

export function calcularPrevisao(d: DadosPrevisao, hoje = new Date()): Previsao {
  const mes = format(hoje, "yyyy-MM");
  const hojeIso = format(hoje, "yyyy-MM-dd");
  const idsContas = new Set(d.contas.map((c) => c.id));
  const naConta = (id?: string | null) => !!id && idsContas.has(id);

  const nomeDaConta = (id?: string | null) => d.contas.find((c) => c.id === id)?.nome || "";

  const saldoHoje = Math.round(d.contas.reduce((s, c) => s + saldoDaConta(c, d.livro, hoje), 0) * 100) / 100;

  // Salário e receitas fixas/recorrentes deste mês que ainda não caíram.
  const entradas: LinhaPrevisao[] = d.livro.receitas
    .filter((r) => r.tipo !== "avulso" && naConta(r.conta_id) && receitaNoMes(r, mes))
    .map((r) => ({ r, e: estadoDaEntrada(r, mes, d.livro, hoje) }))
    .filter(({ e }) => e.status !== "recebida")
    .map(({ r, e }) => ({
      descricao: r.descricao,
      valor: r.valor,
      dia: e.dataPrevista,
      detalhe: [
        nomeDaConta(r.conta_id),
        r.tipo === "recorrente" ? "recorrente" : "fixa",
        e.status === "adiada" ? "adiada" : e.status === "confirmar" ? "esperando confirmar" : "",
      ]
        .filter(Boolean)
        .join(", "),
    }));

  // O que cada pessoa ainda deve deste mês. Quem teve o mês fechado já virou
  // cobrança em aberto (prazo indefinido) e não entra na previsão.
  const fechados = new Set(
    d.cobrancas.filter((c) => c.descricao === `Gastos pendentes - ${formatMonthYear(hoje)}`).map((c) => c.pessoa)
  );
  const devido = new Map<string, number>();
  const motivos = new Map<string, string[]>();
  for (const g of d.livro.emprestimos as Gasto[]) {
    if (!isGastoAtivoNoMes(g, hoje) || fechados.has(g.pessoa)) continue;
    devido.set(g.pessoa, (devido.get(g.pessoa) || 0) + g.valor_total / g.num_parcelas);
    // "Apple One - George" → "Apple One": o nome da pessoa já está na linha.
    const motivo = g.descricao.replace(new RegExp(`\\s*-\\s*${g.pessoa.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
    const lista = motivos.get(g.pessoa) || [];
    if (!lista.includes(motivo)) motivos.set(g.pessoa, [...lista, motivo]);
  }
  for (const p of d.pagamentosDoMes) {
    if (devido.has(p.pessoa)) devido.set(p.pessoa, (devido.get(p.pessoa) || 0) - (Number(p.valor) || 0));
  }
  const devolucoes: LinhaPrevisao[] = [...devido.entries()]
    .filter(([, v]) => v > 0.004)
    .map(([pessoa, v]) => ({ descricao: pessoa, valor: Math.round(v * 100) / 100, detalhe: (motivos.get(pessoa) || []).join(", ") }));

  // O que ainda sai da conta neste mês.
  const fixos = d.livro.meusGastos.filter((g) => g.categoria === "fixo");
  const saidasFixas = fixos
    .filter((g) => naConta(g.conta_id) && fixosAindaPorSair([g], hoje) > 0)
    .map((g) => {
      const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      const dia = `${mes}-${String(Math.min(g.dia_vencimento || 1, ultimo)).padStart(2, "0")}`;
      const dividido = !!g.minha_parte && (g.dividido_com_pessoas?.length || g.dividido_com);
      const detalhe = dividido
        ? `fixo dividido, sua parte ${formatCurrency(g.minha_parte as number)}`
        : `fixo, ${nomeDaConta(g.conta_id)}`;
      return { descricao: g.descricao, valor: fixosAindaPorSair([g], hoje), dia, detalhe };
    });
  const debitosFuturos = [
    ...d.livro.meusGastos
      .filter((g) => g.categoria !== "fixo" && g.tipo === "debito" && naConta(g.conta_id) && g.data > hojeIso && g.data.startsWith(mes))
      .map((g) => ({ descricao: g.descricao, valor: g.valor, dia: g.data, detalhe: `débito agendado, ${nomeDaConta(g.conta_id)}` })),
    ...(d.livro.emprestimos as Gasto[])
      .filter((e) => e.tipo === "debito" && naConta(e.conta_id) && e.data_inicio > hojeIso && e.data_inicio.startsWith(mes))
      .map((e) => ({ descricao: e.descricao, valor: e.valor_total, dia: e.data_inicio, detalhe: `empréstimo para ${e.pessoa}` })),
  ];
  const saidas = [...saidasFixas, ...debitosFuturos];

  // Fatura deste mês que ainda falta pagar.
  const dadosFatura = {
    meusGastos: d.livro.meusGastos,
    transacoes: d.transacoes,
    emprestimos: d.livro.emprestimos as Gasto[],
    pagamentos: d.pagamentosFatura,
  };
  const faturasPorCartao = d.cartoes
    .map((c) => {
      const itens = itensDaFatura(c, mes, dadosFatura);
      const n = itens.transacoes.length + itens.gastos.length + itens.emprestimos.length;
      // Parcelas antigas sem detalhe podem cair nesta fatura sem o Hedge saber.
      const podeFaltar = mes > aberturaDoCartao(c).mes && semDetalheRestante(c, dadosFatura) > 0;
      const vence = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      return {
        descricao: c.nome,
        valor: Math.round(valorDaFatura(c, mes, dadosFatura) * 100) / 100,
        dia: `${mes}-${String(Math.min(c.dia_vencimento || 1, vence)).padStart(2, "0")}`,
        detalhe: `${n} ${n === 1 ? "compra" : "compras"} nesta fatura${podeFaltar ? ", pode faltar parcela antiga sem detalhe" : ""}`,
      };
    })
    .filter((f) => f.valor > 0);

  const vaiEntrar = somar(entradas);
  const vaoDevolver = somar(devolucoes);
  const vaiSair = somar(saidas);
  const faturas = somar(faturasPorCartao);
  return {
    mes,
    saldoHoje,
    vaiEntrar,
    vaoDevolver,
    vaiSair,
    faturas,
    fimDoMes: Math.round((saldoHoje + vaiEntrar + vaoDevolver - vaiSair - faturas) * 100) / 100,
    entradas,
    devolucoes,
    saidas,
    faturasPorCartao,
  };
}

/** Busca tudo e devolve a previsão, com as contas e o livro usados. */
export async function carregarPrevisao(hoje = new Date()) {
  if (!supabase) return null;
  const [{ data: contasRaw }, livro, { data: cartoes }, { data: transacoes }, { data: pagamentosFatura }, { data: pagamentosDoMes }, { data: cobrancas }] =
    await Promise.all([
      supabase.from("contas_bancarias").select("*").order("nome"),
      carregarLivro(),
      supabase.from("cartoes_credito").select("*"),
      supabase.from("transacoes_cartao").select("*"),
      supabase.from("pagamentos_fatura").select("cartao_id, mes, valor_pago, created_at"),
      supabase.from("pagamentos_parciais").select("pessoa, valor").eq("mes", chaveMesPagamentoParcial(hoje)),
      supabase.from("saldos_devedores").select("pessoa, descricao"),
    ]);
  let contas = (contasRaw as ContaBancaria[]) || [];
  // Contas do modelo antigo começam no modelo novo com o mesmo saldo de antes.
  if (await migrarContasLegadas(contas, livro)) {
    const { data } = await supabase.from("contas_bancarias").select("*").order("nome");
    contas = (data as ContaBancaria[]) || [];
  }
  const cartoesComAbertura = await comAbertura((cartoes as CartaoCredito[]) || []);
  const previsao = calcularPrevisao(
    {
      contas,
      livro,
      cartoes: cartoesComAbertura,
      transacoes: (transacoes as TransacaoCartao[]) || [],
      pagamentosFatura: pagamentosFatura || [],
      pagamentosDoMes: pagamentosDoMes || [],
      cobrancas: cobrancas || [],
    },
    hoje
  );
  return { previsao, contas, livro, cartoes: cartoesComAbertura };
}
