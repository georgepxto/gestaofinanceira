import { supabase } from "../lib/supabase";

// Primeiros passos de quem começa do zero. O que a pessoa já viu ou dispensou
// fica no user_metadata (vale em qualquer aparelho); o que ela já FEZ é lido
// dos dados (tem conta? tem renda?), então nunca fica desatualizado.

export interface EstadoOnboarding {
  /** A tela de boas-vindas (criar a primeira conta) já apareceu. */
  boasVindasVista?: boolean;
  /** A pessoa dispensou o cartão "Primeiros passos". */
  passosDispensados?: boolean;
}

export const lerOnboarding = (metadata: Record<string, unknown> | undefined): EstadoOnboarding =>
  (metadata?.onboarding as EstadoOnboarding) || {};

export async function marcarOnboarding(atual: EstadoOnboarding, mudanca: EstadoOnboarding) {
  if (!supabase) return;
  await supabase.auth.updateUser({ data: { onboarding: { ...atual, ...mudanca } } });
}

/** Zerar os dados é recomeçar: as boas-vindas e os primeiros passos voltam. */
export async function recomecarOnboarding() {
  if (!supabase) return;
  await supabase.auth.updateUser({ data: { onboarding: {} } });
}

// Quem cria ou muda um lançamento fora do Início (o "+" global, os primeiros
// passos) avisa por aqui, e o Início recarrega os números.
const EVENTO = "hedge:dados-mudaram";
export const avisarDadosMudaram = (origem = "") =>
  document.dispatchEvent(new CustomEvent(EVENTO, { detail: { origem } }));
export const ouvirDadosMudaram = (fn: (origem: string) => void) => {
  const ouvinte = (e: Event) => fn((e as CustomEvent<{ origem: string }>).detail?.origem || "");
  document.addEventListener(EVENTO, ouvinte);
  return () => document.removeEventListener(EVENTO, ouvinte);
};
