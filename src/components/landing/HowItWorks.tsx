import { useLayoutEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Bus, Check, Home, Plus, ShoppingBasket, Users, UtensilsCrossed } from "lucide-react";
import { Fade } from "./Fade";
import { brl, signed } from "./format";
import { HedgeLogo } from "./HedgeMark";
import { ScrollTrigger, gsap } from "./useLandingMotion";

/* ═══════════════════════════════════════════════════════════════════════
   Como funciona: os três passos contados por uma tela do app. A seção fica
   parada enquanto o scroll avança os passos; cada passo é um estado da tela:
     1. cadastro: nome, email e senha se preenchem, conta criada;
     2. lançamentos: três gastos digitados, cada um vai para a lista;
     3. padrão: a lista vira o mês por categoria, com a observação.
   Sem movimento (reduced motion), a tela fica no passo 3, completa.
   ═══════════════════════════════════════════════════════════════════════ */

const STEPS = [
  { t: "Cadastre-se", d: "Com email ou Google, em menos de um minuto. Não pede cartão." },
  { t: "Lance o que já aconteceu", d: "Valor, o que foi e a categoria. Cada gasto entra no mês na hora." },
  { t: "Veja o padrão aparecer", d: "Com alguns lançamentos, o mês mostra para onde o dinheiro vai." },
];

type Launch = { desc: string; valor: string; v: number; cat: string; Icon: LucideIcon };
const LAUNCHES: Launch[] = [
  { desc: "iFood", valor: "34,90", v: -34.9, cat: "Alimentação", Icon: UtensilsCrossed },
  { desc: "Uber", valor: "18,70", v: -18.7, cat: "Transporte", Icon: Bus },
  { desc: "Mercado", valor: "212,40", v: -212.4, cat: "Mercado", Icon: ShoppingBasket },
];
const CHIPS = ["Alimentação", "Transporte", "Mercado"];

/* Mesmo mês da tela de Gastos: R$ 1.284,30. */
const CATS = [
  { c: "Alimentação", v: 486.2 },
  { c: "Mercado", v: 402.5 },
  { c: "Lazer", v: 225 },
  { c: "Outros", v: 170.6 },
];
const TOTAL = CATS.reduce((a, c) => a + c.v, 0);

/* A seção é sempre escura; o GSAP precisa das cores resolvidas para interpolar. */
const FG = "#F2F2F0";
const MUTED = "#9A9A97";
const LINE = "#34343A"; // borda do chip apagado, um tom acima da linha para ler sobre a tela

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // null = sem animação: todos os passos acesos.
  const [active, setActive] = useState<number | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const mm = gsap.matchMedia();
    mm.add(
      { desktop: "(min-width: 1024px)", motion: "(prefers-reduced-motion: no-preference)" },
      (ctx) => {
        const { desktop, motion } = ctx.conditions as { desktop: boolean; motion: boolean };
        if (!motion) return;
        const q = gsap.utils.selector(stage);
        const one = (sel: string) => q(sel)[0] as HTMLElement;

        const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
        const slice = (text: string, p: number) => text.slice(0, Math.round(clamp01(p) * text.length));
        /** Leve afundada de botão entre `a` e `a + 0.16`. */
        const press = (t: number, a: number) => (t > a && t < a + 0.16 ? 1 - 0.04 * Math.sin((Math.PI * (t - a)) / 0.16) : 1);

        /** Um trecho da linha que só chama `render(t)` com o tempo local.
            O estado da tela vem inteiro de `t`, então ir e voltar dá sempre
            o mesmo resultado (nada de tweens brigando pelo mesmo campo). */
        const drive = (tl: gsap.core.Timeline, at: number, dur: number, render: (t: number) => void) => {
          const o = { t: 0 };
          tl.fromTo(o, { t: 0 }, { t: dur, duration: dur, ease: "none", onUpdate: () => render(o.t) }, at);
          render(0);
        };

        const tl = gsap.timeline();
        const states = [one(".hw-s1"), one(".hw-s2"), one(".hw-s3")];
        gsap.set(states, { autoAlpha: 0, y: 12 });
        gsap.set(states[0], { autoAlpha: 1, y: 0 });

        /* ── Passo 1: cadastro ─────────────────────────────── */
        const nome = one(".hw-nome");
        const email = one(".hw-email");
        const senha = one(".hw-senha");
        const btn1 = one(".hw-s1 .hw-btn");
        const ok = one(".hw-ok");
        const T1 = 2.1;
        drive(tl, 0, T1, (t) => {
          nome.textContent = slice("Ana", (t - 0.1) / 0.25);
          email.textContent = slice("ana@email.com", (t - 0.4) / 0.5);
          senha.textContent = slice("••••••••", (t - 0.95) / 0.35);
          btn1.style.transform = `scale(${press(t, 1.4)})`;
          const k = clamp01((t - 1.55) / 0.3);
          ok.style.opacity = String(k);
          ok.style.transform = `translateY(${(1 - k) * 8}px)`;
        });

        /* ── Passo 2: três lançamentos ─────────────────────── */
        tl.to(states[0], { autoAlpha: 0, y: -12, duration: 0.3 }, T1);
        tl.fromTo(states[1], { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.3 }, T1 + 0.15);
        const valor = one(".hw-valor");
        const desc = one(".hw-desc");
        const chips = q(".hw-chip");
        const rows = q(".hw-row");
        const btn2 = one(".hw-s2 .hw-btn");
        const STEP = 1.05;
        const T2 = T1 + 0.5 + LAUNCHES.length * STEP + 0.2;
        drive(tl, T1 + 0.5, T2 - (T1 + 0.5), (t) => {
          // qual lançamento está sendo digitado e quanto dele já foi
          const i = Math.min(LAUNCHES.length - 1, Math.floor(t / STEP));
          const local = t - i * STEP;
          const last = i === LAUNCHES.length - 1;
          const cleared = !last && local >= 0.95;
          const l = LAUNCHES[i];
          valor.textContent = cleared ? "" : slice(l.valor, local / 0.25);
          desc.textContent = cleared ? "" : slice(l.desc, (local - 0.28) / 0.2);
          const lit = local >= 0.52 && !cleared ? CHIPS.indexOf(l.cat) : -1;
          chips.forEach((c, j) => {
            c.style.color = j === lit ? FG : MUTED;
            c.style.borderColor = j === lit ? FG : LINE;
          });
          btn2.style.transform = `scale(${press(local, 0.7)})`;
          rows.forEach((r, j) => {
            const k = clamp01((t - (j * STEP + 0.78)) / 0.22);
            r.style.opacity = String(k);
            r.style.transform = `translateY(${(1 - k) * -8}px)`;
          });
        });

        /* ── Passo 3: o padrão ─────────────────────────────── */
        tl.to(states[1], { autoAlpha: 0, y: -12, duration: 0.3 }, T2);
        tl.fromTo(states[2], { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.3 }, T2 + 0.15);
        const bars = q(".hw-bar");
        const nums = q(".hw-num");
        CATS.forEach((c, i) => {
          const at = T2 + 0.4 + i * 0.15;
          tl.fromTo(bars[i], { scaleX: 0 }, { scaleX: c.v / CATS[0].v, duration: 0.7, ease: "power2.out" }, at);
          const o = { v: 0 };
          tl.fromTo(o, { v: 0 }, {
            v: c.v, duration: 0.7, ease: "power2.out",
            onUpdate: () => { nums[i].textContent = brl(o.v); },
          }, at);
        });
        tl.fromTo(one(".hw-insight"), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35 }, T2 + 1.3);
        tl.to({}, { duration: 0.5 }); // respiro com tudo no lugar
        const END = tl.duration();

        // Linha de progresso de cada passo, na lista à esquerda.
        const segs = [[0, T1], [T1, T2], [T2, END]];
        section.querySelectorAll<HTMLElement>(".hw-fill").forEach((f, i) => {
          tl.fromTo(f, { scaleX: 0 }, { scaleX: 1, duration: segs[i][1] - segs[i][0], ease: "none" }, segs[i][0]);
        });

        // O passo ativo acompanha o tempo da linha: realça a lista e a legenda.
        const stepOf = (t: number) => (t < T1 ? 0 : t < T2 ? 1 : 2);
        setActive(0);

        ScrollTrigger.create({
          animation: tl,
          trigger: desktop ? section : stage,
          pin: desktop ? section : stage,
          start: desktop ? "top top" : "top 72px",
          end: desktop ? "+=260%" : "+=180%",
          scrub: 1.2,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => setActive(stepOf(self.progress * END)),
        });

        return () => {
          // Volta ao estado estático (o passo 3 completo) se a animação sair.
          setActive(null);
          nome.textContent = "Ana";
          email.textContent = "ana@email.com";
          senha.textContent = "••••••••";
          valor.textContent = LAUNCHES[LAUNCHES.length - 1].valor;
          desc.textContent = LAUNCHES[LAUNCHES.length - 1].desc;
          [btn1, btn2, ok, ...chips, ...rows].forEach((el) => el.removeAttribute("style"));
          nums.forEach((n, i) => { n.textContent = brl(CATS[i].v); });
        };
      },
    );
    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} id="como-funciona" data-lp-theme="dark" className="py-24 lg:flex lg:min-h-[100svh] lg:items-center lg:py-16">
      <div className="lp-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
        <div>
          <Fade>
            <h2 className="lp-h2">Como funciona</h2>
          </Fade>
          {/* Lista dos passos: acende conforme a tela avança. */}
          <ol className="mt-10 lg:mt-14">
            {STEPS.map((s, i) => (
              <li key={s.t} className={i > 0 ? "mt-8" : ""} aria-current={active === i ? "step" : undefined}>
                <div className={`hw-step flex gap-5 ${active === null || active === i ? "is-on" : ""}`}>
                  <span className="lp-num pt-[3px] text-[13px]">{i + 1}</span>
                  <div className="flex-1">
                    <h3 className="lp-h3">{s.t}</h3>
                    <p className="mt-1.5 max-w-[38ch] text-[16px] leading-relaxed">{s.d}</p>
                    <div className="mt-4 hidden h-px overflow-hidden bg-lp-line lg:block" aria-hidden="true">
                      <div className="hw-fill h-full origin-left bg-lp-fg" />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div ref={stageRef} className="mx-auto w-full max-w-[380px]">
          {/* No celular a lista fica acima; aqui, o passo atual junto da tela. */}
          <div className="mb-5 flex items-baseline gap-3 lg:hidden" aria-hidden="true">
            <span className="text-[13px] text-lp-muted"><span className="lp-num">{(active ?? 2) + 1}</span> de <span className="lp-num">3</span></span>
            <span key={active ?? 2} className="lp-swap text-[15px]">{STEPS[active ?? 2].t}</span>
          </div>

          <div
            role="img"
            aria-label="Uma tela do Hedge: criar a conta, lançar três gastos (iFood, Uber e mercado) e ver o mês dividido por categoria, com Alimentação em 38% dos gastos."
            className="relative flex h-[max(560px,min(640px,calc(100svh-150px)))] flex-col overflow-hidden bg-lp-surface sm:h-[540px] sm:rounded"
          >
            {/* Celular: a tela presa ocupa a altura do aparelho e ganha a
                barra de abas do app embaixo, como um app aberto. */}
            <div aria-hidden="true" className="relative min-h-0 flex-1">
              {/* Estado 1: cadastro */}
              <div className="hw-s1 invisible absolute inset-0 px-6 pt-7 opacity-0">
                <HedgeLogo className="text-[15px] font-medium" />
                <div className="lp-h3 mt-8">Criar conta</div>
                {[
                  { l: "Nome", c: "hw-nome", v: "Ana" },
                  { l: "Email", c: "hw-email", v: "ana@email.com" },
                  { l: "Senha", c: "hw-senha", v: "••••••••" },
                ].map((f) => (
                  <div key={f.l} className="mt-6">
                    <div className="text-[12px] text-lp-muted">{f.l}</div>
                    <div className="mt-1.5 flex h-8 items-end pb-2 text-[15px]" style={{ borderBottom: "1px solid var(--lp-line)" }}>
                      <span className={f.c}>{f.v}</span>
                    </div>
                  </div>
                ))}
                <div className="hw-btn lp-btn mt-8 w-full">Criar conta</div>
                <div className="hw-ok mt-6 flex items-center gap-2 text-[14px]">
                  <Check className="h-4 w-4" strokeWidth={1.75} />
                  Conta criada. Bem-vinda, Ana.
                </div>
              </div>

              {/* Estado 2: lançamentos */}
              <div className="hw-s2 invisible absolute inset-0 px-6 pt-7 opacity-0">
                <div className="text-[15px] font-medium">Novo gasto</div>
                <div className="mt-5 text-[12px] text-lp-muted">Valor</div>
                <div className="mt-1 flex h-12 items-end gap-2 pb-2" style={{ borderBottom: "1px solid var(--lp-line)" }}>
                  <span className="lp-num pb-1 text-[18px] text-lp-muted">R$</span>
                  <span className="hw-valor lp-num h-9 text-[30px] leading-9">212,40</span>
                </div>
                <div className="mt-4 text-[12px] text-lp-muted">Descrição</div>
                <div className="mt-1 h-7 pb-2 text-[15px]" style={{ borderBottom: "1px solid var(--lp-line)" }}>
                  <span className="hw-desc">Mercado</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {CHIPS.map((c) => (
                    <span key={c} className="hw-chip inline-flex h-8 items-center rounded-[3px] px-3 text-[12px]" style={{ border: `1px solid ${LINE}`, color: MUTED }}>
                      {c}
                    </span>
                  ))}
                </div>
                <div className="hw-btn lp-btn mt-5 w-full">Lançar</div>
                <div className="mt-6 text-[12px] text-lp-muted">Lançamentos de hoje</div>
                <div className="mt-1">
                  {LAUNCHES.map((l) => (
                    <div key={l.desc} className="hw-row flex h-12 items-center gap-3">
                      <l.Icon className="h-4 w-4 shrink-0 text-lp-muted" strokeWidth={1.5} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px]">{l.desc}</div>
                        <div className="text-[11px] text-lp-muted">{l.cat}</div>
                      </div>
                      <span className="lp-num text-[13px] text-lp-muted">{signed(l.v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estado 3: o padrão (é o que aparece sem movimento) */}
              <div className="hw-s3 absolute inset-0 px-6 pt-7">
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-medium">Setembro</span>
                  <span className="text-[12px] text-lp-muted">Para onde foi</span>
                </div>
                <div className="mt-6 text-[12px] text-lp-muted">Gastos no mês</div>
                <div className="lp-num mt-1 text-[30px] leading-none">{brl(TOTAL)}</div>
                <div className="mt-7 flex flex-col gap-5">
                  {CATS.map((c) => (
                    <div key={c.c}>
                      <div className="mb-2 flex items-baseline justify-between text-[13px]">
                        <span>{c.c}</span>
                        <span className="hw-num lp-num text-[12px] text-lp-muted">{brl(c.v)}</span>
                      </div>
                      <div className="h-[3px] overflow-hidden bg-lp-track">
                        <div className="hw-bar h-full origin-left bg-lp-fg" style={{ transform: `scaleX(${c.v / CATS[0].v})` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hw-insight mt-7 rounded-[3px] bg-lp-bg px-4 py-3 text-[13px] leading-snug">
                  Alimentação é <span className="lp-num">38%</span> do mês.{" "}
                  <span className="text-lp-muted">Em agosto era <span className="lp-num">29%</span>.</span>
                </div>
              </div>
            </div>

            {/* Abas do app: aparecem depois do cadastro; a tinta anda para
                Lançar no passo 2 e para Início no passo 3. */}
            <div
              aria-hidden="true"
              className="relative grid shrink-0 grid-cols-3 transition-opacity duration-500 lg:hidden"
              style={{ borderTop: "1px solid var(--lp-line)", opacity: active === 0 ? 0 : 1 }}
            >
              <span
                className="lp-tab-ink absolute left-0 top-[-1px] h-px w-1/3 bg-lp-fg"
                style={{ transform: `translateX(${active === 1 ? 100 : 0}%)` }}
              />
              {[
                { l: "Início", Icon: Home, on: active !== 1 },
                { l: "Lançar", Icon: Plus, on: active === 1 },
                { l: "Dividir", Icon: Users, on: false },
              ].map(({ l, Icon, on }) => (
                <div key={l} className={`lp-tab flex h-16 flex-col items-center justify-center gap-1 text-[12px] ${on ? "text-lp-fg" : "text-lp-muted"}`}>
                  <Icon className="h-5 w-5" strokeWidth={on ? 1.75 : 1.5} />
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
