import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Wallet, Users, CreditCard, Target, Building2,
  ArrowRight, FileText, TrendingUp, PieChart,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════════════
   🔀  TOGGLE — mude esta linha para trocar o layout da seção Features
       "list"       → lista interativa com preview lateral  (editorial)
       "horizontal" → scroll horizontal GSAP pinned         (imersivo)
   ═══════════════════════════════════════════════════════════════════════ */
type FeatureVariant = "list" | "horizontal";
const FEATURES_VARIANT: FeatureVariant = "list";

/* ─── Types ──────────────────────────────────────────────────────────── */
interface Feature {
  icon: LucideIcon;
  title: string;
  shortDesc: string;
  longDesc: string;
  screen: React.ReactNode;
}

/* ═══════════════════════════════════════════════════════════════════════
   MINI APP SCREENSHOTS
   ═══════════════════════════════════════════════════════════════════════ */
function ScreenCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm text-left w-full">
      {children}
    </div>
  );
}
function ScreenHeader({
  title, sub, badge,
}: {
  title: string; sub?: string; badge?: string;
}) {
  return (
    <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
      <div>
        <p className="text-[11px] font-semibold text-zinc-800">{title}</p>
        {sub && <p className="text-[9px] text-zinc-400 mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
}

function ScreenGastosPessoais() {
  const items = [
    { emoji: "🍕", name: "iFood",    cat: "Alimentação", val: "R$ 45,90",  paid: true  },
    { emoji: "🎵", name: "Spotify",  cat: "Assinaturas", val: "R$ 21,90",  paid: true  },
    { emoji: "💪", name: "Academia", cat: "Saúde",       val: "R$ 99,00",  paid: false },
    { emoji: "🏠", name: "Aluguel",  cat: "2 de 12",     val: "R$ 1.200",  paid: true  },
  ];
  return (
    <ScreenCard>
      <ScreenHeader title="Meus Gastos" sub="Março 2026 · 12 registros" badge="R$ 1.366,80" />
      <div className="divide-y divide-zinc-50">
        {items.map(t => (
          <div key={t.name} className="flex items-center px-4 py-2.5 gap-3">
            <span className="text-base">{t.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-zinc-800">{t.name}</p>
              <p className="text-[9px] text-zinc-400">{t.cat}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-semibold text-zinc-700">{t.val}</p>
              <p className={`text-[9px] ${t.paid ? "text-emerald-600" : "text-amber-500"}`}>
                {t.paid ? "● pago" : "○ pendente"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScreenCard>
  );
}

function ScreenCompartilhados() {
  const people = [
    { name: "Você",     initial: "V", paid: true,  share: "R$ 45,00" },
    { name: "Ana Lima", initial: "A", paid: true,  share: "R$ 45,00" },
    { name: "Carlos",   initial: "C", paid: false, share: "R$ 45,00" },
  ];
  return (
    <ScreenCard>
      <ScreenHeader title="Churrasco de março 🍖" sub="Total: R$ 135,00 · 3 pessoas" />
      <div className="divide-y divide-zinc-50">
        {people.map(p => (
          <div key={p.name} className="flex items-center px-4 py-3 gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                p.paid ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {p.initial}
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium text-zinc-800">{p.name}</p>
              <p className={`text-[9px] ${p.paid ? "text-emerald-600" : "text-amber-500"}`}>
                {p.paid ? "Já pagou" : "Aguardando pagamento"}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-zinc-700 shrink-0">{p.share}</span>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
        <p className="text-[10px] text-amber-700 font-medium">Carlos deve R$ 45,00 · vence em 3 dias</p>
      </div>
    </ScreenCard>
  );
}

function ScreenCartoes() {
  return (
    <ScreenCard>
      <ScreenHeader title="Cartões de Crédito" sub="1 cartão ativo" />
      <div className="p-4">
        <div className="rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-700 p-4 text-white mb-4">
          <p className="text-[9px] text-zinc-400 mb-1 font-medium tracking-wider">NUBANK · •••• 4521</p>
          <p className="text-lg font-bold font-display">R$ 1.360,00</p>
          <p className="text-[9px] text-zinc-400 mt-0.5">de R$ 2.000,00 usados · 68%</p>
          <div className="mt-2.5 h-1 bg-zinc-600 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: "68%" }} />
          </div>
        </div>
        <div className="space-y-2">
          {[
            { name: "Netflix", val: "R$ 55,90",  date: "02/03" },
            { name: "Amazon",  val: "R$ 129,00", date: "05/03" },
            { name: "Uber",    val: "R$ 24,50",  date: "07/03" },
          ].map(c => (
            <div key={c.name} className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-zinc-800">{c.name}</p>
                <p className="text-[9px] text-zinc-400">{c.date}</p>
              </div>
              <span className="text-[11px] font-semibold text-zinc-700">-{c.val}</span>
            </div>
          ))}
        </div>
      </div>
    </ScreenCard>
  );
}

function ScreenMetas() {
  const goals = [
    { cat: "Alimentação", used: 380, total: 500, pct: 76, ok: true  },
    { cat: "Delivery",    used: 145, total: 150, pct: 97, ok: false },
    { cat: "Transporte",  used: 95,  total: 200, pct: 47, ok: true  },
    { cat: "Lazer",       used: 230, total: 300, pct: 77, ok: true  },
  ];
  return (
    <ScreenCard>
      <ScreenHeader title="Metas do mês" sub="Março 2026 · 4 categorias" />
      <div className="px-4 py-3 space-y-3.5">
        {goals.map(g => (
          <div key={g.cat}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-zinc-700">{g.cat}</span>
              <span className={`text-[10px] font-medium ${g.ok ? "text-zinc-500" : "text-amber-600"}`}>
                R$ {g.used} / R$ {g.total}
              </span>
            </div>
            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  g.ok ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${g.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ScreenCard>
  );
}

function ScreenContas() {
  const accounts = [
    { bank: "Nubank",   initial: "Nu", balance: "R$ 1.240,00", color: "bg-purple-600" },
    { bank: "Bradesco", initial: "Br", balance: "R$ 3.890,00", color: "bg-red-600"    },
    { bank: "Inter",    initial: "In", balance: "R$ 560,00",   color: "bg-orange-500" },
  ];
  return (
    <ScreenCard>
      <ScreenHeader title="Contas Bancárias" badge="R$ 5.690,00 total" />
      <div className="divide-y divide-zinc-50">
        {accounts.map(a => (
          <div key={a.bank} className="flex items-center px-4 py-3 gap-3">
            <div
              className={`w-8 h-8 rounded-lg ${a.color} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
            >
              {a.initial}
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium text-zinc-800">{a.bank}</p>
              <p className="text-[9px] text-zinc-400">Conta corrente</p>
            </div>
            <span className="text-[11px] font-semibold text-zinc-700 shrink-0">{a.balance}</span>
          </div>
        ))}
      </div>
    </ScreenCard>
  );
}

function ScreenRelatorios() {
  const months = [
    { m: "Out", v: 42 }, { m: "Nov", v: 58 }, { m: "Dez", v: 75 },
    { m: "Jan", v: 61 }, { m: "Fev", v: 48 }, { m: "Mar", v: 68 },
  ];
  return (
    <ScreenCard>
      <ScreenHeader title="Relatório — Mar 2026" sub="Total: R$ 3.240,00" />
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-end gap-1.5 h-16">
          {months.map(({ m, v }) => (
            <div key={m} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-emerald-500/80 rounded-t-sm"
                style={{ height: `${v}%` }}
              />
              <span className="text-[8px] text-zinc-400">{m}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-1.5 border-t border-zinc-50">
        {[
          { name: "Alimentação", pct: 34, color: "bg-emerald-500" },
          { name: "Moradia",     pct: 28, color: "bg-blue-400"    },
          { name: "Transporte",  pct: 18, color: "bg-amber-400"   },
          { name: "Outros",      pct: 20, color: "bg-zinc-300"    },
        ].map(c => (
          <div key={c.name} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${c.color} shrink-0`} />
            <span className="text-[9px] text-zinc-500">{c.name} {c.pct}%</span>
          </div>
        ))}
      </div>
    </ScreenCard>
  );
}

/* ─── Features data ──────────────────────────────────────────────────── */
const features: Feature[] = [
  {
    icon: Wallet,
    title: "Gastos Pessoais",
    shortDesc: "Cada centavo registrado.",
    longDesc: "Registre despesas com categoria, data, parcelas e status de pagamento. Veja exatamente quanto foi para alimentação, transporte ou lazer — sem estimativas, sem surpresas no fechamento do mês.",
    screen: <ScreenGastosPessoais />,
  },
  {
    icon: Users,
    title: "Gastos Compartilhados",
    shortDesc: "Divida sem drama.",
    longDesc: "Adicione quem dividiu a conta, quanto cada um deve e registre os pagamentos conforme acontecem. Nada de planilhas no Excel ou cobranças constrangedoras por mensagem.",
    screen: <ScreenCompartilhados />,
  },
  {
    icon: CreditCard,
    title: "Cartões de Crédito",
    shortDesc: "Sem surpresa na fatura.",
    longDesc: "Acompanhe limite disponível, próximas faturas e compras parceladas em aberto. Saiba antes do fechamento exatamente o quanto vai cair — sem sustos no boleto.",
    screen: <ScreenCartoes />,
  },
  {
    icon: Target,
    title: "Metas de Gasto",
    shortDesc: "Planejamento que funciona.",
    longDesc: "Defina um teto mensal por categoria e acompanhe o progresso em tempo real. Quando estiver perto de ultrapassar o limite em delivery ou lazer, o Hedge mostra antes.",
    screen: <ScreenMetas />,
  },
  {
    icon: Building2,
    title: "Contas Bancárias",
    shortDesc: "Saldo sempre à vista.",
    longDesc: "Cadastre conta corrente, poupança e contas digitais. Veja o saldo total e o detalhe de cada banco em um único painel — sem precisar abrir cinco aplicativos diferentes.",
    screen: <ScreenContas />,
  },
  {
    icon: FileText,
    title: "Relatórios em PDF",
    shortDesc: "Mês fechado, tudo documentado.",
    longDesc: "Exporte um relatório completo com totais por categoria, progresso das metas e comparativo com meses anteriores. Essencial para imposto de renda e revisão de hábitos financeiros.",
    screen: <ScreenRelatorios />,
  },
];

/* ─── Other data ─────────────────────────────────────────────────────── */
const steps = [
  {
    num: "01",
    title: "Cadastre-se em 30 segundos",
    desc: "Email ou Google. Sem formulário longo, sem cartão de crédito. Crie sua conta e comece a usar na mesma hora.",
  },
  {
    num: "02",
    title: "Comece pelo que já aconteceu",
    desc: "Adicione um gasto de hoje. O Hedge organiza por categoria automaticamente — e você começa a enxergar padrões em dias, não em meses.",
  },
  {
    num: "03",
    title: "Veja o que nunca enxergou",
    desc: "Com alguns registros, o dashboard revela onde você gasta mais, quais categorias excedem o planejado e onde há espaço real para melhorar.",
  },
];

const testimonials = [
  {
    name: "Lucas M.",
    role: "Freelancer",
    text: "Antes eu achava que estava economizando. Depois de uma semana usando, vi que gastava R$ 800 por mês em delivery sem perceber. Mudei completamente meu jeito de ver o dinheiro.",
  },
  {
    name: "Ana C.",
    role: "Estudante de medicina",
    text: "Dividir apartamento com três pessoas era um caos de transferências. Agora todo mundo sabe exatamente o que deve e quando pagou.",
  },
  {
    name: "Pedro R.",
    role: "Empreendedor",
    text: "Reduzi gastos supérfluos em 30% no primeiro mês. Não porque fui mais rígido — mas porque finalmente vi para onde o dinheiro estava indo.",
  },
  {
    name: "Carla S.",
    role: "Designer",
    text: "O relatório PDF foi essencial na minha declaração de IR. Tudo categorizado, organizado, pronto para usar.",
  },
  {
    name: "Marcos T.",
    role: "Professor",
    text: "Minha esposa e eu usamos para controlar as contas da casa juntos. A função de gastos compartilhados é exatamente o que precisávamos.",
  },
  {
    name: "Julia F.",
    role: "Analista financeira",
    text: "Trabalho com finanças todo dia e mesmo assim não tinha controle dos meus gastos pessoais. É o único app que mantive por mais de duas semanas.",
  },
];

const TICKER_ITEMS = [
  "100% gratuito", "Sem anúncios", "Sem cartão de crédito",
  "Para sempre", "Suas contas na régua", "Zero mensalidade",
  "Seguro", "Sem letras pequenas",
];

/* ─── Scroll Reveal ──────────────────────────────────────────────────── */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          obs.unobserve(el);
        }
      },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: "translateY(18px)",
        transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FEATURES VARIANT A — lista interativa com preview lateral
   ═══════════════════════════════════════════════════════════════════════ */
function FeaturesListVariant({ onSignup }: { onSignup: () => void }) {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);

  const switchTo = (i: number) => {
    if (i === active) return;
    setFading(true);
    setTimeout(() => {
      setActive(i);
      setFading(false);
    }, 160);
  };

  const f = features[active];
  const ActiveIcon = f.icon;

  return (
    <section id="features" className="h-screen flex flex-col justify-center px-6 bg-white pt-20 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Reveal>
          <div className="mb-5 max-w-2xl">
            <h2
              className="font-display font-bold leading-[1.05] tracking-tight mb-4 text-zinc-900 text-balance"
              style={{ fontSize: "clamp(2.4rem, 5vw, 3.75rem)" }}
            >
              Tudo para organizar suas finanças.
            </h2>
            <p className="text-zinc-500 text-lg leading-relaxed max-w-xl">
              Ferramentas que cobrem o ciclo completo do seu dinheiro — sem mensalidade, sem complicação.
            </p>
          </div>
        </Reveal>

        {/* Subtle CTA */}
        <Reveal delay={60}>
          <div className="mb-14">
            <button
              onClick={onSignup}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-600 transition-colors group"
            >
              Testar todas as funcionalidades gratuitamente
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </Reveal>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-start">
          {/* Left: active feature preview (sticky) */}
          <div className="lg:sticky lg:top-28 order-2 lg:order-1">
            <div
              style={{
                opacity: fading ? 0 : 1,
                transform: fading ? "translateY(8px)" : "translateY(0)",
                transition: "opacity 160ms ease-out, transform 160ms ease-out",
              }}
            >
              <div className="relative">
                <div className="absolute inset-6 bg-emerald-100/60 rounded-2xl blur-2xl" />
                <div className="relative rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xl shadow-zinc-200/60">
                  <div className="bg-zinc-50 border-b border-zinc-100 px-4 py-2.5 flex items-center gap-2">
                    <ActiveIcon className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
                    <span className="text-[11px] font-semibold text-zinc-700">{f.title}</span>
                  </div>
                  <div className="p-4 bg-white overflow-hidden" style={{ height: "292px" }}>{f.screen}</div>
                </div>
              </div>

              <div className="mt-7 pt-7 border-t border-zinc-100">
                <p className="text-xs font-semibold tracking-[0.12em] text-emerald-600 mb-2 uppercase">
                  {f.shortDesc}
                </p>
                <p className="text-zinc-500 leading-relaxed text-sm max-w-md">{f.longDesc}</p>
              </div>
            </div>
          </div>

          {/* Right: numbered list */}
          <div className="order-1 lg:order-2 divide-y divide-zinc-100">
            {features.map((feat, i) => {
              const isActive = i === active;
              const FeatIcon = feat.icon;
              return (
                <button
                  key={feat.title}
                  onMouseEnter={() => switchTo(i)}
                  onClick={() => switchTo(i)}
                  className={`w-full flex items-center justify-between py-5 text-left transition-all duration-150 group ${
                    isActive ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-mono text-xs tabular-nums transition-colors shrink-0 ${
                        isActive ? "text-emerald-600" : "text-zinc-300"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? "bg-emerald-600" : "bg-zinc-100 group-hover:bg-zinc-200"
                      }`}
                    >
                      <FeatIcon
                        className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-500"}`}
                        strokeWidth={1.5}
                      />
                    </div>
                    <span className="font-display text-base font-semibold tracking-tight">
                      {feat.title}
                    </span>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 flex-shrink-0 transition-all duration-200 ${
                      isActive ? "opacity-100 text-emerald-600" : "opacity-0 -translate-x-1"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FEATURES VARIANT B — GSAP horizontal scroll pinned
   ═══════════════════════════════════════════════════════════════════════ */
function FeaturesHorizontalVariant() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const panels = track.querySelectorAll<HTMLElement>(".h-panel");
      const total = panels.length;
      const ctx = gsap.context(() => {
        gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: container,
            pin: true,
            scrub: 1.2,
            invalidateOnRefresh: true,
            end: () => `+=${track.scrollWidth - window.innerWidth}`,
            onUpdate: (self) => setActiveIdx(Math.round(self.progress * (total - 1))),
          },
        });
      }, container);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);

  return (
    <>
      <section id="features" ref={containerRef} className="hidden lg:block overflow-hidden relative">
        <div ref={trackRef} className="flex will-change-transform" style={{ height: "100vh" }}>
          <div className="h-panel w-screen h-screen flex-shrink-0 flex items-center px-16 xl:px-24 bg-zinc-50">
            <div className="max-w-2xl">
              <h2
                className="font-display font-bold leading-[1.05] tracking-tight mb-6 text-zinc-900 text-balance"
                style={{ fontSize: "clamp(3rem, 6vw, 4.5rem)" }}
              >
                Tudo para organizar suas finanças.
              </h2>
              <p className="text-zinc-500 text-xl mb-8">Sem complicação. Sem mensalidade.</p>
              <span className="text-sm text-zinc-400 flex items-center gap-2">
                Scroll para explorar <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="h-panel w-screen h-screen flex-shrink-0 flex items-center px-16 xl:px-24 border-l border-zinc-200 bg-white"
              >
                <div className="max-w-6xl mx-auto w-full grid grid-cols-2 gap-20 items-center">
                  <div>
                    <span
                      className="font-display font-bold leading-none select-none text-zinc-100 block pointer-events-none"
                      style={{ fontSize: "clamp(7rem, 14vw, 11rem)", marginBottom: "-1.5rem" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3
                      className="font-display font-bold mb-4 relative z-10 text-zinc-900"
                      style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
                    >
                      {feat.title}
                    </h3>
                    <p className="text-zinc-500 text-lg leading-relaxed max-w-sm mb-8">{feat.longDesc}</p>
                  </div>
                  <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-xl shadow-zinc-200/60">
                    <div className="bg-zinc-50 border-b border-zinc-100 px-4 py-2.5 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
                      <span className="text-xs font-semibold text-zinc-700">{feat.title}</span>
                    </div>
                    <div className="p-4 bg-white">{feat.screen}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {Array.from({ length: features.length + 1 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === activeIdx ? "w-6 h-1.5 bg-emerald-600" : "w-1.5 h-1.5 bg-zinc-300"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Mobile fallback */}
      <section id="features" className="lg:hidden py-20 px-6 bg-white">
        <Reveal>
          <h2 className="font-display text-4xl font-bold mb-12 text-zinc-900 text-balance">
            Tudo para organizar suas finanças.
          </h2>
        </Reveal>
        <div className="divide-y divide-zinc-100">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <Reveal key={feat.title} delay={i * 60}>
                <div className="flex items-start gap-5 py-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold mb-1 text-zinc-900">{feat.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{feat.longDesc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LANDING PAGE — light mode only
   ═══════════════════════════════════════════════════════════════════════ */
/* Número de seções h-screen (hero, dashboard, features, how, reviews, cta) */
const SNAP_SECTION_COUNT = 6;

export const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  /* Lenis smooth scroll + GSAP ScrollTrigger */
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2 });
    lenisRef.current = lenis;
    const rafFn = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(rafFn);
    gsap.ticker.lagSmoothing(0);
    lenis.on("scroll", ScrollTrigger.update);

    /* Intercepta anchor links para scroll suave via Lenis */
    const onAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href^='#']") as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { duration: 0.9, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
    };
    document.addEventListener("click", onAnchorClick);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
      gsap.ticker.remove(rafFn);
      document.removeEventListener("click", onAnchorClick);
    };
  }, []);

  /* Navbar scroll state */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  /* Snap suave — usa lenis.scrollTo para não conflitar com o scroll virtual */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let isSnapping = false;

    const onScroll = () => {
      if (isSnapping) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const lenis = lenisRef.current;
        if (!lenis) return;
        const vh = window.innerHeight;
        const scrollY = window.scrollY;

        /* Não faz snap na área do footer */
        if (scrollY >= SNAP_SECTION_COUNT * vh) return;

        const idx = Math.min(Math.round(scrollY / vh), SNAP_SECTION_COUNT - 1);
        const target = idx * vh;

        /* Ignora se já está alinhado (dentro de 4% do vh) */
        if (Math.abs(scrollY - target) < vh * 0.04) return;

        isSnapping = true;
        lenis.scrollTo(target, {
          duration: 0.55,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
        });
        /* Libera o flag depois da animação terminar */
        setTimeout(() => { isSnapping = false; }, 600);
      }, 150);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden">
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 34s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .animate-marquee { animation: none; } }
      `}</style>

      {/* ══════════════════════════════════════
          FLOATING PILL NAVBAR
          ══════════════════════════════════════ */}
      <header className="fixed top-3 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav
          className={`pointer-events-auto w-full max-w-5xl h-14 flex items-center justify-between px-5 transition-all duration-300 ${
            scrolled
              ? "bg-white/90 backdrop-blur-md rounded-2xl shadow-sm shadow-zinc-200/60 border border-zinc-100/80"
              : "bg-transparent"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <img src="/favicon-light.png" alt="Hedge" className="w-7 h-7" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="font-display text-base font-bold tracking-tight text-zinc-900">Hedge</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500">
            <a href="#features" className="hover:text-zinc-900 transition-colors">Funcionalidades</a>
            <a href="#how"      className="hover:text-zinc-900 transition-colors">Como funciona</a>
            <a href="#reviews"  className="hover:text-zinc-900 transition-colors">Depoimentos</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate("/login?mode=signup")}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
            >
              Começar grátis
            </button>
          </div>
        </nav>
      </header>

      {/* ══════════════════════════════════════
          HERO — exatamente h-screen (inclui ticker + stats)
          ══════════════════════════════════════ */}
      <section className="h-screen flex flex-col relative overflow-x-hidden bg-white">
        {/* HEDGE watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)",
            maskImage:        "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)",
            overflow: "hidden",
          } as React.CSSProperties}
          aria-hidden="true"
        >
          <span
            className="font-display font-black whitespace-nowrap block"
            style={{ fontSize: "clamp(7rem, 19vw, 18rem)", color: "rgba(0,0,0,0.07)", letterSpacing: "-0.02em" } as React.CSSProperties}
          >
            HEDGE
          </span>
        </div>

        {/* Main content — expands to fill */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Reveal>
              <p className="text-xs font-semibold tracking-[0.2em] text-zinc-400 mb-8 uppercase">
                Gratuito &middot; Seguro &middot; Sem anúncios
              </p>
            </Reveal>
            <Reveal delay={70}>
              <h1
                className="font-display font-bold leading-[1.05] tracking-tight mb-6 text-zinc-900 text-balance"
                style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
              >
                Seu futuro financeiro<br />começa aqui
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-2">
                Do registro diário ao relatório mensal. Controle gastos, divida despesas e construa
                hábitos financeiros que funcionam —
              </p>
              <p className="text-lg md:text-xl font-semibold text-zinc-900 mb-10 inline-block relative">
                tudo em um só lugar.
                <span className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] bg-emerald-500 rounded-full" />
              </p>
            </Reveal>
            <Reveal delay={210}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate("/login?mode=signup")}
                  className="group px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2.5 text-base shadow-lg shadow-emerald-600/20"
                >
                  Começar gratuitamente
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <a href="#features" className="px-6 py-3.5 text-zinc-500 hover:text-zinc-700 font-medium transition-colors text-base">
                  Ver funcionalidades
                </a>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Ticker — ancorado no rodapé do hero */}
        <div className="flex-shrink-0 py-3.5 bg-emerald-600 overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-4 px-6 text-xs font-semibold text-white/90 uppercase tracking-[0.15em]">
                {item}<span className="text-white/30">·</span>
              </span>
            ))}
          </div>
        </div>

        {/* Stats bar — imediatamente abaixo do ticker, ainda dentro do hero */}
        <div className="flex-shrink-0 border-b border-zinc-200 bg-white">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4">
            {[
              { value: "100%", label: "Gratuito para sempre"  },
              { value: "12+",  label: "Funcionalidades"       },
              { value: "5min", label: "Para começar"          },
              { value: "Zero", label: "Anúncios ou cobranças" },
            ].map((s, i) => (
              <div key={s.label} className={`text-center py-5 ${i > 0 ? "border-l border-zinc-200" : ""}`}>
                <p className="font-display text-xl md:text-2xl font-bold text-zinc-900 mb-0.5">{s.value}</p>
                <p className="text-xs text-zinc-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DASHBOARD SHOWCASE
          ══════════════════════════════════════ */}
      <section className="h-screen flex items-center px-6 py-12 bg-zinc-50 overflow-hidden">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_1.7fr] gap-16 items-center">
          {/* Left copy */}
          <Reveal>
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-emerald-600 mb-4 uppercase">
                O produto
              </p>
              <h2
                className="font-display font-bold leading-tight text-zinc-900 mb-6 text-balance"
                style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
              >
                Um dashboard que responde as perguntas certas.
              </h2>
              <p className="text-zinc-500 text-lg leading-relaxed mb-8 max-w-sm">
                De onde vem, para onde vai, quanto sobrou. Todos os dados financeiros do seu mês, organizados da forma que fazem sentido.
              </p>
              <button
                onClick={() => navigate("/login?mode=signup")}
                className="group inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                Experimentar grátis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </Reveal>

          {/* Right: desktop browser mockup */}
          <Reveal delay={120}>
            <div className="relative">
              <div className="absolute -inset-6 bg-emerald-100/40 rounded-3xl blur-3xl" />
              <div className="relative rounded-2xl border border-zinc-200 shadow-2xl shadow-zinc-300/50 overflow-hidden bg-white">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-zinc-100 border-b border-zinc-200">
                  <div className="flex gap-1.5">
                    {["bg-red-400/80", "bg-amber-400/80", "bg-emerald-400/80"].map((c, i) => (
                      <div key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
                    ))}
                  </div>
                  <div className="flex-1 mx-4 bg-white rounded-md h-6 flex items-center px-3 text-[11px] text-zinc-400 max-w-xs">
                    gethedge.vercel.app
                  </div>
                </div>

                {/* App UI */}
                <div className="flex" style={{ height: "450px" }}>
                  {/* Sidebar */}
                  <div className="w-44 border-r border-zinc-100 bg-zinc-50/80 p-3 flex flex-col gap-1 shrink-0">
                    <div className="flex items-center gap-1.5 mb-4 px-2 pt-1">
                      <div className="w-4 h-4 bg-emerald-600 rounded-sm" />
                      <span className="font-display text-xs font-bold text-zinc-800">Hedge</span>
                    </div>
                    {[
                      { label: "Dashboard",   Icon: PieChart,   active: true  },
                      { label: "Meus Gastos", Icon: Wallet,     active: false },
                      { label: "Gastos",      Icon: Users,      active: false },
                      { label: "Cartões",     Icon: CreditCard, active: false },
                      { label: "Metas",       Icon: Target,     active: false },
                      { label: "Contas",      Icon: Building2,  active: false },
                    ].map(({ label, Icon, active }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-2 px-2 py-2 rounded-lg text-[11px] font-medium ${
                          active ? "bg-emerald-50 text-emerald-700" : "text-zinc-400"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* Dashboard content */}
                  <div className="flex-1 p-5 bg-white overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-display text-sm font-bold text-zinc-900">Olá, Usuário! 👋</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Março 2026</p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">
                        U
                      </div>
                    </div>

                    {/* Metric cards */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[
                        { label: "Saldo Total",    val: "R$ 4.274", Icon: Wallet,     color: "text-emerald-600" },
                        { label: "A Receber",      val: "R$ 2.031", Icon: Users,      color: "text-blue-500"    },
                        { label: "Receitas Fixas", val: "R$ 5.350", Icon: TrendingUp, color: "text-green-600"   },
                        { label: "Gastos Fixos",   val: "R$ 479",   Icon: CreditCard, color: "text-amber-500"   },
                      ].map((c) => (
                        <div key={c.label} className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                          <div className="flex items-center gap-1 mb-1.5">
                            <c.Icon className={`w-3 h-3 ${c.color}`} />
                            <span className="text-[9px] text-zinc-500 font-medium leading-tight">{c.label}</span>
                          </div>
                          <p className="text-sm font-bold text-zinc-900">{c.val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Chart + Transactions */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold text-zinc-700">Gastos por mês</span>
                          <span className="text-[9px] text-zinc-400">12 meses</span>
                        </div>
                        <div className="flex items-end gap-1 h-[88px]">
                          {[35, 48, 42, 65, 52, 72, 48, 61, 78, 56, 70, 88].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t bg-emerald-500/70"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-zinc-700 mb-2">Últimos gastos</p>
                        {[
                          { e: "🛒", n: "Mercado", v: "-R$ 234", pos: false },
                          { e: "🚗", n: "Uber",    v: "-R$ 28",  pos: false },
                          { e: "💰", n: "Salário", v: "+R$5.2k", pos: true  },
                        ].map((t) => (
                          <div key={t.n} className="flex items-center justify-between py-1.5 border-b border-zinc-100 last:border-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">{t.e}</span>
                              <span className="text-[10px] text-zinc-700 font-medium">{t.n}</span>
                            </div>
                            <span className={`text-[10px] font-semibold ${t.pos ? "text-emerald-600" : "text-zinc-500"}`}>
                              {t.v}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES
          ══════════════════════════════════════ */}
      {FEATURES_VARIANT === "list"
        ? <FeaturesListVariant onSignup={() => navigate("/login?mode=signup")} />
        : <FeaturesHorizontalVariant />}

      {/* ══════════════════════════════════════
          COMO FUNCIONA — dark green, assimétrico
          ══════════════════════════════════════ */}
      <section id="how" className="h-screen flex items-center px-6 py-16 overflow-hidden" style={{ backgroundColor: "#052e16" }}>
        <div className="max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-16 lg:gap-24 items-start">
            {/* Left sticky title */}
            <Reveal>
              <div className="lg:sticky" style={{ top: "30vh" }}>
                <h2
                  className="font-display font-bold text-white leading-tight mb-6 text-balance"
                  style={{ fontSize: "clamp(2.5rem, 5vw, 3.75rem)" }}
                >
                  Comece em<br />três passos.
                </h2>
                <p className="text-emerald-100/50 text-lg leading-relaxed max-w-xs">
                  Minutos para configurar. Meses para transformar como você lida com dinheiro.
                </p>
                <div className="mt-10">
                  <button
                    onClick={() => navigate("/login?mode=signup")}
                    className="group inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    Começar agora
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </Reveal>

            {/* Right: step rows */}
            <div>
              {steps.map((s, i) => (
                <Reveal key={s.num} delay={i * 80}>
                  <div className={`py-10 ${i < steps.length - 1 ? "border-b border-white/[0.08]" : ""}`}>
                    <div className="flex items-start gap-6">
                      <span className="font-mono text-xs font-bold text-emerald-500/50 mt-1.5 shrink-0 w-8 tabular-nums">
                        {s.num}
                      </span>
                      <div>
                        <h3
                          className="font-display font-bold text-white mb-3 leading-tight"
                          style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}
                        >
                          {s.title}
                        </h3>
                        <p className="text-emerald-100/50 text-base leading-relaxed max-w-md">{s.desc}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DEPOIMENTOS — zinc-50, layout variado
          ══════════════════════════════════════ */}
      <section id="reviews" className="h-screen flex items-center px-6 py-12 bg-zinc-50 overflow-hidden">
        <div className="max-w-6xl mx-auto w-full">
          {/* Header */}
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end gap-4 mb-8">
              <h2
                className="font-display font-bold leading-tight text-zinc-900 text-balance flex-1"
                style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)" }}
              >
                Resultados que você vê.<br />Confiança que você sente.
              </h2>
              <p className="text-zinc-500 text-base leading-relaxed max-w-xs md:mb-1 shrink-0">
                O que muda quando você para de achar e começa a ver os números.
              </p>
            </div>
          </Reveal>

          {/* Featured testimonial — dark card */}
          <Reveal>
            <div className="relative mb-5 p-7 md:p-9 rounded-2xl bg-zinc-900 text-white overflow-hidden">
              {/* Hedge logo mark — subtle watermark */}
              <div className="absolute right-8 bottom-8 opacity-[0.06] pointer-events-none select-none">
                <img
                  src="/favicon-dark.png"
                  alt=""
                  className="w-28 h-28 object-contain"
                  style={{ filter: "brightness(10)" }}
                />
              </div>
              <svg className="w-7 h-7 text-emerald-500/40 mb-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.731-9.57 8.983-10.609l.998 2.151c-2.433.917-3.998 3.638-3.998 5.849h4.001v10h-9.984z" />
              </svg>
              <p
                className="font-display font-semibold text-white leading-relaxed mb-6 relative z-10 text-balance"
                style={{ fontSize: "clamp(1.05rem, 2vw, 1.35rem)" }}
              >
                "{testimonials[0].text}"
              </p>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  {testimonials[0].name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{testimonials[0].name}</p>
                  <p className="text-zinc-400 text-xs">{testimonials[0].role}</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Grid of 3 additional testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.slice(1, 4).map((t, i) => (
              <Reveal key={t.name} delay={i * 55}>
                <div className="p-5 rounded-2xl bg-white border border-zinc-200 h-full flex flex-col">
                  <svg className="w-4 h-4 text-emerald-300 mb-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.731-9.57 8.983-10.609l.998 2.151c-2.433.917-3.998 3.638-3.998 5.849h4.001v10h-9.984z" />
                  </svg>
                  <p className="text-sm text-zinc-600 leading-relaxed mb-4 flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 text-xs font-semibold shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{t.name}</p>
                      <p className="text-xs text-zinc-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA FINAL — emerald, full viewport
          ══════════════════════════════════════ */}
      <section className="h-screen flex items-center justify-center px-6 py-16 bg-emerald-600 relative overflow-hidden">
        {/* Hedge logo — fills full section, ultra-discrete */}
        <div
          className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <img
            src="/favicon-dark.png"
            alt=""
            className="w-full h-full object-contain"
            style={{
              opacity: 0.06,
              filter: "brightness(10)",
              padding: "6%",
            }}
          />
        </div>
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <Reveal>
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2
              className="font-display font-bold text-white leading-[1.05] mb-6 text-balance"
              style={{ fontSize: "clamp(2.6rem, 7vw, 5.5rem)" }}
            >
              O controle financeiro<br />que você sempre quis.
            </h2>
            <p className="text-emerald-100/70 text-xl mb-12 max-w-lg mx-auto leading-relaxed">
              Sem mensalidade. Sem cartão de crédito. Sem letras pequenas. Só você e o seu dinheiro.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button
                onClick={() => navigate("/login?mode=signup")}
                className="group px-10 py-4 bg-white text-emerald-700 font-bold text-lg rounded-xl hover:bg-zinc-50 transition-colors shadow-2xl shadow-emerald-900/25 flex items-center gap-3"
              >
                Criar minha conta agora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="px-8 py-4 border border-white/30 text-white font-medium rounded-xl hover:bg-white/10 transition-colors text-base"
              >
                Já tenho conta
              </button>
            </div>
            <p className="text-emerald-200/40 text-sm">
              Sem cartão de crédito &middot; Sem período de teste &middot; Gratuito para sempre
            </p>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════
          FOOTER
          ══════════════════════════════════════ */}
      <footer className="py-8 px-6 border-t border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-emerald-600 rounded-sm" />
            <span className="font-display text-sm font-semibold text-zinc-900">Hedge</span>
            <span className="text-xs text-zinc-400 ml-1">© {new Date().getFullYear()}</span>
          </div>
          <p className="text-xs text-zinc-400">Suas contas na régua.</p>
        </div>
      </footer>
    </div>
  );
};
