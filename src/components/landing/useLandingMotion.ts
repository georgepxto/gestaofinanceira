import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { prefersReducedMotion, setActiveLenis } from "./motion-prefs";

gsap.registerPlugin(ScrollTrigger);
// No celular a barra de endereço some e volta ao rolar, mudando a altura da
// tela; sem isto cada mudança recalcula os gatilhos e a página dá um tranco.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };

export type LpTheme = "dark" | "light" | "acc";

const THEME_BG: Record<LpTheme, string> = { dark: "#0B0B0C", light: "#F2F2F0", acc: "#F25F2A" };

export { prefersReducedMotion };

/**
 * Movimento da página inteira:
 *  - Lenis só em ponteiro fino (no toque, o scroll nativo é melhor que qualquer inércia);
 *  - troca de tema por seção: cada <section data-lp-theme> vira o tema ativo
 *    quando cruza o meio da tela, e o meta theme-color acompanha;
 *  - âncoras internas passam pelo Lenis quando ele existe.
 * Tudo o que é criado aqui é desfeito no unmount.
 */
export function useLandingMotion(rootRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const html = document.documentElement;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prevMeta = meta?.getAttribute("content") ?? null;
    const prevHtmlBg = html.style.backgroundColor;

    const apply = (t: LpTheme) => {
      if (root.dataset.theme === t) return;
      root.dataset.theme = t;
      meta?.setAttribute("content", THEME_BG[t]);
      html.style.backgroundColor = THEME_BG[t];
    };
    root.dataset.theme = "";
    apply("dark");

    const reduced = prefersReducedMotion();
    const fine = window.matchMedia("(pointer: fine)").matches;

    let lenis: Lenis | null = null;
    let raf: ((time: number) => void) | null = null;
    if (fine && !reduced) {
      // lerp em vez de duração fixa: cada quadro anda uma fração do que falta,
      // então o scroll desacelera continuamente, sem "degrau" no fim.
      lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, smoothWheel: true });
      raf = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      lenis.on("scroll", ScrollTrigger.update);
      setActiveLenis(lenis);
    }

    const ctx = gsap.context(() => {
      const sections = [...root.querySelectorAll<HTMLElement>("[data-lp-theme]")];
      sections.forEach((el, i) => {
        const theme = el.dataset.lpTheme as LpTheme;
        const next = sections[i + 1]?.dataset.lpTheme as LpTheme | undefined;
        // O laranja é uma seção de impacto e não pode vazar: ele sai assim
        // que a próxima seção aparece pela base da tela (e não quando ela
        // chega ao meio), entregando o tema para ela na hora.
        const acc = theme === "acc";
        ScrollTrigger.create({
          trigger: el,
          start: "top 50%",
          end: acc ? "bottom 88%" : "bottom 50%",
          onToggle: (self) => {
            if (!self.isActive) return;
            apply(theme);
            // Depois de acesa, a seção laranja pinta o próprio fundo: quando a
            // página volta ao escuro, ela termina com borda limpa, sem vazar.
            if (acc) el.classList.add("is-lit");
          },
          onLeave: () => { if (acc && next) apply(next); },
          onLeaveBack: () => { if (acc) el.classList.remove("is-lit"); },
        });
      });
    }, root);

    const onAnchor = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='#']");
      if (!a || !root.contains(a)) return;
      const id = a.getAttribute("href")!.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, {
          offset: -64,
          duration: 1.6,
          easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
        });
      } else {
        target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      }
      history.replaceState(null, "", `#${id}`);
    };
    root.addEventListener("click", onAnchor);

    // As fontes mudam a altura das seções; os gatilhos precisam medir de novo.
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) ScrollTrigger.refresh(); });

    return () => {
      alive = false;
      root.removeEventListener("click", onAnchor);
      ctx.revert();
      if (raf) { gsap.ticker.remove(raf); gsap.ticker.lagSmoothing(500, 33); }
      setActiveLenis(null);
      lenis?.destroy();
      if (prevMeta !== null) meta?.setAttribute("content", prevMeta);
      html.style.backgroundColor = prevHtmlBg;
    };
  }, [rootRef]);
}
