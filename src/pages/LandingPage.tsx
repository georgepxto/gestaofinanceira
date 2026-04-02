import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import {
  Wallet,
  Users,
  CreditCard,
  Target,
  Building2,
  ArrowRight,
  Shield,
  FileText,
  TrendingUp,
  PieChart,
  CheckCircle2,
  Star,
  ChevronDown,
  Bell,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════
   SCROLL REVEAL
   ═══════════════════════════════════ */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; obs.unobserve(el); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={className} style={{ opacity: 0, transform: "translateY(36px)", transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms` }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════ */
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let s = 0; const step = Math.ceil(end / 40);
        const t = setInterval(() => { s += step; if (s >= end) { s = end; clearInterval(t); } setVal(s); }, 30);
        obs.unobserve(e.target);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{val.toLocaleString("pt-BR")}{suffix}</span>;
}

/* ═══════════════════════════════════
   MINI CHART COMPONENTS (for feature cards)
   ═══════════════════════════════════ */
function MiniBarChart() {
  const bars = [35, 55, 40, 70, 50, 80, 45, 65, 75, 55, 85, 60];
  return (
    <div className="flex items-end gap-[3px] h-12 mt-3">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-blue-500 to-blue-300 transition-all duration-500 hover:from-blue-600 hover:to-blue-400"
          style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

function MiniDonut({ pct, color }: { pct: number; color: string }) {
  const r = 18, c = 2 * Math.PI * r;
  return (
    <svg width="48" height="48" className="mt-2">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
      <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${c * pct} ${c * (1 - pct)}`} strokeDashoffset={c * 0.25}
        strokeLinecap="round" className="transition-all duration-700" />
      <text x="24" y="28" textAnchor="middle" className="fill-gray-700 text-[10px] font-bold">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

function MiniLineChart() {
  return (
    <svg viewBox="0 0 120 40" className="w-full h-10 mt-3">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 35 L10 28 L20 30 L30 18 L40 22 L50 12 L60 15 L70 8 L80 14 L90 6 L100 10 L110 4 L120 2" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      <path d="M0 35 L10 28 L20 30 L30 18 L40 22 L50 12 L60 15 L70 8 L80 14 L90 6 L100 10 L110 4 L120 2 L120 40 L0 40 Z" fill="url(#lineGrad)" />
    </svg>
  );
}

/* ═══════════════════════════════════
   FEATURE DATA
   ═══════════════════════════════════ */
const features = [
  { icon: Wallet, tag: "Pessoal", title: "Gastos Pessoais", desc: "Registre despesas com categorias, parcelas e status de pagamento.", gradient: "from-blue-500/15 to-blue-600/5", iconBg: "bg-blue-500", visual: "bars" as const },
  { icon: Users, tag: "Compartilhado", title: "Gastos Compartilhados", desc: "Divida contas com amigos. Saiba quem pagou e quem deve.", gradient: "from-emerald-500/15 to-emerald-600/5", iconBg: "bg-emerald-500", visual: "line" as const },
  { icon: CreditCard, tag: "Cartões", title: "Cartões de Crédito", desc: "Gerencie faturas, limites e transações de todos os seus cartões.", gradient: "from-violet-500/15 to-violet-600/5", iconBg: "bg-violet-500", visual: "donut" as const },
  { icon: Target, tag: "Metas", title: "Metas de Gasto", desc: "Defina limites por categoria e acompanhe com barras visuais.", gradient: "from-amber-500/15 to-amber-600/5", iconBg: "bg-amber-500", visual: "progress" as const },
  { icon: Building2, tag: "Bancário", title: "Contas Bancárias", desc: "Acompanhe saldos de todas as suas contas em um só lugar.", gradient: "from-cyan-500/15 to-cyan-600/5", iconBg: "bg-cyan-500", visual: "line" as const },
  { icon: FileText, tag: "Relatórios", title: "Relatórios em PDF", desc: "Exporte relatórios detalhados com metas, categorias e totais.", gradient: "from-rose-500/15 to-rose-600/5", iconBg: "bg-rose-500", visual: "bars" as const },
];

const steps = [
  { num: "01", icon: CheckCircle2, title: "Crie sua conta gratuitamente", desc: "Cadastre-se com email ou Google em poucos segundos. Sem cartão de crédito." },
  { num: "02", icon: PieChart, title: "Registre seus gastos", desc: "Adicione despesas pessoais, compartilhadas e fixas de forma rápida e organizada." },
  { num: "03", icon: TrendingUp, title: "Assuma o controle", desc: "Visualize dashboards, defina metas e exporte relatórios PDF detalhados." },
];

const testimonials = [
  { name: "Lucas M.", role: "Freelancer", text: "Finalmente consigo ver para onde meu dinheiro vai. O dashboard é incrível.", stars: 5 },
  { name: "Ana C.", role: "Estudante", text: "Dividir gastos com meus colegas ficou muito mais fácil. Recomendo!", stars: 5 },
  { name: "Pedro R.", role: "Empreendedor", text: "As metas de gasto me ajudaram a economizar 30% no primeiro mês.", stars: 5 },
];

/* ═══════════════════════════════════
   FEATURE CARD VISUAL
   ═══════════════════════════════════ */
function FeatureVisual({ type }: { type: "bars" | "line" | "donut" | "progress" }) {
  if (type === "bars") return <MiniBarChart />;
  if (type === "line") return <MiniLineChart />;
  if (type === "donut") return (
    <div className="flex gap-3 mt-2">
      <MiniDonut pct={0.72} color="#8b5cf6" />
      <div className="flex flex-col justify-center gap-1">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-violet-500" /><span className="text-[10px] text-gray-500 dark:text-gray-400">Usado 72%</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700" /><span className="text-[10px] text-gray-500 dark:text-gray-400">Disponível</span></div>
      </div>
    </div>
  );
  // progress
  return (
    <div className="mt-3 space-y-2">
      {[{ label: "Alimentação", pct: 65, color: "bg-amber-400" }, { label: "Transporte", pct: 40, color: "bg-amber-300" }].map(b => (
        <div key={b.label}>
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-0.5"><span>{b.label}</span><span>{b.pct}%</span></div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className={`h-full ${b.color} rounded-full transition-all duration-700`} style={{ width: `${b.pct}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════ */
export const LandingPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-[#0B0F19] text-gray-800 dark:text-gray-100 overflow-x-hidden">
      {/* ===== CSS ===== */}
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes pulse-glow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        .float-1 { animation: float 6s ease-in-out infinite; }
        .float-2 { animation: float 8s ease-in-out infinite 1s; }
        .float-3 { animation: float 7s ease-in-out infinite 2s; }
        .shimmer-text { background-size: 200% auto; animation: shimmer 3s linear infinite; }
        .glow-pulse { animation: pulse-glow 4s ease-in-out infinite; }
      `}</style>

      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 backdrop-blur-2xl border-b border-gray-200 dark:border-gray-800/50 dark:border-gray-800/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={theme === "dark" ? "/favicon-dark.png" : "/favicon-light.png"} alt="Hedge" className="w-7 h-7" />
            <span className="text-lg font-bold tracking-tight text-gray-800 dark:text-gray-100">Hedge</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500 dark:text-gray-400">
            <a href="#features" className="hover:text-gray-800 dark:hover:text-gray-100 dark:text-gray-100 transition-colors">Funcionalidades</a>
            <a href="#how" className="hover:text-gray-800 dark:hover:text-gray-100 dark:text-gray-100 transition-colors">Como funciona</a>
            <a href="#reviews" className="hover:text-gray-800 dark:hover:text-gray-100 dark:text-gray-100 transition-colors">Depoimentos</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 dark:text-gray-100 transition-colors">
              Entrar
            </button>
            <button onClick={() => navigate("/login?mode=signup")} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-full transition-all shadow-lg shadow-gray-900/20 dark:shadow-white/10">
              Começar grátis
            </button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative pt-28 pb-8 md:pt-40 md:pb-16 px-6">
        {/* Animated glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-100/70 via-violet-50/30 to-transparent rounded-full blur-3xl glow-pulse" />
          <div className="absolute top-40 -left-60 w-[500px] h-[500px] bg-violet-100/40 rounded-full blur-3xl float-1" />
          <div className="absolute top-60 -right-60 w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-3xl float-2" />
          <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-blue-200/20 rounded-full blur-2xl float-3" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-8 shadow-sm">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              Gratuito &bull; Seguro &bull; Sem anúncios
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold leading-[1.06] tracking-tight mb-6 text-gray-800 dark:text-gray-100">
              Seu futuro financeiro
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-violet-500 to-emerald-500 bg-clip-text text-transparent shimmer-text">
                começa aqui
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Organize gastos pessoais e compartilhados, gerencie cartões, defina
              metas e exporte relatórios — tudo em um só lugar.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <button onClick={() => navigate("/login?mode=signup")}
                className="group px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2.5 text-base">
                Começar gratuitamente
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <a href="#features" className="flex items-center gap-1.5 px-6 py-3.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors text-base">
                Explorar funcionalidades
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </a>
            </div>
          </Reveal>
        </div>

        {/* ===== HERO MOCKUP ===== */}
        <Reveal delay={350}>
          <div className="relative max-w-5xl mx-auto">
            <div className="rounded-[1.5rem] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/80 shadow-2xl shadow-gray-300/40 overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 w-48">
                    <Search className="w-3 h-3" />
                    gethedge.vercel.app
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
                  <MoreHorizontal className="w-4 h-4 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
                </div>
              </div>

              <div className="flex">
                {/* Sidebar */}
                <div className="hidden md:flex flex-col w-52 border-r border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 gap-2">
                  <div className="flex items-center gap-2 mb-4">
                    <img src={theme === "dark" ? "/favicon-dark.png" : "/favicon-light.png"} alt="Hedge Logo" className="w-5 h-5" />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Hedge</span>
                  </div>
                  {["Dashboard", "Meus Gastos", "Gastos", "Cartões", "Metas", "Contas"].map((item, i) => (
                    <div key={item} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${i === 0 ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                      {[PieChart, Wallet, Users, CreditCard, Target, Building2][i] && (() => { const Icon = [PieChart, Wallet, Users, CreditCard, Target, Building2][i]; return <Icon className="w-3.5 h-3.5" />; })()}
                      {item}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 p-5 md:p-6">
                  {/* Greeting */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Olá, Usuário! 👋</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">Março 2026</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white dark:text-gray-100/90 text-xs font-bold">G</div>
                  </div>

                  {/* Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {[
                      { label: "Saldo Total", value: "R$ 4.274", icon: Wallet, iconColor: "text-emerald-600" },
                      { label: "A Receber", value: "R$ 2.031", icon: Users, iconColor: "text-blue-600" },
                      { label: "Receitas Fixas", value: "R$ 5.350", icon: TrendingUp, iconColor: "text-green-600" },
                      { label: "Gastos Fixos", value: "R$ 479", icon: CreditCard, iconColor: "text-amber-600" },
                    ].map((c) => (
                      <div key={c.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 md:p-4 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <c.icon className={`w-3.5 h-3.5 ${c.iconColor}`} />
                          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{c.label}</span>
                        </div>
                        <p className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-100">{c.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart + Recent transactions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Gastos por mês</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400">Últimos 12 meses</span>
                      </div>
                      <div className="flex items-end gap-1.5 h-28">
                        {[35, 55, 42, 68, 52, 75, 48, 62, 80, 58, 72, 90].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-blue-500 to-blue-300 hover:from-blue-600 hover:to-blue-400 transition-all cursor-pointer relative group"
                            style={{ height: `${h}%` }}>
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white dark:bg-gray-900 text-white dark:text-gray-100/90 text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              R$ {Math.round(h * 45)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2">
                        {["Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez", "Jan", "Fev"].map(m => (
                          <span key={m} className="text-[8px] text-gray-400 dark:text-gray-500 dark:text-gray-400 flex-1 text-center">{m}</span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 block">Últimos gastos</span>
                      {[
                        { name: "Supermercado", val: "-R$ 234", cat: "🛒" },
                        { name: "Uber", val: "-R$ 28", cat: "🚗" },
                        { name: "Netflix", val: "-R$ 45", cat: "🎬" },
                        { name: "Salário", val: "+R$ 5.200", cat: "💰", positive: true },
                      ].map((t) => (
                        <div key={t.name} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{t.cat}</span>
                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{t.name}</span>
                          </div>
                          <span className={`text-xs font-semibold ${"positive" in t ? "text-emerald-600" : "text-gray-600 dark:text-gray-400"}`}>{t.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== STATS ===== */}
      <Reveal>
        <section className="py-14 px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 100, suffix: "%", label: "Gratuito para sempre" },
              { value: 12, suffix: "+", label: "Funcionalidades" },
              { value: 5, suffix: "min", label: "Para começar" },
              { value: 0, suffix: "", label: "Anúncios", display: "Zero" },
            ].map((s) => (
              <div key={s.label} className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                <p className="text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-gray-100 mb-1">
                  {s.display || <Counter end={s.value} suffix={s.suffix} />}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 dark:border-blue-800/30 text-xs font-semibold text-blue-600 mb-5">
                Funcionalidades
              </span>
              <h2 className="text-3xl md:text-[2.75rem] font-extrabold text-gray-800 dark:text-gray-100 mb-4 leading-tight">
                Tudo para organizar<br />suas finanças
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto font-medium">
                Ferramentas poderosas e intuitivas — sem complicação, sem mensalidade.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 70}>
                <div className={`group relative h-full p-6 rounded-[1.5rem] bg-gradient-to-br ${f.gradient} border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-xl hover:shadow-gray-200/60 dark:hover:shadow-2xl dark:hover:shadow-black/80 hover:-translate-y-1 dark:hover:bg-white/[0.02] transition-all duration-300 cursor-default overflow-hidden`}>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 backdrop-blur-sm">
                    {f.tag}
                  </span>
                  <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center mb-3 shadow-md`}>
                    <f.icon className="w-[18px] h-[18px] text-white" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1.5">{f.title}</h3>
                  <p className="text-[0.85rem] text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                  <FeatureVisual type={f.visual} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section id="how" className="py-20 md:py-28 px-6 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 dark:border-emerald-800/30 text-xs font-semibold text-emerald-600 mb-5">
                Como funciona
              </span>
              <h2 className="text-3xl md:text-[2.75rem] font-extrabold text-gray-800 dark:text-gray-100 mb-4 leading-tight">
                Três passos para o<br />controle total
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto font-medium">
                Comece a organizar suas finanças em minutos.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((s, i) => (
              <Reveal key={s.num} delay={i * 100}>
                <div className="relative bg-[#FAFBFF] dark:bg-[#0B0F19] rounded-[1.5rem] p-7 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 group">
                  <span className="text-6xl font-black bg-gradient-to-b from-gray-200 to-gray-100 bg-clip-text text-transparent absolute top-4 right-5 select-none group-hover:from-blue-200 group-hover:to-blue-100 transition-all duration-300">
                    {s.num}
                  </span>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20">
                    <s.icon className="w-5 h-5 text-white dark:text-gray-100/90" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{s.title}</h3>
                  <p className="text-[0.9rem] text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 md:-right-5 w-8 md:w-10 border-t-2 border-dashed border-gray-200 dark:border-gray-800 z-10" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DEPOIMENTOS ===== */}
      <section id="reviews" className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 dark:border-amber-800/30 text-xs font-semibold text-amber-600 mb-5">
                <Star className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" />
                Depoimentos
              </span>
              <h2 className="text-3xl md:text-[2.75rem] font-extrabold text-gray-800 dark:text-gray-100 mb-4 leading-tight">
                O que nossos usuários<br />estão dizendo
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div className="p-6 rounded-[1.5rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300">
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-5 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white dark:text-gray-100/90 text-xs font-bold">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="py-20 md:py-28 px-6">
        <Reveal>
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-100/50 rounded-full blur-[100px]" />
            </div>
            <div className="text-center p-10 md:p-16 rounded-[2rem] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl shadow-gray-900/30 relative overflow-hidden">
              {/* Subtle grid pattern */}
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
                  Pronto para assumir o<br />controle financeiro?
                </h2>
                <p className="text-gray-400 dark:text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto text-base">
                  Crie sua conta gratuitamente e comece a organizar suas finanças hoje.
                </p>
                <button onClick={() => navigate("/login?mode=signup")}
                  className="group px-8 py-4 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2.5 mx-auto text-base">
                  Criar conta grátis
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 px-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/favicon-light.png" alt="Hedge" className="w-5 h-5" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Hedge</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 ml-1">© {new Date().getFullYear()}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 font-medium">Suas contas na régua.</p>
        </div>
      </footer>
    </div>
  );
};
