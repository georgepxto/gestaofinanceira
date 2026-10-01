import { addDays, format, startOfMonth } from "date-fns";
import { supabase } from "../lib/supabase";
import type { ContaBancaria, Gasto, MeuGasto, Receita } from "../types";

// ═══════════════════════════════════════════════════════════════════════════
// SALDO — a única conta de saldo do app
//
// O saldo de uma conta não é um número guardado e remendado a cada operação.
// É o histórico somado:
//
//   saldo = saldo_inicial (o que a pessoa informou ao criar a conta)
//         + tudo que entrou nela desde que foi criada, até hoje
//         − tudo que saiu dela desde que foi criada, até hoje
//
// Entra: receita avulsa e cada mês de receita fixa/recorrente.
// Sai: gasto no débito, empréstimo no débito, fatura paga e cada mês de gasto
// fixo. Só mexe no saldo o que tem conta escolhida.
//
// Antes, criar/editar/excluir cada coisa escrevia `saldo_atual` à mão, em cinco
// lugares, e fixo/receita recorrente entravam só "no mês atual": bastava um
// desses caminhos esquecer de desfazer o outro para o número desandar, e na
// virada do mês o salário do mês anterior sumia do saldo. Calculado do
// histórico, editar ou excluir qualquer coisa corrige o saldo sozinho.
//
// O que aconteceu ANTES de a conta ser criada não entra: já está no saldo que a
// pessoa informou. Lançamento com data futura entra quando a data chegar.
// `saldo_atual` não é mais usado (fica nulo); ver `migrarContasLegadas`.
// ═══════════════════════════════════════════════════════════════════════════

export interface Livro {
  receitas: Receita[];
  /** Todos os gastos pessoais, fixos inclusive. */
  meusGastos: MeuGasto[];
  /** Empréstimos (tabela `gastos`). */
  emprestimos: Gasto[];
  pagamentosFatura: { conta_id?: string | null; valor_pago: number; created_at?: string }[];
}

const ISO = "yyyy-MM-dd";
const hojeIso = (hoje: Date) => format(hoje, ISO);

/** "2026-09-30" ou timestamp → dia local ("2026-09-30"). */
export const diaLocal = (valor?: string | null) =>
  !valor ? "" : valor.length <= 10 ? valor : format(new Date(valor), ISO);

export const inicioDaConta = (conta: ContaBancaria) => diaLocal(conta.created_at) || "0000-01-01";

/** Dia em que o fixo/receita recorrente começa a contar. */
const ehFixo = (item: MeuGasto | Receita): item is MeuGasto => (item as MeuGasto).categoria === "fixo";

const inicioDoRecorrente = (item: MeuGasto | Receita) =>
  ehFixo(item) ? diaLocal(item.data) : diaLocal((item as Receita).created_at);

/** "2026-10-01" → timestamp da meia-noite LOCAL (gravar só a data viraria UTC e cairia no dia anterior). */
export const timestampDoDia = (dia: string) => {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(a, m - 1, d).toISOString();
};

const mesesEntre = (de: string, ate: string) => {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
};

const diaNoMes = (ano: number, mes: number, dia: number) =>
  Math.min(dia, new Date(ano, mes + 1, 0).getDate());

/**
 * Datas em que um recorrente aconteceu: um por mês, no dia escolhido (o 31 vira
 * o último dia em mês curto), de `inicio` até `ate`. Pula meses suspensos e para
 * depois de `maxMeses` meses contados do mês de início.
 */
export function ocorrencias(
  inicio: string,
  dia: number,
  ate: string,
  { maxMeses, suspensos }: { maxMeses?: number; suspensos?: string[] | null } = {}
): string[] {
  // O banco devolve `meses_suspensos` nulo quando nunca houve pausa.
  const pulados = suspensos || [];
  if (!inicio || inicio > ate) return [];
  const [ai, mi] = inicio.split("-").map(Number);
  const [af, mf] = ate.split("-").map(Number);
  const datas: string[] = [];
  for (let k = 0, ano = ai, mes = mi - 1; ano < af || (ano === af && mes <= mf - 1); k++) {
    if (maxMeses !== undefined && k >= maxMeses) break;
    const chave = `${ano}-${String(mes + 1).padStart(2, "0")}`;
    const data = `${chave}-${String(diaNoMes(ano, mes, dia || 1)).padStart(2, "0")}`;
    if (data >= inicio && data <= ate && !pulados.includes(chave)) datas.push(data);
    mes++;
    if (mes > 11) { mes = 0; ano++; }
  }
  return datas;
}

/** O fixo mexe no saldo? Só no débito, com conta e ativo. */
const fixoMexeNoSaldo = (g: MeuGasto) => g.categoria === "fixo" && g.tipo !== "credito" && !!g.conta_id && g.ativo !== false;

/** Datas do fixo/receita recorrente que já entraram no saldo da conta. */
function ocorrenciasNoSaldo(item: MeuGasto | Receita, conta: ContaBancaria, hoje: Date): string[] {
  const desde = [inicioDoRecorrente(item), inicioDaConta(conta)].sort().pop()!;
  if (ehFixo(item)) {
    return ocorrencias(desde, item.dia_vencimento || 1, hojeIso(hoje), { suspensos: item.meses_suspensos });
  }
  const r = item as Receita;
  // A recorrente conta `num_meses` a partir do próprio mês de início, não do
  // mês em que a conta foi criada.
  const todas = ocorrencias(inicioDoRecorrente(r), r.dia_recebimento || 1, hojeIso(hoje), {
    maxMeses: r.tipo === "recorrente" ? r.num_meses || 1 : undefined,
  });
  return todas.filter((d) => d >= desde);
}

/** Saldo da conta hoje. */
export function saldoDaConta(conta: ContaBancaria, livro: Livro, hoje = new Date()): number {
  const de = inicioDaConta(conta);
  const ate = hojeIso(hoje);
  const noPeriodo = (d: string) => !!d && d >= de && d <= ate;
  let saldo = Number(conta.saldo_inicial) || 0;

  for (const r of livro.receitas) {
    if (r.conta_id !== conta.id) continue;
    if (r.tipo === "avulso") {
      if (noPeriodo(diaLocal(r.created_at))) saldo += r.valor;
    } else {
      saldo += r.valor * ocorrenciasNoSaldo(r, conta, hoje).length;
    }
  }

  for (const g of livro.meusGastos) {
    if (g.conta_id !== conta.id) continue;
    if (g.categoria === "fixo") {
      if (fixoMexeNoSaldo(g)) saldo -= g.valor * ocorrenciasNoSaldo(g, conta, hoje).length;
    } else if (g.tipo === "debito" && noPeriodo(g.data)) {
      // No dividido sai o valor cheio: a conta pagou tudo, a parte dos outros
      // volta pelo A receber.
      saldo -= g.valor;
    }
  }

  for (const e of livro.emprestimos) {
    if (e.conta_id === conta.id && e.tipo === "debito" && noPeriodo(e.data_inicio)) saldo -= e.valor_total;
  }

  for (const p of livro.pagamentosFatura) {
    if (p.conta_id === conta.id && noPeriodo(diaLocal(p.created_at))) saldo -= Number(p.valor_pago) || 0;
  }

  return Math.round(saldo * 100) / 100;
}

/** O gasto fixo conta neste mês (ativo e não suspenso)? */
export const fixoValeNoMes = (g: MeuGasto, mes: string) =>
  g.ativo !== false && !g.meses_suspensos?.includes(mes);

/**
 * Fixos com conta que ainda vão sair neste mês (o dia ainda não chegou). É o
 * que o "Saldo livre" desconta do saldo de hoje. Fixo sem conta não entra no
 * saldo em momento nenhum, então também não entra aqui.
 */
export function fixosAindaPorSair(gastosFixos: MeuGasto[], hoje = new Date()) {
  const fimDoMes = format(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0), ISO);
  const amanha = format(addDays(hoje, 1), ISO);
  return gastosFixos
    .filter(fixoMexeNoSaldo)
    .reduce((acc, g) => {
      const desde = [inicioDoRecorrente(g), amanha].sort().pop()!;
      return acc + g.valor * ocorrencias(desde, g.dia_vencimento || 1, fimDoMes, { suspensos: g.meses_suspensos }).length;
    }, 0);
}

/** A receita fixa/recorrente tem entrada no mês ("yyyy-MM")? */
export function receitaNoMes(r: Receita, mes: string) {
  if (r.tipo === "avulso") return false;
  const inicio = inicioDoRecorrente(r);
  if (!inicio || mes < inicio.substring(0, 7)) return false;
  if (r.tipo !== "recorrente") return true;
  return mesesEntre(inicio, `${mes}-01`) < (r.num_meses || 1);
}

// ─── Gravação ──────────────────────────────────────────────────────────────

/** Primeiro dia do mês corrente: de onde um fixo/receita recém-criado conta. */
export const inicioParaNovoRecorrente = (hoje = new Date()) => format(startOfMonth(hoje), ISO);

/** Soma `delta` ao saldo_inicial da conta (lido fresco do banco). */
async function somarAoSaldoInicial(contaId: string, delta: number) {
  if (!supabase || !delta) return;
  const { data } = await supabase.from("contas_bancarias").select("saldo_inicial").eq("id", contaId).single();
  if (!data) return;
  const novo = Math.round(((Number(data.saldo_inicial) || 0) + delta) * 100) / 100;
  await supabase.from("contas_bancarias").update({ saldo_inicial: novo }).eq("id", contaId);
}

/** Quanto o fixo/receita recorrente já mexeu no saldo da conta até hoje (com sinal). */
function efeitoNaConta(item: MeuGasto | Receita | null, conta: ContaBancaria, hoje: Date): number {
  if (!item || item.conta_id !== conta.id) return 0;
  if (ehFixo(item)) return fixoMexeNoSaldo(item) ? -item.valor * ocorrenciasNoSaldo(item, conta, hoje).length : 0;
  const r = item as Receita;
  return r.tipo === "avulso" ? 0 : r.valor * ocorrenciasNoSaldo(r, conta, hoje).length;
}

/**
 * Mudar um fixo ou uma receita recorrente — valor, dia, conta, tipo, meses —,
 * desativar ou excluir não pode reescrever o passado: trocar o aluguel de 1.400
 * para 1.500 não muda quanto saiu nos meses que já foram, e excluir o fixo não
 * devolve ao saldo um dinheiro que de fato saiu.
 *
 * Chamar ANTES de gravar, com o item como era e como fica (`null` = excluído).
 * A diferença do que os dois já teriam movimentado vai para o saldo_inicial de
 * cada conta envolvida, e o saldo de hoje fica igual. Daqui pra frente vale o
 * novo. O item não muda de data: continua aparecendo nos meses em que existiu.
 */
export async function manterSaldoAoMudar(
  antes: MeuGasto | Receita,
  depois: MeuGasto | Receita | null,
  hoje = new Date()
) {
  if (!supabase) return;
  const ids = [...new Set([antes.conta_id, depois?.conta_id].filter(Boolean))] as string[];
  for (const id of ids) {
    const { data } = await supabase.from("contas_bancarias").select("*").eq("id", id).single();
    if (!data) continue;
    const conta = data as ContaBancaria;
    const delta = efeitoNaConta(depois, conta, hoje) - efeitoNaConta(antes, conta, hoje);
    if (Math.abs(delta) > 0.004) await somarAoSaldoInicial(id, -delta);
  }
}

/** Corrigir o saldo à mão: a diferença vai para o saldo_inicial. */
export async function corrigirSaldo(conta: ContaBancaria, livro: Livro, saldoDesejado: number) {
  await somarAoSaldoInicial(conta.id, saldoDesejado - saldoDaConta(conta, livro));
}

// ─── Migração das contas do modelo antigo ──────────────────────────────────

/** A conta antiga: `saldo_atual` + só os recorrentes do mês corrente. */
function saldoLegado(conta: ContaBancaria, livro: Livro, hoje: Date) {
  const mes = format(hoje, "yyyy-MM");
  const dia = hoje.getDate();
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const ate = (d: number) => Math.min(d || 1, ultimo) <= dia;
  const base = Number(conta.saldo_atual ?? conta.saldo_inicial) || 0;
  const rec = livro.receitas
    .filter((r) => r.conta_id === conta.id && (r.tipo === "fixo" || r.tipo === "recorrente") && ate(r.dia_recebimento))
    .reduce((s, r) => s + r.valor, 0);
  const fix = livro.meusGastos
    .filter((g) => g.categoria === "fixo" && g.conta_id === conta.id && fixoValeNoMes(g, mes) && ate(g.dia_vencimento || 1))
    .reduce((s, g) => s + g.valor, 0);
  const div = livro.meusGastos
    .filter((g) => g.categoria === "divida" && g.tipo === "debito" && g.conta_id === conta.id && g.data.startsWith(mes) && g.data <= hojeIso(hoje))
    .reduce((s, g) => s + g.valor, 0);
  return base + rec - fix - div;
}

/**
 * Contas criadas no modelo antigo têm `saldo_atual` preenchido. Na primeira
 * vez que o app abre depois da mudança, o saldo_inicial é ajustado para que o
 * saldo novo comece IGUAL ao que a pessoa via, e `saldo_atual` vira nulo — a
 * marca de "já migrada". Devolve true se mexeu em alguma conta.
 */
export async function migrarContasLegadas(contas: ContaBancaria[], livro: Livro, hoje = new Date()) {
  if (!supabase) return false;
  let mexeu = false;
  for (const conta of contas) {
    if (conta.saldo_atual === null || conta.saldo_atual === undefined) continue;
    const alvo = saldoLegado(conta, livro, hoje);
    const semInicial = saldoDaConta({ ...conta, saldo_inicial: 0 }, livro, hoje);
    const { error } = await supabase
      .from("contas_bancarias")
      .update({ saldo_inicial: Math.round((alvo - semInicial) * 100) / 100, saldo_atual: null })
      .eq("id", conta.id);
    if (!error) mexeu = true;
  }
  return mexeu;
}

/** Busca tudo que o saldo precisa, numa ida só. */
export async function carregarLivro(): Promise<Livro> {
  if (!supabase) return { receitas: [], meusGastos: [], emprestimos: [], pagamentosFatura: [] };
  const [r, g, e, p] = await Promise.all([
    supabase.from("receitas").select("*"),
    supabase.from("meus_gastos").select("*"),
    supabase.from("gastos").select("*"),
    supabase.from("pagamentos_fatura").select("conta_id, valor_pago, created_at"),
  ]);
  return {
    receitas: (r.data as Receita[]) || [],
    meusGastos: (g.data as MeuGasto[]) || [],
    emprestimos: (e.data as Gasto[]) || [],
    pagamentosFatura: p.data || [],
  };
}
