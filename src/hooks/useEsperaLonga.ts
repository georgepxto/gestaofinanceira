import { useState, useEffect, useRef } from "react";

/**
 * Verdadeiro só quando a espera passou de `atraso` — e, tendo passado, continua
 * verdadeiro por ao menos `piso`.
 *
 * O limiar existe porque um indicador que relampeia por 120ms se lê como defeito
 * de render, não como carregamento: o aviso é que cria a percepção de lentidão,
 * não a espera. O piso existe porque um indicador que aparece e some em 80ms
 * tremula. Os dois juntos são a diferença entre "está trabalhando" e "está
 * quebrado".
 *
 * Serve para portão condicional (`if (loading)`). Fallback de Suspense não passa
 * por hook — lá o limiar mora no próprio fallback (`AparecerSeDemorar`).
 */
export function useEsperaLonga(ativo: boolean, atraso = 300, piso = 400) {
  const [visivel, setVisivel] = useState(false);
  const mostradoEm = useRef<number | null>(null);

  useEffect(() => {
    if (ativo) {
      if (visivel) return;
      const t = setTimeout(() => {
        mostradoEm.current = Date.now();
        setVisivel(true);
      }, atraso);
      return () => clearTimeout(t);
    }

    if (!visivel) return;
    const resta = Math.max(0, piso - (Date.now() - (mostradoEm.current ?? 0)));
    const t = setTimeout(() => {
      mostradoEm.current = null;
      setVisivel(false);
    }, resta);
    return () => clearTimeout(t);
  }, [ativo, atraso, piso, visivel]);

  return visivel;
}
