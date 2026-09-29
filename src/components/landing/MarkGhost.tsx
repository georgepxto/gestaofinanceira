import { useId, useLayoutEffect, useRef } from "react";
import { MARK_D, MARK_H, MARK_VIEWBOX } from "./HedgeMark";
import { gsap } from "./useLandingMotion";

/**
 * O monograma em escala de cenário: só o contorno, fino e apagado, atrás do
 * card do hero e do login. Na entrada o traço se desenha (H primeiro, depois
 * o D). Substitui a grade de fundo: o que está atrás do produto é a marca.
 * Posição e tamanho vêm de quem usa (className).
 */
export function MarkGhost({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      aria-hidden="true"
      focusable="false"
      className={`lp-ghost pointer-events-none absolute w-auto ${className}`}
    >
      <path d={MARK_H} pathLength={1} />
      <path d={MARK_D} pathLength={1} />
    </svg>
  );
}

/* O viewBox em números, para a conta do enchimento. */
const [, VB_Y, , VB_H] = MARK_VIEWBOX.split(" ").map(Number);

/**
 * O monograma como fundo da última tela: grande, em traço laranja apagado,
 * com o formulário por cima. A ponta de cima aparece inteira; a base sai
 * cortada pela borda de baixo da seção. Com o scroll, o laranja enche o desenho de baixo
 * para cima; cheio quando a página chega ao fim. Sem movimento, já cheio.
 */
export function MarkBackdrop({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const fillRef = useRef<SVGRectElement>(null);
  const clipId = useId();

  useLayoutEffect(() => {
    const svg = ref.current;
    const fill = fillRef.current;
    const section = svg?.closest("section");
    if (!svg || !fill || !section) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(fill, { attr: { y: VB_Y + VB_H } }, {
        attr: { y: VB_Y },
        ease: "none",
        // A base do desenho passa da seção: a conta usa a própria seção.
        scrollTrigger: { trigger: section, start: "top 80%", end: "bottom bottom", scrub: 1 },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <svg
      ref={ref}
      viewBox={MARK_VIEWBOX}
      aria-hidden="true"
      focusable="false"
      className={`lp-backdrop pointer-events-none absolute h-auto ${className}`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect ref={fillRef} x="0" y={VB_Y} width="2000" height="2000" />
        </clipPath>
      </defs>
      <g className="lp-backdrop-fill" clipPath={`url(#${clipId})`}>
        <path d={MARK_H} />
        <path d={MARK_D} />
      </g>
      <path d={MARK_H} />
      <path d={MARK_D} />
    </svg>
  );
}
