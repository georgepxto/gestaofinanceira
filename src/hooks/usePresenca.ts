import { useEffect, useRef, useState } from "react";

/** Quanto dura a saída de painel e formulário (em sincronia com o CSS). */
export const SAIDA_MS = 200;

/**
 * Mantém um painel montado enquanto ele sai: `aberto` vira false, o painel
 * fica na tela por `SAIDA_MS` com `saindo` ligado (o CSS anima a saída) e só
 * então desmonta. Sem isso, fechar era um corte seco.
 *
 * `congelar` guarda o último conteúdo de quando estava aberto: quem chama
 * costuma limpar o estado junto com o fechar, e o painel sairia vazio.
 */
export function usePresenca<T>(aberto: boolean, conteudo: T) {
  const [montado, setMontado] = useState(aberto);
  const [saindo, setSaindo] = useState(false);
  const ultimo = useRef(conteudo);
  if (aberto) ultimo.current = conteudo;

  useEffect(() => {
    if (aberto) {
      setMontado(true);
      setSaindo(false);
      return;
    }
    if (!montado) return;
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduzido) {
      setMontado(false);
      return;
    }
    setSaindo(true);
    const t = window.setTimeout(() => {
      setMontado(false);
      setSaindo(false);
    }, SAIDA_MS);
    return () => window.clearTimeout(t);
    // `montado` fora das deps de propósito: só a mudança de `aberto` decide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  return { montado: aberto || montado, saindo: !aberto && saindo, congelado: ultimo.current };
}
