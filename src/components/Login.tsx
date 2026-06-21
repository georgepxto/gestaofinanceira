import React, { useEffect, useRef, useState } from "react";
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  User,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CursorDot } from "./CursorDot";

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ error?: string }>;
  onSignUp: (
    email: string,
    password: string,
    nome: string
  ) => Promise<{ error?: string }>;
}

type ViewMode = "login" | "signup" | "forgot";

/* Mesmas pistas de gasto fantasma do hero da landing — aqui reveladas pelo
   cursor agindo como lanterna, igual ao efeito original */
const GHOST_TRACES = [
  { t: "iFood · R$ 34,90",         c: "Alimentação", x: 6,  y: 14, r: -1.2 },
  { t: "Netflix · R$ 44,90",       c: "Streaming",   x: 40, y: 8,  r: 1 },
  { t: "Mercado · R$ 212,07",      c: "Alimentação", x: 22, y: 26, r: -0.6 },
  { t: "Pix recebido · R$ 350,00", c: "Renda",        x: 52, y: 18, r: 0.8 },
  { t: "Aluguel · R$ 1.400,00",    c: "Moradia",      x: 10, y: 62, r: 0.6 },
  { t: "Academia · R$ 89,90",      c: "Saúde",        x: 38, y: 70, r: -0.9 },
  { t: "Spotify · R$ 21,90",       c: "Streaming",   x: 24, y: 84, r: 1.1 },
  { t: "Cinema · R$ 52,00",        c: "Lazer",        x: 68, y: 12, r: -0.7 },
  { t: "Farmácia · R$ 67,30",      c: "Saúde",        x: 80, y: 32, r: 0.5 },
  { t: "Internet · R$ 99,90",      c: "Moradia",      x: 64, y: 52, r: -1.1 },
  { t: "Café · R$ 8,50",           c: "Alimentação", x: 86, y: 66, r: 1.3 },
  { t: "Gasolina · R$ 180,00",     c: "Transporte",   x: 70, y: 84, r: -0.5 },
  { t: "Uber · R$ 18,50",          c: "Transporte",   x: 90, y: 90, r: 0.9 },
];

const HEDGE_STATS = [
  { value: "100%", label: "Gratuito para sempre" },
  { value: "5min", label: "Para começar" },
  { value: "Zero", label: "Anúncios ou cobranças" },
];

/* Camada fantasma mostra só o gasto; a lanterna (cursor) revela a categoria
   por baixo — mesmo gesto do hero, recriado aqui sem depender do GSAP */
function LoginGhostTrace() {
  const rootRef = useRef<HTMLDivElement>(null);
  const litRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const lit = litRef.current;
    if (!root || !lit) return;
    const host = root.parentElement ?? root;

    const setMask = (x: number, y: number) => {
      const m = `radial-gradient(circle 170px at ${x}px ${y}px, black 0%, rgba(0,0,0,0.35) 60%, transparent 100%)`;
      lit.style.opacity = "1";
      lit.style.webkitMaskImage = m;
      lit.style.maskImage = m;
    };

    let rafId = 0;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setMask(x, y));
    };
    const onLeave = () => { lit.style.opacity = "0"; };

    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={rootRef} className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
      <div className="absolute inset-0">
        {GHOST_TRACES.map((g) => (
          <span
            key={g.t}
            className="absolute font-mono text-xs whitespace-nowrap text-zinc-900/[0.06]"
            style={{ left: `${g.x}%`, top: `${g.y}%`, transform: `rotate(${g.r}deg)` }}
          >
            {g.t}
          </span>
        ))}
      </div>
      <div ref={litRef} className="absolute inset-0" style={{ opacity: 0, transition: "opacity 0.3s" }}>
        {GHOST_TRACES.map((g) => (
          <span
            key={g.t}
            className="absolute font-mono text-xs font-semibold whitespace-nowrap text-emerald-600"
            style={{ left: `${g.x}%`, top: `${g.y}%`, transform: `rotate(${g.r}deg)` }}
          >
            {g.t}
            <span className="text-emerald-500/70">{" → "}{g.c}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Login({ onLogin, onSignUp }: LoginProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(
    searchParams.get("mode") === "signup"
  );

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError("Serviço indisponível");
      return;
    }
    setError(null);
    setLoading(true);
    // Salvar modo (login ou signup) para verificar no retorno do OAuth
    localStorage.setItem("oauth_mode", viewMode);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch {
      setError("Erro ao conectar com Google");
      setLoading(false);
    }
  };

  // Ler erro de OAuth redirect (ex: conta Google não cadastrada)
  React.useEffect(() => {
    const authError = localStorage.getItem("auth_error");
    if (authError) {
      setError(authError);
      localStorage.removeItem("auth_error");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (viewMode === "forgot") {
      if (!email) {
        setError("Informe seu email");
        return;
      }
      if (!supabase) {
        setError("Serviço indisponível");
        return;
      }
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          setError(error.message);
        } else {
          setSuccess("Email de recuperação enviado! Verifique sua caixa de entrada.");
        }
      } catch {
        setError("Erro ao enviar email de recuperação");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError("Preencha todos os campos");
      return;
    }

    if (viewMode === "signup" && !nome.trim()) {
      setError("Preencha seu nome");
      return;
    }

    if (viewMode === "signup" && password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (viewMode === "signup" && password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      if (viewMode === "login") {
        const result = await onLogin(email, password);
        if (result.error) {
          setError(result.error);
          // Detectar se é bloqueio por tentativas
          if (result.error.includes("bloqueada") || result.error.includes("Bloqueada")) {
            setIsBlocked(true);
          }
        }
      } else {
        const result = await onSignUp(email, password, nome.trim());
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess(
            "Conta criada com sucesso! Verifique seu email para confirmar."
          );
          setViewMode("login");
          setPassword("");
          setConfirmPassword("");
          setNome("");
        }
      }
    } catch {
      setError("Erro ao processar sua solicitação");
    } finally {
      setLoading(false);
    }
  };

  const switchView = (newView: ViewMode, openEmailForm = false) => {
    setViewMode(newView);
    setError(null);
    setSuccess(null);
    setIsBlocked(false);
    setShowEmailForm(openEmailForm);
  };

  return (
    <div className="login-root relative min-h-screen bg-white flex overflow-hidden" style={{ colorScheme: "light" }}>
      <CursorDot />
      <style>{`
        @keyframes pista-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        .pista-underline-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: pista-draw 0.7s 1.3s cubic-bezier(0.65,0,0.35,1) forwards; }
        @keyframes reveal-in { from { opacity: 0; transform: translateY(28px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .reveal-up { opacity: 0; animation: reveal-in 1.2s cubic-bezier(0.22,1,0.36,1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .pista-underline-draw { animation: none; stroke-dashoffset: 0; }
          .reveal-up { animation: none; opacity: 1; transform: none; }
        }
        @media (hover: hover) and (pointer: fine) { .login-root, .login-root * { cursor: none !important; } }
      `}</style>
      {/* Jogo de luzes — vários focos esverdeados de intensidade e posição
          diferentes, espalhados pela página inteira */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 10% 10%, rgba(110,231,183,0.20), transparent 45%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 85% 30%, rgba(16,185,129,0.16), transparent 50%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 25% 90%, rgba(4,120,87,0.14), transparent 50%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 95% 95%, rgba(110,231,183,0.12), transparent 45%)" }} />
      </div>

      {/* Pistas fantasma — agora por cima de toda a página, não só do painel
          de marca; o cursor revela a categoria em qualquer lugar da tela */}
      <LoginGhostTrace />

      {/* ══════════════════════════════════════
          PAINEL DE MARCA — visível a partir de lg, mesma linguagem da landing
          ══════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between px-14 py-12 overflow-hidden">
        <a href="/" className="reveal-up relative z-10 flex items-center gap-2.5 w-fit rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          <img src="/favicon-light.png" alt="Hedge" className="w-7 h-7" />
          <span className="font-display text-base font-bold tracking-tight text-zinc-900">Hedge</span>
        </a>

        <div className="reveal-up relative z-10 max-w-lg" style={{ animationDelay: "70ms" }}>
          <h2 className="font-display font-bold leading-[1.05] tracking-tight text-zinc-900 text-balance mb-6" style={{ fontSize: "clamp(2.75rem, 4.4vw, 3.75rem)" }}>
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
                  pathLength={1}
                  className="pista-underline-draw"
                />
              </svg>
              <span style={{ position: "relative", zIndex: 1 }}>pistas</span>
            </span>
            .<br />
            <span className="text-emerald-500">Nós revelamos o caminho.</span>
          </h2>
          <p className="text-zinc-600 text-lg leading-relaxed max-w-md">
            Entenda para onde seu dinheiro vai, identifique padrões e construa hábitos que fazem diferença.
          </p>
        </div>

        <div className="reveal-up relative z-10 grid grid-cols-3 gap-6 pt-8 border-t border-zinc-200/70" style={{ animationDelay: "240ms" }}>
          {HEDGE_STATS.map((s) => (
            <div key={s.label}>
              <p className="font-display text-xl font-bold text-zinc-900 mb-0.5">{s.value}</p>
              <p className="text-xs text-zinc-500 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          PAINEL DO FORMULÁRIO — cartão em vidro sobre os focos de luz
          ══════════════════════════════════════ */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <button
            onClick={() => navigate("/")}
            className="reveal-up flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-6 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <div className="reveal-up bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl shadow-emerald-900/5 rounded-3xl p-7 lg:p-9" style={{ animationDelay: "80ms" }}>
            {/* Logo — só aparece sem o painel de marca (mobile/tablet) */}
            <div className="text-center mb-7 lg:hidden">
              <div className="inline-flex items-center justify-center w-9 h-9 mb-3">
                <img src="/favicon-light.png" alt="Hedge" className="w-9 h-9" />
              </div>
              <h1 className="font-display text-xl font-bold tracking-tight text-zinc-900">Hedge</h1>
            </div>

            <div className="reveal-up mb-6" style={{ animationDelay: "150ms" }}>
              {viewMode === "forgot" && (
                <button
                  type="button"
                  onClick={() => switchView("login")}
                  className="flex items-center gap-1 text-zinc-500 hover:text-zinc-900 text-sm mb-4 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao login
                </button>
              )}
              <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-900">
                {viewMode === "login" && "Bem-vindo de volta"}
                {viewMode === "signup" && "Crie sua conta"}
                {viewMode === "forgot" && "Recuperar senha"}
              </h2>
              <p className="text-zinc-500 text-sm mt-2">
                {viewMode === "login" && "Entre para continuar ao seu dashboard."}
                {viewMode === "signup" && "Leva menos de um minuto, sem cartão de crédito."}
                {viewMode === "forgot" && "Informe seu email para receber o link de redefinição."}
              </p>
            </div>

            {/* Google — primeiro, como atalho rápido */}
            {viewMode !== "forgot" && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="reveal-up w-full py-3 bg-white border border-zinc-200 text-zinc-700 font-medium rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  style={{ animationDelay: "220ms" }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continuar com Google
                </button>

                {showEmailForm ? (
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-zinc-200" />
                    <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Ou continue com email</span>
                    <div className="flex-1 h-px bg-zinc-200" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(true)}
                    className="w-full text-center text-sm text-zinc-500 hover:text-zinc-800 transition-colors mt-5"
                  >
                    Continuar com email
                  </button>
                )}
              </>
            )}

            <form
              onSubmit={handleSubmit}
              className={`reveal-up space-y-4 ${viewMode !== "forgot" && !showEmailForm ? "hidden" : ""}`}
              style={{ animationDelay: "290ms" }}
            >
              {/* Nome (apenas signup) */}
              {viewMode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-2">
                    Nome
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Seu nome"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/80 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {/* Senha */}
              {viewMode !== "forgot" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-white/80 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirmar Senha (apenas signup) */}
              {viewMode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-2">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {/* Esqueceu a senha (apenas login) */}
              {viewMode === "login" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => switchView("forgot")}
                    className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              {/* Erro */}
              {error && (
                <div className={`rounded-xl p-3 text-sm flex items-start gap-2 ${
                  isBlocked
                    ? "bg-red-100 border border-red-300 text-red-700"
                    : "bg-red-50 border border-red-200 text-red-600"
                }`}>
                  {isBlocked && <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                  <span>{error}</span>
                </div>
              )}

              {/* Sucesso */}
              {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-600 text-sm">
                  {success}
                </div>
              )}

              {/* Botão Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : viewMode === "login" ? (
                  <>Entrar <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
                ) : viewMode === "signup" ? (
                  <>Criar conta <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
                ) : (
                  "Enviar email"
                )}
              </button>
            </form>

            {/* Alternar entre Login e Signup */}
            {viewMode !== "forgot" && (
              <div className="reveal-up mt-6 text-center" style={{ animationDelay: "360ms" }}>
                <p className="text-zinc-500 text-sm">
                  {viewMode === "login" ? "Não tem uma conta?" : "Já tem uma conta?"}
                  <button
                    onClick={() => switchView(viewMode === "login" ? "signup" : "login")}
                    className="ml-2 text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    {viewMode === "login" ? "Cadastre-se" : "Fazer login"}
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
