import { forwardRef, type SVGProps } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   O monograma do Hedge: H e D encaixados. Desenho geométrico, não traçado:
   toda diagonal a 30°, toda haste com 236 de espessura, todo vão com 96 e o
   bojo do D é um arco de círculo tangente às duas retas. As duas peças
   ficam separadas para poderem se mover (o rodapé as monta com o scroll).
   public/hedge-mark.svg é a versão pequena (vãos mais largos) para a aba.
   ═══════════════════════════════════════════════════════════════════════ */

export const MARK_VIEWBOX = "200 20 950.31 1216.25";
/** Proporção largura/altura do monograma. */
export const MARK_RATIO = 0.7813;
export const MARK_H = "M200 20L436 156.25L436 539.62L768 731.3L768 1100L532 1236.25L532 867.55L436 812.12L436 1036.25L200 900Z";
export const MARK_D = "M532 211.68L1015.81 491.01A269 269 0 0 1 1015.81 956.93L864 1044.57L864 675.87L532 484.19Z";

type Props = SVGProps<SVGSVGElement> & { title?: string };

export const HedgeMark = forwardRef<SVGSVGElement, Props>(function HedgeMark({ title, ...props }, ref) {
  return (
    <svg
      ref={ref}
      viewBox={MARK_VIEWBOX}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      <path className="lp-mark-h" d={MARK_H} />
      <path className="lp-mark-d" d={MARK_D} />
    </svg>
  );
});

/** Monograma + nome, para a barra do topo e o login. Com `accent`, o
    monograma usa --lp-logo (laranja, branco no tema laranja). */
export function HedgeLogo({ className = "", accent = false }: { className?: string; accent?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <HedgeMark className="h-[22px] w-auto shrink-0" style={accent ? { color: "var(--lp-logo)" } : undefined} />
      <span className="lp-logo-name">Hedge</span>
    </span>
  );
}
