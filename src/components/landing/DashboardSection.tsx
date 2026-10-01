import { useLayoutEffect, useRef, useState } from "react";
import { DashboardMock } from "./DashboardMock";
import { Fade } from "./Fade";
import { gsap } from "./useLandingMotion";

const PERGUNTAS = [
  { q: "Quanto eu tenho?", a: "O saldo de todas as contas que você cadastrou, somado num número só." },
  { q: "Quanto me devem?", a: "O que as pessoas ainda vão te devolver neste mês, pessoa por pessoa." },
  { q: "Quanto sobra no mês?", a: "O saldo de hoje mais o que entra, menos as contas e as faturas que ainda vencem." },
];

export function DashboardSection() {
  // Celular: a pergunta escolhida realça o número dela na tela.
  const [q, setQ] = useState<0 | 1 | 2>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const mockRef = useRef<HTMLDivElement>(null);

  // Desktop: o mockup cresce com o scroll. Celular: só entra com fade.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const mock = mockRef.current;
    if (!section || !mock) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        mock,
        { scale: 0.7, transformOrigin: "50% 20%" },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top bottom", end: "center 55%", scrub: 1.2 },
        },
      );
    });
    mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.from(mock, {
        opacity: 0,
        duration: 0.9,
        ease: "power2.out",
        scrollTrigger: { trigger: mock, start: "top 85%", once: true },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="dashboard"
      data-lp-theme="light"
      className="py-24 lg:py-40"
    >
      <div className="lp-wrap grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="max-w-[520px]">
          <Fade>
            <h2 className="lp-h2">Um dashboard que responde as perguntas certas.</h2>
          </Fade>
          {/* Celular: as três perguntas viram abas; a escolhida acende o
              número dela na tela e mostra a resposta. */}
          <Fade className="mt-8 lg:hidden">
            <div role="tablist" aria-label="Perguntas" className="grid grid-cols-3 gap-2">
              {PERGUNTAS.map((p, i) => (
                <button
                  key={p.q}
                  type="button"
                  role="tab"
                  aria-selected={q === i}
                  onClick={() => setQ(i as 0 | 1 | 2)}
                  className={`lp-chip min-h-[56px] justify-center px-2 text-center text-[13px] leading-tight ${q === i ? "is-on" : ""}`}
                >
                  {p.q}
                </button>
              ))}
            </div>
            <p key={q} aria-live="polite" className="lp-swap mt-4 min-h-[3lh] text-[16px] leading-relaxed text-lp-muted">
              {PERGUNTAS[q].a}
            </p>
          </Fade>

          <dl className="mt-10 hidden lg:mt-14 lg:block">
            {PERGUNTAS.map((p, i) => (
              <Fade key={p.q} delay={i * 0.06} className={i > 0 ? "mt-7" : ""}>
                <dt className="lp-h3">{p.q}</dt>
                <dd className="mt-1.5 text-[16px] leading-relaxed text-lp-muted">{p.a}</dd>
              </Fade>
            ))}
          </dl>
        </div>

        <div className="-mx-5 -mt-4 flex justify-center sm:mx-0 lg:mt-0">
          <div ref={mockRef} data-lp-fade className="w-full max-w-[400px]">
            <div className="lg:hidden"><DashboardMock focus={q} /></div>
            <div className="hidden lg:block"><DashboardMock /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
