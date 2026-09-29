import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion-prefs";

/**
 * Faz um número contar até o novo valor em vez de trocar de uma vez.
 * Escreve direto no elemento (sem re-render por quadro) e parte do valor que
 * está na tela, então uma contagem interrompida emenda na próxima sem salto.
 */
export function useCountUp<T extends HTMLElement>(value: number, format: (v: number) => string, ms = 1400) {
  const ref = useRef<T>(null);
  const shown = useRef(value);
  const raf = useRef(0);
  const fmt = useRef(format);
  fmt.current = format;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    const from = shown.current;
    if (prefersReducedMotion() || from === value) {
      shown.current = value;
      el.textContent = fmt.current(value);
      return;
    }
    const start = performance.now();
    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - p, 4); // ease-out quártico: arranca e pousa macio
      shown.current = from + (value - from) * e;
      el.textContent = fmt.current(shown.current);
      if (p < 1) raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  }, [value, ms]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /** Valor inicial a renderizar; depois disso o hook assume o texto. */
  return { ref, initial: fmt.current(shown.current) };
}
