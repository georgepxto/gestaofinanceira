import { useLayoutEffect, useRef, type ComponentType } from "react";
import { gsap } from "./useLandingMotion";

/** `pos`: enquadramento (object-position), para manter o assunto à vista. */
export type Photo = { src: string; w: number; h: number; alt: string; pos?: string };

/* ═══════════════════════════════════════════════════════════════════════
   Foto + tela: a cena onde o gasto nasce, em preto e branco, e por cima a
   tela do app que resolve. A foto se move mais devagar que a tela (leve
   profundidade) e ganha cor ao passar o mouse; no toque, quando o bloco
   está no meio da tela (.is-center, posto por Features).
   ═══════════════════════════════════════════════════════════════════════ */
export function FeatureVisual({ photo, Crop, wide = false }: { photo: Photo; Crop: ComponentType; wide?: boolean }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const img = imgRef.current;
    const screen = screenRef.current;
    if (!img || !screen) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const st = { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: 1.2 };
      gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: "none", scrollTrigger: st });
      gsap.fromTo(screen, { y: 40 }, { y: -40, ease: "none", scrollTrigger: { ...st, trigger: screen } });
    });
    return () => mm.revert();
  }, []);

  return (
    <div className={`lp-feat relative ${wide ? "" : "lg:h-[640px]"}`}>
      <div
        className={`relative overflow-hidden sm:rounded ${
          wide ? "aspect-[2/1] sm:aspect-[4/3] lg:aspect-[16/9]" : "aspect-[2/1] sm:aspect-[4/3] lg:absolute lg:left-0 lg:top-0 lg:aspect-auto lg:h-[78%] lg:w-[64%]"
        }`}
      >
        <img
          ref={imgRef}
          src={photo.src}
          width={photo.w}
          height={photo.h}
          alt={photo.alt}
          loading="lazy"
          decoding="async"
          className="lp-photo absolute inset-x-0 top-[-8%] h-[116%] w-full object-cover will-change-transform"
          style={photo.pos ? { objectPosition: photo.pos } : undefined}
        />
      </div>
      <div
        ref={screenRef}
        className={`lp-feat-screen relative z-10 mx-4 -mt-10 will-change-transform sm:mx-6 sm:-mt-16 ${
          wide ? "lg:mx-10 lg:-mt-24" : "lg:absolute lg:bottom-0 lg:right-0 lg:mx-0 lg:mt-0 lg:w-[58%] lg:max-w-[380px]"
        }`}
      >
        <Crop />
      </div>
    </div>
  );
}
