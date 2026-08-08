import { useState, useEffect, type ReactNode } from "react";

/**
 * O splash de boot. Um só para os dois portões do App (auth e feature flags):
 * eram duas peças visuais diferentes em sequência no mesmo carregamento.
 *
 * Não é um skeleton. Skeleton promete que o conteúdo vem naquele formato,
 * naquele lugar — no boot não se sabe nem qual tela vem, e a réplica do shell
 * que morava aqui (sidebar, header, grade de KPIs) se lia como uma página que
 * chegou vazia, não como carregamento.
 */
export function BootSplash() {
  return (
    <div
      className="min-h-screen bg-zinc-50 dark:bg-app-dark flex flex-col items-center justify-center gap-5"
      role="status"
      aria-label="Abrindo o Hedge"
    >
      <img
        src="/favicon-light.png"
        alt=""
        aria-hidden="true"
        className="w-11 h-11 dark:hidden"
      />
      <img
        src="/favicon-dark.png"
        alt=""
        aria-hidden="true"
        className="w-11 h-11 hidden dark:block"
      />

      {/* Progresso indeterminado: 2px, o acento da marca, e nada mais. A
          animação é a única do produto e vive no index.css como `boot-slide`. */}
      <div className="w-32 h-[2px] rounded-full bg-zinc-200 dark:bg-white/[0.07] overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-emerald-600 dark:bg-emerald-500 motion-safe:animate-[boot-slide_1.1s_ease-in-out_infinite] motion-reduce:w-full" />
      </div>

      <span className="sr-only">Abrindo o Hedge…</span>
    </div>
  );
}

/**
 * Segura os filhos por `atraso` antes de mostrá-los. Para fallback de Suspense,
 * onde não há como consultar um hook de fora — o React renderiza o fallback no
 * instante em que suspende, então o limiar tem que morar dentro dele.
 *
 * Sem piso: o React desmonta o fallback assim que o chunk resolve e não há como
 * pedir que espere. O limiar é a metade que dá para ter aqui. Onde existe um
 * `if (loading)` de verdade, use `useEsperaLonga`, que tem as duas.
 */
export function AparecerSeDemorar({
  atraso = 300,
  children,
}: {
  atraso?: number;
  children: ReactNode;
}) {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMostrar(true), atraso);
    return () => clearTimeout(t);
  }, [atraso]);

  return mostrar ? <>{children}</> : null;
}
