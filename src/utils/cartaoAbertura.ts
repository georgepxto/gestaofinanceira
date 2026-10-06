import { supabase } from "../lib/supabase";
import type { AberturaCartao, CartaoCredito } from "../types";

// Onde o retrato do cartão (utils/fatura) fica guardado: na coluna `abertura`.
// Antes de a coluna existir ele ia para o perfil do usuário, por cartão. Quem
// conferiu o cartão naquela época ainda tem o retrato lá, e `comAbertura` o
// leva para a coluna na primeira leitura.

type Mapa = Record<string, AberturaCartao>;

async function mapaDoPerfil(): Promise<Mapa> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  return (data.session?.user?.user_metadata?.cartoes_abertura as Mapa) || {};
}

/** Os cartões com o retrato; o que ainda estava no perfil passa para a coluna. */
export async function comAbertura(cartoes: CartaoCredito[]): Promise<CartaoCredito[]> {
  if (cartoes.length === 0 || cartoes.every((c) => c.abertura)) return cartoes;
  const mapa = await mapaDoPerfil();
  return Promise.all(
    cartoes.map(async (c) => {
      const doPerfil = c.abertura ? null : mapa[c.id];
      if (!doPerfil) return c;
      // Se a gravação falhar, o retrato segue no perfil e a próxima leitura tenta de novo.
      await supabase?.from("cartoes_credito").update({ abertura: doPerfil }).eq("id", c.id);
      return { ...c, abertura: doPerfil };
    })
  );
}

/** Salva o cartão com o retrato. */
export async function salvarCartao(
  dados: Record<string, unknown>,
  abertura: AberturaCartao | null,
  editandoId?: string
): Promise<{ id?: string; error?: unknown }> {
  if (!supabase) return {};
  const linha = abertura ? { ...dados, abertura, divida_inicial: abertura.usado } : dados;
  const { data, error } = editandoId
    ? await supabase.from("cartoes_credito").update(linha).eq("id", editandoId).select("id").single()
    : await supabase.from("cartoes_credito").insert(linha).select("id").single();
  return error ? { error } : { id: data?.id };
}
