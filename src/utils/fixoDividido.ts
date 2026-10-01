import { format } from "date-fns";
import { gastosFunctions, isSupabaseConfigured, supabase } from "../lib/supabase";
import { categoriaPadraoAtual } from "../hooks/useCategorias";
import type { MeuGasto } from "../types";

// ─── Fixo dividido ─────────────────────────────────────────────────────────
// A assinatura que você paga inteira e os outros te devolvem (Apple One de
// 104,90, sua parte 17,49). O fixo guarda as pessoas e a sua parte; cada pessoa
// ganha uma cobrança mensal recorrente em A receber, Do mês.

export const pessoasDoGasto = (g: { dividido_com_pessoas?: string[]; dividido_com?: string | null }) =>
  g.dividido_com_pessoas?.length ? g.dividido_com_pessoas : g.dividido_com ? [g.dividido_com] : [];

/** dividido_com como o banco guarda: o nome, ou a lista em JSON quando são várias. */
export const divididoComParaBanco = (pessoas: string[]) =>
  pessoas.length > 1 ? JSON.stringify(pessoas) : pessoas[0] || undefined;

const mesesAte = (de: string, ate: Date) => {
  const [a, m] = de.split("-").map(Number);
  return (ate.getFullYear() - a) * 12 + (ate.getMonth() + 1 - m);
};

/** Uma cobrança recorrente por pessoa, a partir deste mês, no dia do fixo. */
export async function criarCobrancasDoFixo(
  fixo: {
    descricao: string;
    valor: number;
    minha_parte?: number;
    dia_vencimento?: number;
    tipo: "credito" | "debito";
    categoria_gasto?: string;
    pessoas: string[];
  },
  hoje = new Date()
) {
  if (!isSupabaseConfigured || !supabase || fixo.pessoas.length === 0) return;
  const parte = Math.max(fixo.valor - (fixo.minha_parte ?? fixo.valor), 0) / fixo.pessoas.length;
  if (parte <= 0) return;
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const dataInicio = format(
    new Date(hoje.getFullYear(), hoje.getMonth(), Math.min(fixo.dia_vencimento || 1, ultimo)),
    "yyyy-MM-dd"
  );
  for (const pessoa of fixo.pessoas) {
    await gastosFunctions.create({
      descricao: `${fixo.descricao} - ${pessoa}`,
      pessoa,
      valor_total: Math.round(parte * 100) / 100,
      num_parcelas: 1,
      data_inicio: dataInicio,
      tipo: fixo.tipo,
      categoria: fixo.categoria_gasto || categoriaPadraoAtual("gasto"), // ds-ok: o reserva é a categoria padrão, não o tipo
      recorrente: true,
      cartao_id: undefined,
      conta_id: undefined,
    });
  }
}

/**
 * Para as cobranças do fixo sem apagar os meses que já passaram: a recorrente
 * vira parcelada até o mês anterior (ou até este, com `incluirMesAtual`). A
 * que ainda nem chegou a valer é apagada.
 */
export async function encerrarCobrancasDoFixo(fixo: MeuGasto, incluirMesAtual: boolean, hoje = new Date()) {
  const pessoas = pessoasDoGasto(fixo);
  if (!isSupabaseConfigured || !supabase || pessoas.length === 0) return;
  const { data } = await supabase
    .from("gastos")
    .select("id, data_inicio")
    .in("pessoa", pessoas)
    .in("descricao", pessoas.map((p) => `${fixo.descricao} - ${p}`))
    .eq("recorrente", true);
  for (const c of data || []) {
    const meses = mesesAte(c.data_inicio, hoje) + (incluirMesAtual ? 1 : 0);
    if (meses <= 0) await gastosFunctions.delete(c.id);
    else await supabase.from("gastos").update({ recorrente: false, num_parcelas: meses }).eq("id", c.id);
  }
}
