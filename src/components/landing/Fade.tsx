import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { gsap } from "./useLandingMotion";

/**
 * Entra com fade + 12px ao chegar a 85% da tela, uma vez só.
 * Sem JS ou com movimento reduzido, o conteúdo já está visível.
 */
export function Fade({
  children,
  className = "",
  delay = 0,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(el, {
        opacity: 0,
        y: 16,
        duration: 1.2,
        delay,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    });
    return () => mm.revert();
  }, [delay]);

  return (
    <div ref={ref} data-lp-fade className={className} style={style}>
      {children}
    </div>
  );
}
