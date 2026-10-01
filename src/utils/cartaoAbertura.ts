import { supabase } from "../lib/supabase";
import type { AberturaCartao, CartaoCredito } from "../types";

// Onde o retrato do cartão (utils/fatura) fica guardado: na coluna `abertura`
// (migração 20261003). Enquanto a coluna não existe, no perfil do usuário,
// por cartão — o app funciona igual nos dois casos.

type Mapa = Record<string, AberturaCartao>;

async function mapaDoPerfil(): Promise<Mapa> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  return (data.session?.user?.user_metadata?.cartoes_abertura as Mapa) || {};
}

/** Os cartões com o retrato guardado no perfil, quando a coluna está vazia. */
export async function comAbertura(cartoes: CartaoCredito[]): Promise<CartaoCredito[]> {
  if (cartoes.length === 0 || cartoes.every((c) => c.abertura)) return cartoes;
  const mapa = await mapaDoPerfil();
  return cartoes.map((c) => (c.abertura || !mapa[c.id] ? c : { ...c, abertura: mapa[c.id] }));
}

const faltaColuna = (erro: { message?: string; code?: string } | null) =>
  !!erro && (erro.code === "PGRST204" || /abertura/i.test(erro.message || ""));

async function guardarNoPerfil(cartaoId: string, abertura: AberturaCartao) {
  if (!supabase) return;
  const mapa = await mapaDoPerfil();
  await supabase.auth.updateUser({ data: { cartoes_abertura: { ...mapa, [cartaoId]: abertura } } });
}

/** Salva o cartão com o retrato; sem a coluna, o retrato vai para o perfil. */
export async function salvarCartao(
  dados: Record<string, unknown>,
  abertura: AberturaCartao | null,
  editandoId?: string
): Promise<{ id?: string; error?: unknown }> {
  if (!supabase) return {};
  const comRetrato = abertura ? { ...dados, abertura, divida_inicial: abertura.usado } : dados;
  const gravar = (linha: Record<string, unknown>) =>
    editandoId
      ? supabase!.from("cartoes_credito").update(linha).eq("id", editandoId).select("id").single()
      : supabase!.from("cartoes_credito").insert(linha).select("id").single();

  let { data, error } = await gravar(comRetrato);
  if (abertura && faltaColuna(error)) {
    const semColuna = { ...comRetrato };
    delete semColuna.abertura;
    ({ data, error } = await gravar(semColuna));
    if (!error && data?.id) await guardarNoPerfil(data.id, abertura);
  }
  return error ? { error } : { id: data?.id };
}
