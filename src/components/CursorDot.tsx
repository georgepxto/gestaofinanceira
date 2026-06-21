import { useEffect, useRef } from "react";
import gsap from "gsap";

/* ══════════════════════════════════════
   CURSOR — a bolinha substitui o cursor nativo.
   Elementos com data-cursor definem a cor da seção; links/botões a ampliam.
   ══════════════════════════════════════ */
export const CursorDot = () => {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    const dot = dotRef.current;
    if (!dot) return;

    const xTo = gsap.quickTo(dot, "x", { duration: 0.18, ease: "power3.out" });
    const yTo = gsap.quickTo(dot, "y", { duration: 0.18, ease: "power3.out" });
    let color = "#10b981";
    let pressed = false;
    let hoverScale = 1;

    const applyScale = () => {
      gsap.to(dot, { scale: pressed ? 0.7 : hoverScale, duration: 0.22, ease: "power3.out", overwrite: "auto" });
    };

    /* Sobe a árvore até achar um background opaco e devolve branco ou
       quase-preto conforme a luminância — a bolinha nunca some sobre botões */
    const contrastFor = (el: HTMLElement | null): string | null => {
      let node = el;
      while (node) {
        const m = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
        if (m && m.length >= 3 && (m.length < 4 || parseFloat(m[3]) > 0.1)) {
          const lum = 0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2];
          return lum < 140 ? "#ffffff" : "#18181b";
        }
        node = node.parentElement;
      }
      return null;
    };

    let lastInteractive: HTMLElement | null = null;
    let interactiveColor: string | null = null;

    const onMove = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      dot.style.opacity = "1";
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const interactive = t.closest<HTMLElement>("a, button");
      if (interactive !== lastInteractive) {
        lastInteractive = interactive;
        interactiveColor = interactive ? contrastFor(interactive) : null;
      }
      const next = interactiveColor
        ?? t.closest<HTMLElement>("[data-cursor]")?.dataset.cursor
        ?? "#10b981";
      if (next !== color) {
        color = next;
        dot.style.backgroundColor = color;
      }
      const nextScale = interactive ? 2.4 : 1;
      if (nextScale !== hoverScale) {
        hoverScale = nextScale;
        applyScale();
      }
    };
    const onLeave = () => { dot.style.opacity = "0"; };
    const onDown = () => { pressed = true; applyScale(); };
    const onUp = () => { pressed = false; applyScale(); };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(dot);
    };
  }, []);

  return (
    <div
      ref={dotRef}
      className="fixed top-0 left-0 w-3 h-3 -ml-1.5 -mt-1.5 rounded-full pointer-events-none z-[100]"
      aria-hidden="true"
      style={{
        opacity: 0,
        backgroundColor: "#10b981",
        transition: "opacity 0.25s, background-color 0.35s",
        boxShadow: "0 0 20px 6px rgba(16,185,129,0.14)",
      } as React.CSSProperties}
    />
  );
};
