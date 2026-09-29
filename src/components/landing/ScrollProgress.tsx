import { useEffect, useRef } from "react";
import { scrollPageTo } from "./motion-prefs";

/**
 * A barra de rolagem da landing, desenhada como uma barra de carregamento:
 * o trilho usa a cor de linha do tema ativo e o preenchimento laranja cresce
 * de cima para baixo com o scroll (e recua ao voltar).
 *
 * Substitui a barra nativa, então precisa continuar operável: clicar no
 * trilho leva àquele ponto da página e arrastar rola junto.
 */
export function ScrollProgress() {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("lp-no-scrollbar");

    const fill = fillRef.current;
    const track = trackRef.current;
    if (!fill || !track) return;

    const max = () => Math.max(1, html.scrollHeight - window.innerHeight);
    let raf = 0;
    let shown = -1;
    // O preenchimento persegue a posição real com uma fração por quadro, então
    // desliza até ela em vez de saltar, mesmo no scroll nativo do toque.
    const paint = () => {
      raf = 0;
      const target = Math.min(1, Math.max(0, window.scrollY / max()));
      shown = shown < 0 ? target : shown + (target - shown) * 0.2;
      if (Math.abs(target - shown) < 0.0005) shown = target;
      fill.style.transform = `scaleY(${shown.toFixed(4)})`;
      track.setAttribute("aria-valuenow", String(Math.round(target * 100)));
      if (shown !== target) raf = requestAnimationFrame(paint);
    };
    // Antes de a parte de baixo carregar, a página é curta e a barra encheria
    // rápido demais para depois recuar de uma vez. Ela só aparece quando a
    // página já tem a altura de verdade.
    const reveal = () => {
      if (html.scrollHeight > window.innerHeight * 3) track.classList.add("is-ready");
    };
    const onScroll = () => { reveal(); if (!raf) raf = requestAnimationFrame(paint); };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // A altura da página muda quando o resto da landing carrega.
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);

    // Clique e arraste no trilho.
    let dragging = false;
    const scrollToPointer = (clientY: number) => {
      const r = track.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      scrollPageTo(p * max());
    };
    const onDown = (e: PointerEvent) => {
      dragging = true;
      track.setPointerCapture(e.pointerId);
      scrollToPointer(e.clientY);
    };
    const onMove = (e: PointerEvent) => { if (dragging) scrollToPointer(e.clientY); };
    const onUp = () => { dragging = false; };
    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);

    return () => {
      html.classList.remove("lp-no-scrollbar");
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", onUp);
      track.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      role="progressbar"
      aria-label="Quanto da página já foi lido"
      aria-valuemin={0}
      aria-valuemax={100}
      className="lp-progress"
    >
      <div className="lp-progress-rail" aria-hidden="true">
        <div ref={fillRef} className="lp-progress-fill" />
      </div>
    </div>
  );
}
