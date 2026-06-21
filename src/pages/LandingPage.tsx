import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Wallet, Users, CreditCard, Target, Building2,
  ArrowRight, FileText, TrendingUp, Lock, ShieldCheck, EyeOff,
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

/* ─── Dashboard showcase — dados do gráfico ──────────────────────────── */
const gastosChartData = [
  { mes: "Jan", valor: 1245.80 },
  { mes: "Fev", valor: 1537.96 },
  { mes: "Mar", valor: 987.40  },
  { mes: "Abr", valor: 1892.15 },
  { mes: "Mai", valor: 1654.30 },
  { mes: "Jun", valor: 2103.75 },
];

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const maxGastosChart = Math.max(...gastosChartData.map(d => d.valor));

const GastosMiniChart = () => (
  <div className="h-full flex items-end gap-[3px] px-1 pb-[14px] relative">
    {gastosChartData.map(d => (
      <div key={d.mes} className="group flex-1 flex flex-col items-center justify-end gap-0 relative">
        <div
          className="w-full rounded-t-[3px] bg-blue-500 transition-opacity duration-100 group-hover:opacity-80"
          style={{ height: `${(d.valor / maxGastosChart) * 100}%`, maxWidth: 20 }}
        />
        <span className="absolute bottom-0 text-[7px] leading-[14px] text-zinc-400">{d.mes}</span>
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-white border border-zinc-200 rounded-xl px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap z-50">
          <p className="text-[11px] font-bold text-zinc-900 mb-0.5">{d.mes}</p>
          <p className="text-[10px] text-zinc-500">Meus Gastos: <span className="font-semibold text-zinc-800">{brl(d.valor)}</span></p>
        </div>
      </div>
    ))}
  </div>
);

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
  /* c = [alim%, mor%, trans%, outros%] por mês */
  const months = [
    { m: "Out", total: 42, c: [36, 30, 16, 18] },
    { m: "Nov", total: 58, c: [33, 29, 19, 19] },
    { m: "Dez", total: 75, c: [38, 26, 17, 19] },
    { m: "Jan", total: 61, c: [35, 28, 18, 19] },
    { m: "Fev", total: 48, c: [32, 30, 20, 18] },
    { m: "Mar", total: 68, c: [34, 28, 18, 20] },
  ];
  const BAR_COLORS = ["bg-emerald-500", "bg-blue-400", "bg-amber-400", "bg-zinc-300"];
  const globalMax = Math.max(...months.flatMap(mo => mo.c.map(pct => mo.total * pct / 100)));
  return (
    <ScreenCard>
      <ScreenHeader title="Relatório — Mar 2026" sub="Total: R$ 3.240,00" />
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-end gap-1.5" style={{ height: "64px" }}>
          {months.map((mo) => (
            <div key={mo.m} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div className="w-full flex items-end gap-px">
                {mo.c.map((pct, ci) => {
                  const h = Math.round(mo.total * pct / 100 / globalMax * 48);
                  return (
                    <div
                      key={ci}
                      className={`flex-1 rounded-t-sm ${BAR_COLORS[ci]}`}
                      style={{ height: `${h}px` }}
                    />
                  );
                })}
              </div>
              <span className="text-[8px] text-zinc-400">{mo.m}</span>
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
const SECTION_TRACK = [
  { id: "hero", tone: "light" },
  { id: "produto", tone: "light" },
  { id: "features", tone: "light" },
  { id: "how", tone: "green" },
  { id: "reviews", tone: "light" },
  { id: "cta", tone: "dark" },
] as const;

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

/* ─── Scroll Reveal — animação via GSAP com fallback de visibilidade seguro ── */
function Reveal({
  children,
  className = "",
  delay = 0,
  fromLoad = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  fromLoad?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  /*
   * Estado inicial definido sincronamente ANTES do paint (useLayoutEffect).
   * Isso evita o flash de conteúdo visível → invisível que ocorreria se o
   * estado initial fosse definido no useEffect (que roda após o paint).
   * Se prefers-reduced-motion estiver ativo, não ocultamos nada — conteúdo
   * fica visível por padrão sem depender de JS para se tornar acessível.
   */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.set(el, { opacity: 0, y: fromLoad ? 28 : 44, scale: fromLoad ? 0.97 : 0.96 });
  }, [fromLoad]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el, { clearProps: "all" });
      return;
    }

    if (fromLoad) {
      const tween = gsap.to(el, {
        opacity: 1, y: 0, scale: 1,
        duration: 1.2, ease: "power3.out",
        delay: delay / 1000,
      });
      return () => { tween.kill(); };
    }

    const section = el.closest("section") as HTMLElement | null;
    const trigger = section ?? el;

    /* Dispara no mesmo ponto que atualiza a trilha vertical: ~10% da seção
       visível ("top 90%"). Daí em diante a animação toca sozinha, sem
       depender da velocidade do scroll — fica visível mesmo em scroll rápido */
    const tween = gsap.to(el, {
      opacity: 1, y: 0, scale: 1,
      duration: 0.9, ease: "power2.out",
      delay: delay / 1000,
      scrollTrigger: {
        trigger,
        start: "top 90%",
        toggleActions: "play none none none",
        once: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [delay, fromLoad]);

  return (
    <div ref={ref} className={className}>
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
    <section id="features" data-cursor="#0d9488" className="min-h-[calc(100vh+5rem)] lg:h-[calc(100vh+5rem)] flex flex-col justify-center px-6 bg-white pt-20 overflow-hidden">
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
            <p className="text-zinc-600 text-lg leading-relaxed max-w-xl">
              Ferramentas que cobrem o ciclo completo do seu dinheiro — sem mensalidade, sem complicação.
            </p>
          </div>
        </Reveal>

        {/* Subtle CTA */}
        <Reveal delay={60}>
          <div className="mb-14">
            <button
              type="button"
              onClick={onSignup}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-600 transition-colors group rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
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
                <p className="text-zinc-600 leading-relaxed text-sm max-w-md">{f.longDesc}</p>
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
                  type="button"
                  onMouseEnter={() => switchTo(i)}
                  onClick={() => switchTo(i)}
                  className={`w-full flex items-center justify-between py-5 text-left transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset ${
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
      <section id="features" ref={containerRef} data-snap data-cursor="#0d9488" className="hidden lg:block overflow-hidden relative">
        <div ref={trackRef} className="flex will-change-transform" style={{ height: "100vh" }}>
          <div className="h-panel w-screen h-screen flex-shrink-0 flex items-center px-16 xl:px-24 bg-zinc-50">
            <div className="max-w-2xl">
              <h2
                className="font-display font-bold leading-[1.05] tracking-tight mb-6 text-zinc-900 text-balance"
                style={{ fontSize: "clamp(3rem, 6vw, 4.5rem)" }}
              >
                Tudo para organizar suas finanças.
              </h2>
              <p className="text-zinc-600 text-xl mb-8">Sem complicação. Sem mensalidade.</p>
              <span className="text-sm text-zinc-500 flex items-center gap-2">
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
                    <p className="text-zinc-600 text-lg leading-relaxed max-w-sm mb-8">{feat.longDesc}</p>
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
      <section id="features" data-cursor="#0d9488" className="lg:hidden py-20 px-6 bg-white">
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
                    <p className="text-zinc-600 text-sm leading-relaxed">{feat.longDesc}</p>
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
/* ─── Feed de gastos recentes (dashboard showcase) ───────────────────── */
const FEED_DATA = [
  { n: "Mercado",     v: "-R$312,80", c: "Alimentação" },
  { n: "Uber",        v: "-R$47,50",  c: "Transporte"  },
  { n: "Netflix",     v: "-R$44,90",  c: "Streaming"   },
  { n: "Farmácia",    v: "-R$89,30",  c: "Saúde"       },
  { n: "iFood",       v: "-R$63,20",  c: "Alimentação" },
  { n: "Spotify",     v: "-R$21,90",  c: "Streaming"   },
  { n: "Posto Shell", v: "-R$120,00", c: "Transporte"  },
  { n: "Amazon",      v: "-R$156,40", c: "Compras"     },
];

type FeedItem = typeof FEED_DATA[0] & { uid: number };
const MAX_FEED = 4;

const GastosFeedCard = () => {
  const [items, setItems] = useState<FeedItem[]>(
    FEED_DATA.slice(0, MAX_FEED).map((d, i) => ({ ...d, uid: i }))
  );
  const uidRef    = useRef(MAX_FEED);
  const idxRef    = useRef(MAX_FEED % FEED_DATA.length);
  const rootRef   = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(false);

  /* Pause updates when off-screen — avoids re-renders the user can't see */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (!visibleRef.current || document.hidden) return;
      const next = FEED_DATA[idxRef.current];
      idxRef.current = (idxRef.current + 1) % FEED_DATA.length;
      setItems(prev => [{ ...next, uid: uidRef.current++ }, ...prev.slice(0, MAX_FEED - 1)]);
    }, 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <div ref={rootRef} className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
      <p className="text-[10px] font-semibold text-zinc-700 mb-2">Últimos gastos</p>
      <div className="space-y-2">
        {items.map((t, i) => (
          <div
            key={t.uid}
            className={`flex items-center justify-between border-b border-zinc-100 pb-1.5 last:border-0 last:pb-0${i === 0 ? " feed-new" : ""}`}
          >
            <div>
              <p className="text-[9px] font-medium text-zinc-800 leading-tight">{t.n}</p>
              <p className="text-[7px] text-zinc-400 leading-tight">{t.c}</p>
            </div>
            <span className="text-[9px] font-semibold text-red-500">{t.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Contador animado (variant 3) ───────────────────────────────────── */
const AnimatedCounter = ({ target, active }: { target: number; active: boolean }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) { setCount(0); return; }
    let rafId = 0;
    const t0 = performance.now();
    const duration = 2400;
    const run = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setCount(Math.round(ease * target));
      if (p < 1) rafId = requestAnimationFrame(run);
    };
    rafId = requestAnimationFrame(run);
    return () => cancelAnimationFrame(rafId);
  }, [target, active]);
  return <>{count.toLocaleString("pt-BR")}</>;
};

/* ══════════════════════════════════════
   HERO BACKGROUND — "Pistas reveladas": rastros de gastos quase invisíveis
   que o cursor (a lanterna da Hedge) revela em esmeralda
   ══════════════════════════════════════ */
const HERO_TRACES = [
  { t: "iFood · R$ 34,90",            c: "Alimentação", x: 8,  y: 12, r: -1.5 },
  { t: "Uber · R$ 18,50",             c: "Transporte",  x: 55, y: 7,  r: 1 },
  { t: "Mercado · R$ 212,07",         c: "Alimentação", x: 78, y: 15, r: -0.8 },
  { t: "Netflix · R$ 44,90",          c: "Streaming",   x: 28, y: 20, r: 1.4 },
  { t: "Farmácia · R$ 67,30",         c: "Saúde",       x: 5,  y: 32, r: 0.6 },
  { t: "Pix recebido · R$ 350,00",    c: "Renda",       x: 72, y: 36, r: -1.2 },
  { t: "Padaria · R$ 12,40",          c: "Alimentação", x: 40, y: 27, r: 0.9 },
  { t: "Spotify · R$ 21,90",          c: "Streaming",   x: 12, y: 55, r: -0.5 },
  { t: "Gasolina · R$ 180,00",        c: "Transporte",  x: 62, y: 54, r: 1.1 },
  { t: "Academia · R$ 89,90",         c: "Saúde",       x: 85, y: 62, r: -1 },
  { t: "Aluguel · R$ 1.400,00",       c: "Moradia",     x: 24, y: 68, r: 0.7 },
  { t: "Café · R$ 8,50",              c: "Alimentação", x: 48, y: 76, r: -1.3 },
  { t: "Luz · R$ 134,22",             c: "Moradia",     x: 7,  y: 83, r: 1.2 },
  { t: "Cinema · R$ 52,00",           c: "Lazer",       x: 66, y: 81, r: -0.6 },
  { t: "Restaurante · R$ 96,40",      c: "Alimentação", x: 36, y: 88, r: 0.8 },
  { t: "Internet · R$ 99,90",         c: "Moradia",     x: 88, y: 28, r: 1.3 },
  { t: "Assinatura · R$ 14,90",       c: "Streaming",   x: 90, y: 46, r: -0.9 },
  { t: "Transferência · R$ 200,00",   c: "Renda",       x: 18, y: 42, r: 0.5 },
];

/* Camada fantasma mostra só o gasto; a camada revelada mostra o gasto + a
   categoria que a Hedge atribuiu — a lanterna não só acha a pista, ela a lê */
const traceSpans = (color: string, opacity: number, withCategory = false) =>
  HERO_TRACES.map((d) => (
    <span
      key={d.t}
      className="absolute font-mono text-xs whitespace-nowrap"
      style={{ left: `${d.x}%`, top: `${d.y}%`, color, opacity, transform: `rotate(${d.r}deg)` } as React.CSSProperties}
    >
      {d.t}
      {withCategory && <span style={{ opacity: 0.65 } as React.CSSProperties}>{" → "}{d.c}</span>}
    </span>
  ));

/* ══════════════════════════════════════
   CURSOR — a bolinha substitui o cursor nativo na landing.
   Cada seção define sua cor via data-cursor; interativos a ampliam.
   ══════════════════════════════════════ */
const CursorDot = () => {
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

/* Pistas reveladas — o cursor é a lanterna que revela os rastros.
   Reutilizado no hero (fundo branco) e no CTA final (fundo escuro, invertido) */
type TraceRevealProps = {
  ghostColor: string;
  ghostOpacity: number;
  litColor: string;
};

const TraceReveal = ({ ghostColor, ghostOpacity, litColor }: TraceRevealProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const litRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const lit = litRef.current;
    if (!root || !lit) return;

    const setMask = (x: number, y: number) => {
      const m = `radial-gradient(circle 150px at ${x}px ${y}px, black 0%, rgba(0,0,0,0.35) 60%, transparent 100%)`;
      lit.style.opacity = "1";
      lit.style.webkitMaskImage = m;
      lit.style.maskImage = m;
    };

    let rafId = 0;
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setMask(x, y));
    };
    const onLeave = () => { lit.style.opacity = "0"; };

    /* Listeners no host (a section) porque a camada em si é pointer-events-none */
    const host = root.parentElement ?? root;
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    /* Touch: a lanterna varre sozinha, devagar */
    const touch = window.matchMedia("(hover: none)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let sweepId = 0;
    if (touch && !reduced) {
      const t0 = performance.now();
      const sweep = (now: number) => {
        const t = (now - t0) / 1000;
        const r = root.getBoundingClientRect();
        setMask(
          r.width * (0.5 + 0.4 * Math.sin(t * 0.35)),
          r.height * (0.5 + 0.32 * Math.sin(t * 0.23 + 1.7)),
        );
        sweepId = requestAnimationFrame(sweep);
      };
      sweepId = requestAnimationFrame(sweep);
    }

    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(sweepId);
    };
  }, []);

  return (
    <div ref={rootRef} className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
      <div className="absolute inset-0">{traceSpans(ghostColor, ghostOpacity)}</div>
      <div ref={litRef} className="absolute inset-0" style={{ opacity: 0, transition: "opacity 0.3s" } as React.CSSProperties}>
        {traceSpans(litColor, 1, true)}
      </div>
    </div>
  );
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const dashScrollRef  = useRef<HTMLDivElement>(null);
  const dashTiltRef    = useRef<HTMLDivElement>(null);
  const lenisRef       = useRef<Lenis | null>(null);
  const ctaSectionRef  = useRef<HTMLElement>(null);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const sectionTone = SECTION_TRACK[activeSectionIdx]?.tone ?? "light";

  /* Tilt 3D do mockup — inclina alguns graus seguindo o mouse na seção #produto */
  useEffect(() => {
    const el = dashTiltRef.current;
    if (!el) return;
    if (window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const host = el.closest("section") ?? el;
    gsap.set(el, { transformPerspective: 1100 });
    const rxTo = gsap.quickTo(el, "rotationX", { duration: 0.7, ease: "power3.out" });
    const ryTo = gsap.quickTo(el, "rotationY", { duration: 0.7, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ryTo(px * 5);
      rxTo(-py * 4);
    };
    const onLeave = () => { rxTo(0); ryTo(0); };

    host.addEventListener("pointermove", onMove as EventListener);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove as EventListener);
      host.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(el);
    };
  }, []);

  /* IntersectionObserver para disparar o contador do CTA */
  useEffect(() => {
    const el = ctaSectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setCtaVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* Lenis smooth scroll + GSAP ScrollTrigger
     Skipped when prefers-reduced-motion: reduce is set — anchor links fall back to instant scroll */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rafFn: ((time: number) => void) | null = null;
    const lenis = reduced ? null : new Lenis({ duration: 1.55, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenisRef.current = lenis;

    if (lenis) {
      rafFn = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(rafFn);
      gsap.ticker.lagSmoothing(0);
      lenis.on("scroll", ScrollTrigger.update);
    }

    /* Anchor link interception — smooth via Lenis, instant when motion is reduced */
    const onAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href^='#']") as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { duration: 0.9, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
      } else {
        target.scrollIntoView();
      }
    };
    document.addEventListener("click", onAnchorClick);

    return () => {
      if (lenis) { lenis.destroy(); if (rafFn) gsap.ticker.remove(rafFn); }
      lenisRef.current = null;
      document.removeEventListener("click", onAnchorClick);
    };
  }, []);


  /* Lenis suave no container do dashboard showcase — rAF só corre quando visível */
  useEffect(() => {
    const el = dashScrollRef.current;
    if (!el) return;
    const lenis = new Lenis({
      wrapper: el,
      content: el.firstElementChild as HTMLElement,
      duration: 0.9,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    });
    let rafId = 0;
    let ticking = false;
    const tick = (time: number) => { lenis.raf(time); rafId = requestAnimationFrame(tick); };
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !ticking) { ticking = true; rafId = requestAnimationFrame(tick); }
      else if (!entry.isIntersecting && ticking) { ticking = false; cancelAnimationFrame(rafId); }
    }, { threshold: 0.01 });
    obs.observe(el);
    return () => { lenis.destroy(); cancelAnimationFrame(rafId); obs.disconnect(); };
  }, []);

  /* Navbar scroll state */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  /* Trilha de progresso vertical + cor da navbar — acompanha a seção que está
     de fato visível a ~10% do topo. Usa a posição real (getBoundingClientRect)
     em vez de IntersectionObserver porque "reviews" se sobrepõe (z-10) a "how"
     e "cta" por design — duas seções podem estar "intersecting" ao mesmo tempo
     ali, e quem está por cima visualmente precisa ganhar a prioridade */
  useEffect(() => {
    const trackIds = SECTION_TRACK.map((s) => s.id);
    const reviewsIdx = trackIds.indexOf("reviews");
    let rafId = 0;

    const compute = () => {
      const refY = window.innerHeight * 0.1;
      const matches: number[] = [];
      trackIds.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (refY >= r.top && refY < r.bottom) matches.push(i);
      });
      if (!matches.length) return;
      const chosen = matches.includes(reviewsIdx) ? reviewsIdx : matches[matches.length - 1];
      setActiveSectionIdx(chosen);
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => { compute(); rafId = 0; });
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);


  return (
    <div className="landing-root min-h-screen bg-white text-zinc-900 overflow-x-hidden" style={{ colorScheme: "light" }}>
      <CursorDot />

      {/* Trilha de progresso vertical — acompanha todas as seções */}
      <div
        className="fixed right-5 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3 pointer-events-none"
        aria-hidden="true"
      >
        {(() => {
          const isDarkActive = SECTION_TRACK[activeSectionIdx]?.tone !== "light";
          return SECTION_TRACK.map((s, i) => {
            const active = i === activeSectionIdx;
            return (
              <span
                key={s.id}
                className={`block rounded-full transition-all duration-300 ${
                  active
                    ? isDarkActive ? "w-1.5 h-6 bg-white" : "w-1.5 h-6 bg-emerald-600"
                    : isDarkActive ? "w-1.5 h-1.5 bg-white/30" : "w-1.5 h-1.5 bg-zinc-300"
                }`}
              />
            );
          });
        })()}
      </div>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 34s linear infinite; }
        @keyframes feed-slide-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .feed-new { animation: feed-slide-in 0.3s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) { .animate-marquee { animation: none; } .feed-new { animation: none; } }
        @media (hover: hover) and (pointer: fine) { .landing-root, .landing-root * { cursor: none !important; } }
      `}</style>

      {/* ══════════════════════════════════════
          FLOATING PILL NAVBAR
          ══════════════════════════════════════ */}
      <header className="fixed top-3 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav
          className={`pointer-events-auto w-full max-w-5xl h-14 flex items-center justify-between px-5 rounded-2xl transition-all duration-300 ${
            scrolled
              ? sectionTone === "dark"
                ? "bg-zinc-900/40 backdrop-blur-sm shadow-sm shadow-black/30 border border-white/10 hover:bg-zinc-900/90 hover:backdrop-blur-md hover:border-white/15"
                : sectionTone === "green"
                ? "bg-emerald-950/40 backdrop-blur-sm shadow-sm shadow-black/20 border border-emerald-400/15 hover:bg-emerald-950/85 hover:backdrop-blur-md hover:border-emerald-400/25"
                : "bg-white/40 backdrop-blur-sm shadow-sm shadow-zinc-200/30 border border-zinc-100/40 hover:bg-white/90 hover:backdrop-blur-md hover:shadow-zinc-200/60 hover:border-zinc-100/80"
              : "bg-transparent"
          }`}
        >
          <a href="#hero" className="flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <img src="/favicon-light.png" alt="Hedge" className="w-7 h-7" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className={`font-display text-base font-bold tracking-tight transition-colors duration-300 ${sectionTone === "light" ? "text-zinc-900" : "text-white"}`}>Hedge</span>
          </a>
          <div className={`hidden md:flex items-center gap-8 text-sm font-medium transition-colors duration-300 ${
            sectionTone === "dark" ? "text-zinc-300" : sectionTone === "green" ? "text-emerald-100/70" : "text-zinc-600"
          }`}>
            <a href="#features" className={`transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${sectionTone === "light" ? "hover:text-zinc-900" : sectionTone === "green" ? "hover:text-emerald-300" : "hover:text-white"}`}>Funcionalidades</a>
            <a href="#how"      className={`transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${sectionTone === "light" ? "hover:text-zinc-900" : sectionTone === "green" ? "hover:text-emerald-300" : "hover:text-white"}`}>Como funciona</a>
            <a href="#reviews"  className={`transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${sectionTone === "light" ? "hover:text-zinc-900" : sectionTone === "green" ? "hover:text-emerald-300" : "hover:text-white"}`}>Depoimentos</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className={`px-4 py-2.5 min-h-[44px] text-sm font-medium transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                sectionTone === "light"
                  ? "text-zinc-600 hover:text-zinc-900 focus-visible:ring-zinc-400"
                  : sectionTone === "green"
                  ? "text-emerald-100/70 hover:text-emerald-300 focus-visible:ring-emerald-400/50"
                  : "text-zinc-300 hover:text-white focus-visible:ring-white/50"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => navigate("/login?mode=signup")}
              className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Começar grátis
            </button>
          </div>
        </nav>
      </header>

      {/* ══════════════════════════════════════
          HERO — exatamente h-screen (inclui ticker + stats)
          ══════════════════════════════════════ */}
      <section id="hero" data-snap data-cursor="#10b981" className="h-screen flex flex-col relative overflow-x-hidden bg-white">
        <TraceReveal ghostColor="#18181b" ghostOpacity={0.045} litColor="#059669" />

        {/* Main content — expands to fill */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-10 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal fromLoad>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500 mb-10 uppercase">
                Gratuito &middot; Seguro &middot; Sem anúncios
              </p>
            </Reveal>
            <Reveal delay={70} fromLoad>
              <h1
                className="font-display font-bold leading-[1.06] tracking-tight mb-8 text-zinc-900 text-balance"
                style={{ fontSize: "clamp(2.4rem, 5.8vw, 5rem)" }}
              >
                Seu dinheiro deixa{" "}
                <span className="relative inline-block" style={{ isolation: "isolate" }}>
                  <svg
                    aria-hidden="true"
                    className="absolute left-0 w-full overflow-visible pointer-events-none"
                    style={{ bottom: "-0.1em", height: "0.3em", zIndex: 0 }}
                    viewBox="0 0 100 8"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0,6 C12,4 22,7 35,5 C48,3 58,6 72,4 C82,3 92,5 100,2"
                      stroke="#10b981"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <span style={{ position: "relative", zIndex: 1 }}>pistas</span>
                </span>
                .<br />
                <span className="text-emerald-500">Nós revelamos o caminho.</span>
              </h1>
            </Reveal>
            <Reveal delay={140} fromLoad>
              <p className="text-lg text-zinc-600 max-w-lg mx-auto leading-relaxed mb-10">
                Entenda para onde seu dinheiro vai, identifique padrões e construa hábitos que fazem diferença.{" "}
                <strong className="text-zinc-800 font-semibold">Tudo em um só lugar.</strong>
              </p>
            </Reveal>
            <Reveal delay={210} fromLoad>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/login?mode=signup")}
                  className="group px-8 py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white font-semibold rounded-xl transition-all flex items-center gap-2.5 text-base shadow-lg shadow-emerald-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  Começar gratuitamente
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <a href="#produto" className="px-6 py-4 text-zinc-600 hover:text-zinc-800 font-medium transition-colors text-base rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                  Ver o produto em ação
                </a>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Ticker — ancorado no rodapé do hero */}
        <div data-cursor="#ffffff" className="flex-shrink-0 py-3.5 bg-emerald-600 overflow-hidden" aria-hidden="true">
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
                <p className="text-xs text-zinc-600 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DASHBOARD SHOWCASE
          ══════════════════════════════════════ */}
      <section id="produto" data-snap data-cursor="#18181b" className="min-h-screen lg:h-screen flex items-center px-6 py-16 lg:py-12 bg-white lg:overflow-hidden">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_1.7fr] gap-16 items-center">
          {/* Left copy */}
          <Reveal>
            <div>
              <h2
                className="font-display font-bold leading-tight text-zinc-900 mb-6 text-balance"
                style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
              >
                Um dashboard que responde as perguntas certas.
              </h2>
              <p className="text-zinc-600 text-lg leading-relaxed mb-8 max-w-sm">
                De onde vem, para onde vai, quanto sobrou. Todos os dados financeiros do seu mês, organizados da forma que fazem sentido.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login?mode=signup")}
                className="group inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.97] text-white font-semibold rounded-xl transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50"
              >
                Experimentar grátis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </Reveal>

          {/* Right: desktop browser mockup — oculto em mobile */}
          <Reveal delay={120} className="hidden lg:block">
            <div ref={dashTiltRef} className="relative" style={{ willChange: "transform" } as React.CSSProperties}>
              <div className="absolute -inset-6 bg-emerald-400/15 rounded-3xl blur-3xl" style={{ willChange: "transform" }} />
              <div className="relative rounded-2xl border border-zinc-200 shadow-2xl shadow-zinc-400/30 overflow-hidden bg-zinc-50 select-none cursor-default">
                {/* Dashboard scrollável — sem sidebar, tema light, Lenis container */}
                <div
                  ref={dashScrollRef}
                  className="overflow-y-auto bg-zinc-50"
                  style={{ height: "440px", scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
                  data-lenis-prevent
                >
                  <div>
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-zinc-200">
                      <p className="text-sm font-bold text-zinc-900 font-display">Olá, usuário 👋</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Visão geral das suas finanças</p>
                    </div>

                    <div className="p-4 space-y-2.5">
                      {/* Cards de métricas — 4 colunas */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "Saldo Total",    val: "R$4.720,15",  color: "text-emerald-600", Icon: Wallet     },
                          { label: "A Receber",      val: "R$340,00",    color: "text-blue-500",    Icon: Users      },
                          { label: "Receitas Fixas", val: "R$5.200,00",  color: "text-emerald-600", Icon: TrendingUp },
                          { label: "Gastos Fixos",   val: "R$850,00",    color: "text-amber-500",   Icon: CreditCard },
                        ].map(c => (
                          <div key={c.label} className="bg-white border border-zinc-200 rounded-xl p-2.5 shadow-sm">
                            <div className="flex items-center gap-1 mb-1.5">
                              <c.Icon className={`w-2.5 h-2.5 ${c.color}`} />
                              <span className="text-[8px] text-zinc-500 leading-tight">{c.label}</span>
                            </div>
                            <p className={`text-[11px] font-bold ${c.color}`}>{c.val}</p>
                          </div>
                        ))}
                      </div>

                      {/* Fluxo + Saldo Livre */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                          <p className="text-[9px] text-zinc-500 mb-1">Fluxo Mensal</p>
                          <p className="text-sm font-bold text-emerald-600">+R$4.350,00</p>
                          <p className="text-[8px] text-zinc-400 mt-0.5">Entradas fixas menos saídas fixas</p>
                        </div>
                        <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                          <p className="text-[9px] text-zinc-500 mb-1">Saldo Livre</p>
                          <p className="text-sm font-bold text-emerald-600">R$3.500,00</p>
                          <p className="text-[8px] text-zinc-400 mt-0.5">Após gastos fixos</p>
                        </div>
                      </div>

                      {/* Gráfico de barras + Últimos gastos */}
                      <div className="grid grid-cols-[1.5fr_1fr] gap-2">
                        <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm flex flex-col">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-semibold text-zinc-700">Meus gastos por mês</p>
                            <p className="text-[8px] text-zinc-400">Últimos 6 meses</p>
                          </div>
                          <div className="flex-1 min-h-0 -mx-1">
                            <GastosMiniChart />
                          </div>
                        </div>
                        <GastosFeedCard />
                      </div>

                      {/* Tendência de Gastos */}
                      <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                        <p className="text-[10px] font-semibold text-zinc-700 mb-2.5">Tendência de Gastos (vs mês anterior)</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[8px] text-zinc-500">Meus Gastos</p>
                            <p className="text-sm font-bold text-zinc-900">R$1.843,20</p>
                            <p className="text-[8px] text-amber-500 mt-0.5">↑ 12% vs R$1.646,10 ant.</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-zinc-500">Gastos Compartilhados</p>
                            <p className="text-sm font-bold text-zinc-900">R$215,40</p>
                            <p className="text-[8px] text-emerald-600 mt-0.5">↓ 8% vs R$234,15 ant.</p>
                          </div>
                        </div>
                      </div>

                      {/* Cards de estatísticas */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Taxa de Quitação", val: "67%",        sub: "4 de 6 quitaram",    color: "text-zinc-900"     },
                          { label: "Média por Pessoa",  val: "R$35,90",    sub: "6 pessoas no grupo", color: "text-zinc-900"     },
                          { label: "Economizando",      val: "R$2.280,60", sub: "Saldo mensal",       color: "text-emerald-600" },
                        ].map(s => (
                          <div key={s.label} className="bg-white border border-zinc-200 rounded-xl p-2.5 shadow-sm">
                            <p className="text-[8px] text-zinc-500 mb-1">{s.label}</p>
                            <p className={`text-xs font-bold ${s.color}`}>{s.val}</p>
                            <p className="text-[7px] text-zinc-400 mt-0.5">{s.sub}</p>
                          </div>
                        ))}
                      </div>

                      {/* Top 5 Gastos */}
                      <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                        <p className="text-[10px] font-semibold text-zinc-700 mb-2">Top 5 Gastos do Mês</p>
                        <div className="space-y-1.5">
                          {[
                            { n: "Aluguel",         v: "R$1.200,00" },
                            { n: "Supermercado",    v: "R$487,30"   },
                            { n: "Energia elétrica",v: "R$213,50"   },
                            { n: "Plano de saúde",  v: "R$198,90"   },
                            { n: "Internet",        v: "R$119,90"   },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-1 border-b border-zinc-100 last:border-0">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-[8px] text-zinc-500 font-bold shrink-0">{i+1}</span>
                                <p className="text-[9px] text-zinc-800">{item.n}</p>
                              </div>
                              <span className="text-[9px] font-semibold text-zinc-500">{item.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Projeção de Saldo */}
                      <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                        <p className="text-[10px] font-semibold text-zinc-700 mb-2">Projeção de Saldo (12 meses)</p>
                        <svg className="w-full" height="56" viewBox="0 0 240 56" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <polygon
                            points="0,50 22,46 44,40 66,34 88,27 110,21 132,16 154,12 176,8 198,5 220,3 240,1 240,56 0,56"
                            fill="url(#projGrad)"
                          />
                          <polyline
                            points="0,50 22,46 44,40 66,34 88,27 110,21 132,16 154,12 176,8 198,5 220,3 240,1"
                            fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      {/* Gastos Fixos vs Variáveis */}
                      <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                        <p className="text-[10px] font-semibold text-zinc-700 mb-2">Gastos Fixos vs Variáveis</p>
                        <div className="flex rounded-full overflow-hidden h-2.5 mb-3">
                          <div className="bg-blue-500" style={{ width: "32%" }} />
                          <div className="flex-1 bg-blue-200" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-2">
                            <p className="text-[8px] text-zinc-500">Gastos Fixos · 32%</p>
                            <p className="text-[11px] font-bold text-zinc-900">R$850,00</p>
                          </div>
                          <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-2">
                            <p className="text-[8px] text-zinc-500">Gastos Variáveis · 68%</p>
                            <p className="text-[11px] font-bold text-zinc-900">R$1.843,20</p>
                          </div>
                        </div>
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
      <section id="how" data-snap data-cursor="#6ee7b7" className="relative min-h-[calc(100vh+7rem)] lg:h-[calc(100vh+7rem)] flex items-center px-6 py-16 overflow-hidden rounded-t-[2.5rem] sm:rounded-t-[3.5rem]" style={{ backgroundColor: "#052e16" }}>
        <div
          className="absolute inset-0 pointer-events-none select-none"
          style={{
            background: "radial-gradient(circle at 8% 15%, rgba(52,211,153,0.16), transparent 55%)",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-16 lg:gap-24 items-start">
            {/* Left sticky title */}
            <Reveal>
              <div className="lg:sticky" style={{ top: "30vh" }}>
                <h2 className="leading-[1.05] mb-6 text-balance">
                  <span className="block font-mono text-xs font-bold uppercase tracking-[0.25em] text-emerald-400 mb-3">
                    [ leva minutos ]
                  </span>
                  <span className="font-display font-bold text-white" style={{ fontSize: "clamp(2.75rem, 6vw, 4.5rem)" }}>
                    Comece em
                  </span>
                  <br />
                  <span
                    className="font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-500"
                    style={{ fontSize: "clamp(2.75rem, 6vw, 4.5rem)" }}
                  >
                    três passos.
                  </span>
                </h2>
                <p className="text-emerald-100/50 text-lg leading-relaxed max-w-xs">
                  <span className="text-white font-semibold">Em minutos você começa.</span> Em pouco tempo, seu dinheiro faz mais sentido.
                </p>
                <div className="mt-10">
                  <button
                    type="button"
                    onClick={() => navigate("/login?mode=signup")}
                    className="group inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] text-white font-semibold rounded-xl transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#052e16]"
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
      <section
        id="reviews"
        data-snap
        data-cursor="#059669"
        className="relative z-10 bg-zinc-50 overflow-hidden rounded-t-[2.5rem] sm:rounded-t-[3.5rem] rounded-b-[2.5rem] sm:rounded-b-[3.5rem] -mt-10 sm:-mt-14 -mb-10 sm:-mb-14 px-6 py-16 lg:py-20"
      >
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
              <p className="text-zinc-600 text-base leading-relaxed max-w-xs md:mb-1 shrink-0">
                O que muda quando você para de achar e começa a ver os números.
              </p>
            </div>
          </Reveal>

          {/* Featured testimonial — dark card */}
          <Reveal>
            <div data-cursor="#ffffff" className="relative mb-5 p-7 md:p-9 rounded-2xl bg-emerald-600 overflow-hidden">
              {/* Hedge logo mark — metade direita, branco, fade */}
              <div
                className="absolute top-1/2 pointer-events-none select-none opacity-[0.18]"
                style={{ right: "-96px", transform: "translateY(-50%)" }}
              >
                <img
                  src="/favicon-light.png"
                  alt=""
                  className="w-64 h-64 object-contain"
                  style={{ filter: "brightness(0) invert(1)" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <svg className="w-7 h-7 text-zinc-900/70 mb-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.731-9.57 8.983-10.609l.998 2.151c-2.433.917-3.998 3.638-3.998 5.849h4.001v10h-9.984z" />
              </svg>
              <p
                className="font-display font-semibold text-white leading-relaxed mb-6 relative z-10 text-balance"
                style={{ fontSize: "clamp(1.05rem, 2vw, 1.35rem)" }}
              >
                "{testimonials[0].text}"
              </p>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white font-bold text-sm">
                  {testimonials[0].name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{testimonials[0].name}</p>
                  <p className="text-emerald-100 text-xs">{testimonials[0].role}</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Grid of 3 additional testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.slice(1, 4).map((t, i) => (
              <Reveal key={t.name} delay={i * 55}>
                <div className="p-5 rounded-2xl bg-white border border-zinc-200 h-full flex flex-col">
                  <svg className="w-4 h-4 text-emerald-500 mb-3 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.731-9.57 8.983-10.609l.998 2.151c-2.433.917-3.998 3.638-3.998 5.849h4.001v10h-9.984z" />
                  </svg>
                  <p className="text-sm text-zinc-600 leading-relaxed mb-4 flex-1 break-words">"{t.text}"</p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 text-xs font-semibold shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{t.name}</p>
                      <p className="text-xs text-zinc-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* ─── Confiança — faixa curta de segurança e privacidade ─── */}
        <div className="max-w-5xl mx-auto w-full mt-14 lg:mt-20 pt-14 border-t border-zinc-200">
          <Reveal>
            <p className="text-center text-zinc-900 font-display font-bold text-xl md:text-2xl mb-10 text-balance">
              Seus dados financeiros são seus. Ponto.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="flex flex-col md:flex-row items-stretch justify-center gap-8 md:gap-0">
              {[
                { icon: Lock,        title: "Criptografia de ponta",   desc: "Dados protegidos em trânsito e em repouso, na infraestrutura do Supabase." },
                { icon: ShieldCheck, title: "Conforme a LGPD",         desc: "Você pode exportar ou apagar tudo o que é seu, quando quiser." },
                { icon: EyeOff,      title: "Nunca vendidos",          desc: "Sem anúncios, sem parceiros comerciais, sem uso dos seus dados para lucro." },
              ].map((item, i) => (
                <div key={item.title} className={`flex items-start gap-4 md:px-10 ${i > 0 ? "md:border-l md:border-zinc-200" : ""}`}>
                  <item.icon className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 mb-1">{item.title}</p>
                    <p className="text-sm text-zinc-600 leading-relaxed max-w-[26ch]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA FINAL — Textura + Dark
          ══════════════════════════════════════ */}
      <section id="cta" ref={ctaSectionRef} data-snap data-cursor="#34d399" className="min-h-screen lg:h-screen flex items-center justify-center px-6 py-20 lg:py-16 bg-zinc-950 relative overflow-hidden">
        {/* Dot grid emerald */}
        <div className="absolute inset-0 opacity-[0.09] pointer-events-none select-none" style={{
          backgroundImage: "radial-gradient(circle, #10b981 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />

        {/* Pistas invertidas — fecha a página com o mesmo gesto que a abriu */}
        <TraceReveal ghostColor="#34d399" ghostOpacity={0.06} litColor="#34d399" />

        {/* Ruído de textura */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }} />

        {/* Logo centralizada, ultra-discreta */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
          <img src="/favicon-light.png" alt="" className="w-[55%] h-[55%] object-contain opacity-[0.04]" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>

        {/* Conteúdo */}
        <Reveal>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Social proof pill */}
          <div className="inline-flex items-center gap-3 mb-8 bg-white/5 rounded-full px-4 py-2 border border-white/10">
            <div className="flex -space-x-2">
              {["L","A","P","C","R"].map((l, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-[8px] font-bold text-zinc-300">
                  {l}
                </div>
              ))}
            </div>
            <p className="text-zinc-400 text-xs">
              <span className="font-bold text-white">847</span> usuários economizaram hoje
            </p>
          </div>

          <h2
            className="leading-[1.05] mb-6 text-balance"
            style={{ fontSize: "clamp(2.6rem, 7vw, 5.5rem)" }}
          >
            <span className="font-display font-normal text-white">A consciência de saber para onde vai cada </span>
            <span className="font-display font-bold text-emerald-400">real.</span>
          </h2>

          <div className="mb-1">
            <span className="text-5xl font-display font-bold text-emerald-400">
              R$ <AnimatedCounter target={1247390} active={ctaVisible} />
            </span>
          </div>
          <p className="text-zinc-400 text-sm mb-10">economizados pelos usuários este mês</p>

          <div className="flex justify-center mb-8">
            <button
              type="button"
              onClick={() => navigate("/login?mode=signup")}
              className="group px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97] text-white font-bold text-base rounded-xl transition-all shadow-2xl shadow-emerald-900/60 flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Começar grátis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <p className="text-zinc-500 text-sm">
            O que não é monitorado dificilmente é multiplicado.
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
            <img src="/favicon-light.png" alt="Hedge" className="w-5 h-5" />
            <span className="font-display text-sm font-semibold text-zinc-900">Hedge</span>
            <span className="text-xs text-zinc-500 ml-1">© {new Date().getFullYear()}</span>
          </div>
          <p className="text-xs text-zinc-500">Suas contas na régua.</p>
        </div>
      </footer>
    </div>
  );
};
