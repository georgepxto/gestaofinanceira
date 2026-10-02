import { addDays, format } from "date-fns";
import { supabase } from "../lib/supabase";
import type { Receita } from "../types";
import { avisarDadosMudaram } from "./onboarding";

// As respostas a "o salário caiu?" (tabela receitas_confirmacoes). Uma linha
// por receita e mês; responder de novo substitui a resposta anterior.

async function gravar(r: Receita, mes: string, campos: Record<string, unknown>) {
  if (!supabase) return { erro: "Sem conexão." };
  const { data: auth } = await supabase.auth.getUser();
  const salvar = (c: Record<string, unknown>) =>
    supabase!.from("receitas_confirmacoes").upsert({ receita_id: r.id, mes, user_id: auth.user?.id, ...c }, { onConflict: "receita_id,mes" });
  let { error } = await salvar(campos);
  // Sem a coluna `motivo` (migração 20261004 ainda não rodou): confirma sem ele.
  if (error && "motivo" in campos) {
    const { motivo: _semColuna, ...resto } = campos;
    void _semColuna;
    ({ error } = await salvar(resto));
  }
  if (error) return { erro: "Não foi possível salvar. Tente de novo." };
  avisarDadosMudaram("entradas");
  return {};
}

/**
 * Caiu: no dia `data` (hoje, o previsto, ou antes — o adiantamento) e no
 * `valor`. `motivo` explica um valor diferente do previsto ("vale", "hora extra").
 */
export const confirmarEntrada = (r: Receita, mes: string, data: string, valor = r.valor, motivo = "") =>
  gravar(r, mes, {
    status: "recebida",
    data_recebida: data,
    valor,
    perguntar_em: null,
    perguntar_ate: null,
    motivo: motivo.trim() && Math.abs(valor - r.valor) > 0.004 ? motivo.trim() : null,
  });

/** Ainda não caiu: perguntar de novo em `em` (e, num intervalo, até `ate`). */
export const adiarEntrada = (r: Receita, mes: string, em: string, ate?: string) =>
  gravar(r, mes, { status: "adiada", data_recebida: null, valor: null, perguntar_em: em, perguntar_ate: ate ?? null, motivo: null });

/** Volta a entrada para "prevista": sai do saldo e o app pergunta de novo no dia. */
export async function desfazerEntrada(r: Receita, mes: string) {
  if (!supabase) return { erro: "Sem conexão." };
  const { error } = await supabase.from("receitas_confirmacoes").delete().eq("receita_id", r.id).eq("mes", mes);
  if (error) return { erro: "Não foi possível desfazer." };
  avisarDadosMudaram("entradas");
  return {};
}

/** "daqui a N dias", em yyyy-MM-dd. */
export const daquiA = (dias: number, hoje = new Date()) => format(addDays(hoje, dias), "yyyy-MM-dd");
