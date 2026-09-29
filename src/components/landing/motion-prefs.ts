/* Fica fora de useLandingMotion para que o hero (no chunk de entrada) não
   arraste GSAP, ScrollTrigger e Lenis junto. */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* O Lenis ativo (só em ponteiro fino). Quem precisa mover a página por
   script, como a barra de rolagem, passa por ele para não brigar com a inércia. */
type Scroller = { scrollTo: (y: number, o?: { immediate?: boolean; lerp?: number }) => void };
let active: Scroller | null = null;
export const setActiveLenis = (l: Scroller | null) => { active = l; };
/** Leva a página até `y`. Com o Lenis, desliza (lerp) em vez de saltar:
    arrastar a barra de rolagem fica contínuo mesmo numa página longa. */
export const scrollPageTo = (y: number) => {
  if (active) active.scrollTo(y, { lerp: 0.18 });
  else window.scrollTo({ top: y, behavior: "auto" });
};
