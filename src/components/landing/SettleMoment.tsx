import { useLayoutEffect, useRef } from "react";
import { Check } from "lucide-react";
import { Fade } from "./Fade";
import { PhoneInHand } from "./PhoneInHand";
import { brl } from "./format";
import { gsap } from "./useLandingMotion";

/* ═══════════════════════════════════════════════════════════════════════
   A quebra de expectativa da página: a luz vira laranja e o texto vira a
   própria conta que o Hedge faz. Os acertos do Apê 302 são as parcelas de
   uma soma; o número gigante é o resultado dela. Com o scroll, as linhas
   entram uma a uma, o traço da soma se desenha e o total conta até o valor.
   Mesmos dados do bloco de gastos compartilhados.

   Texto branco sobre o laranja, em corpo grande (24 px ou mais, o branco
   passa só como texto grande). Destaque em tinta escura (--lp-ink): o
   resultado da conta e os nomes de quem deve e de quem pagou.
   ═══════════════════════════════════════════════════════════════════════ */

/* `name` é a pessoa da linha: vai na tinta de destaque. */
type Line = { pre: string; name: string; post: string; what: string; op: "+" | "−" | null; v: number };
const LINES: Line[] = [
  { pre: "", name: "Ana", post: " te deve", what: "o aluguel", op: "+", v: 1050 },
  { pre: "Você deve à ", name: "Ana", post: "", what: "o mercado", op: "−", v: 137.6 },
  { pre: "", name: "Bruno", post: " já pagou", what: "o aluguel", op: null, v: 1050 },
];
const NET = 1050 - 137.6;

export function SettleMoment() {
  const sumRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const sum = sumRef.current;
    const num = numRef.current;
    if (!sum || !num) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(sum);
      const tl = gsap.timeline({
        scrollTrigger: { trigger: sum, start: "top 85%", end: "bottom 95%", scrub: 1.2 },
      });
      // as parcelas entram uma a uma, da esquerda
      tl.fromTo(q(".sm-line"), { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.35, ease: "power2.out" }, 0);
      // o traço da soma se desenha
      tl.fromTo(q(".sm-rule"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power2.inOut" }, 1.1);
      // e o total conta até o valor
      tl.fromTo(q(".sm-total"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 1.4);
      const o = { v: 0 };
      tl.fromTo(o, { v: 0 }, {
        v: NET, duration: 0.9, ease: "power2.out",
        onUpdate: () => { num.textContent = `+${brl(o.v)}`; },
      }, 1.45);

      // O celular sobe um pouco mais devagar que a página: profundidade leve.
      if (phoneRef.current) {
        gsap.fromTo(phoneRef.current, { y: 50, force3D: true }, {
          y: -50,
          force3D: true,
          ease: "none",
          scrollTrigger: { trigger: phoneRef.current, start: "top bottom", end: "bottom top", scrub: 1.2 },
        });
      }
      return () => { num.textContent = `+${brl(NET)}`; };
    });
    return () => mm.revert();
  }, []);

  return (
    <section id="acerto" data-lp-theme="acc" className="overflow-hidden pb-10 pt-24 lg:pb-16 lg:pt-40">
      <div className="lp-wrap grid items-center gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        <div>
          <Fade>
            <h2 className="lp-h2 max-w-[18ch]">Ninguém precisa lembrar quem pagou o quê.</h2>
          </Fade>

          {/* A conta: parcelas, traço, resultado */}
          <div ref={sumRef} className="mt-12 max-w-[620px] lg:mt-16">
            <ul>
              {LINES.map((l) => (
                <li key={l.pre + l.name + l.post} className="sm-line grid grid-cols-1 items-baseline gap-x-6 gap-y-1 py-3 sm:grid-cols-[1fr_auto]">
                  <span className="text-[24px] leading-snug">
                    {l.pre}<span className="text-lp-ink">{l.name}</span>{l.post} <span className="whitespace-nowrap">{l.what}</span>
                  </span>
                  {l.op ? (
                    <span className="lp-num whitespace-nowrap text-[24px]">
                      <span className="mr-3 inline-block w-[0.6em] text-center">{l.op}</span>
                      {brl(l.v)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[24px]">
                      <Check className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                      quitado
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <div className="sm-rule mt-4 h-[2px] origin-left bg-lp-fg" aria-hidden="true" />

            <div className="sm-total mt-6">
              <div className="text-[24px] leading-snug">Você recebe</div>
              <span className="sr-only">Mais {brl(NET)}</span>
              <span ref={numRef} aria-hidden="true" className="lp-num lp-giant mt-1 block text-lp-ink">
                +{brl(NET)}
              </span>
            </div>

            <p className="mt-8 max-w-[26ch] text-[24px] leading-snug">
              O Hedge refaz essa conta a cada gasto lançado no grupo.
            </p>
          </div>
        </div>

        {/* A mesma conta, na mão de alguém */}
        {/* A foto tem margem transparente em volta da mão: o bloco é maior que
            a coluna e transborda sem caixa visível. No desktop ele cresce para
            a direita, para o braço não entrar na coluna do texto. */}
        <div className="relative">
          <div ref={phoneRef} className="relative -mx-[22%] -mb-[18%] will-change-transform lg:-ml-[5%] lg:-mr-[40%] lg:mb-0">
            <PhoneInHand />
          </div>
        </div>
      </div>
    </section>
  );
}
