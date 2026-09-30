import React, { useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./landing/landing.css";
import { LiveBalanceCard } from "./landing/LiveBalanceCard";
import { HedgeLogo } from "./landing/HedgeMark";
import { MarkGhost } from "./landing/MarkGhost";

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ error?: string }>;
  onSignUp: (
    email: string,
    password: string,
    nome: string
  ) => Promise<{ error?: string }>;
}

type ViewMode = "login" | "signup" | "forgot";

/* ── Google Identity Services (GIS) ─────────────────────────────────────
   Com o client ID configurado, o login Google usa signInWithIdToken: o
   popup mostra o nome do app (sem "to continue to …supabase.co") e não há
   redirect de página. Sem client ID, cai no fluxo OAuth padrão do Supabase. */
const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (
            el: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

let gisScriptPromise: Promise<void> | null = null;
function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisScriptPromise) {
    gisScriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        gisScriptPromise = null;
        reject(new Error("Falha ao carregar Google Identity Services"));
      };
      document.head.appendChild(s);
    });
  }
  return gisScriptPromise;
}

export function Login({ onLogin, onSignUp }: LoginProps) {
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
  // Campo que causou o erro de validação: recebe o foco e aria-invalid.
  const [errorField, setErrorField] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(
    searchParams.get("mode") === "signup"
  );


  // Celular: o monograma só aparece se o espaço acima do formulário tiver
  // altura para ele (numa tela baixa vira uma fresta). Medido, não por
  // container query: a altura desse espaço vem do flex e a query a lê como 0.
  const [markSpace, setMarkSpace] = useState<HTMLDivElement | null>(null);
  const [roomForMark, setRoomForMark] = useState(false);
  useEffect(() => {
    if (!markSpace) return;
    const ro = new ResizeObserver(([e]) => setRoomForMark(e.contentRect.height >= 160));
    ro.observe(markSpace);
    return () => ro.disconnect();
  }, [markSpace]);

  const gisContainerRef = useRef<HTMLDivElement>(null);
  const [gisReady, setGisReady] = useState(false);

  // Fallback: fluxo OAuth com redirect (usado quando GIS não está disponível)
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

  /* Callback do GIS vive num ref para o initialize (executado uma vez)
     sempre enxergar o viewMode/estado atuais */
  const credentialHandlerRef = useRef<(token: string) => void>(() => {});
  const authPollRef = useRef(0);
  useEffect(() => () => window.clearInterval(authPollRef.current), []);
  credentialHandlerRef.current = async (token: string) => {
    if (!supabase) {
      setError("Serviço indisponível");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    // Mesmo contrato do fluxo OAuth: useAuth lê oauth_mode no onAuthStateChange
    localStorage.setItem("oauth_mode", viewMode);
    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // Sucesso: useAuth troca a tela via onAuthStateChange. Se o login for
      // bloqueado (conta Google inexistente em modo login), o useAuth grava
      // auth_error no localStorage sem reload — vigiar por alguns segundos.
      const started = Date.now();
      window.clearInterval(authPollRef.current);
      const timer = (authPollRef.current = window.setInterval(() => {
        const authError = localStorage.getItem("auth_error");
        if (authError) {
          localStorage.removeItem("auth_error");
          setError(authError);
          setLoading(false);
          window.clearInterval(timer);
        } else if (Date.now() - started > 10000) {
          window.clearInterval(timer);
        }
      }, 400));
    } catch {
      setError("Erro ao conectar com Google");
      setLoading(false);
    }
  };

  // Carregar e inicializar o GIS uma única vez
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !supabase) return;
    let cancelled = false;
    loadGisScript()
      .then(() => {
        if (cancelled || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: "popup",
          callback: (response) => credentialHandlerRef.current(response.credential),
        });
        setGisReady(true);
      })
      .catch(() => {
        // Sem GIS o botão custom segue com o fluxo OAuth de redirect
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Renderizar o botão oficial (invisível, sobreposto ao botão custom)
  useEffect(() => {
    const el = gisContainerRef.current;
    if (!gisReady || !el || !window.google) return;
    el.innerHTML = "";
    window.google.accounts.id.renderButton(el, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      width: Math.max(
        200,
        Math.min(400, Math.floor(el.parentElement?.offsetWidth ?? 400))
      ),
    });
  }, [gisReady, viewMode, loading]);

  // Ler erro de OAuth redirect (ex: conta Google não cadastrada)
  React.useEffect(() => {
    const authError = localStorage.getItem("auth_error");
    if (authError) {
      setError(authError);
      localStorage.removeItem("auth_error");
    }
  }, []);

  const fail = (msg: string, field: string) => {
    setError(msg);
    setErrorField(field);
    document.getElementById(field)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setErrorField(null);

    if (viewMode === "forgot") {
      if (!email) {
        fail("Informe seu email", "login-email");
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

    if (viewMode === "signup" && !nome.trim()) {
      fail("Preencha seu nome", "login-nome");
      return;
    }

    if (!email) {
      fail("Informe seu email", "login-email");
      return;
    }

    if (!password) {
      fail("Informe sua senha", "login-senha");
      return;
    }

    if (viewMode === "signup" && password.length < 6) {
      fail("A senha deve ter pelo menos 6 caracteres", "login-senha");
      return;
    }

    if (viewMode === "signup" && password !== confirmPassword) {
      fail("As senhas não coincidem", "login-confirma");
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
    setErrorField(null);
    setSuccess(null);
    setIsBlocked(false);
    setShowEmailForm(openEmailForm);
  };

  // A tela é sempre escura, como o hero: barra do navegador e fundo da página
  // acompanham enquanto ela está aberta.
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prevMeta = meta?.getAttribute("content") ?? null;
    const prevBg = document.documentElement.style.backgroundColor;
    meta?.setAttribute("content", "#0B0B0C");
    document.documentElement.style.backgroundColor = "#0B0B0C";
    return () => {
      if (prevMeta !== null) meta?.setAttribute("content", prevMeta);
      document.documentElement.style.backgroundColor = prevBg;
    };
  }, []);

  const TITLES: Record<ViewMode, { h: string; p: string }> = {
    login: { h: "Entrar", p: "Continue de onde parou." },
    signup: { h: "Criar conta", p: "Leva menos de um minuto. Não pede cartão." },
    forgot: { h: "Recuperar senha", p: "Enviamos um link para você criar uma senha nova." },
  };
  const d = (ms: number) => ({ "--lp-d": `${ms}ms` }) as React.CSSProperties;
  const fieldA11y = (id: string) => ({
    "aria-invalid": errorField === id || undefined,
    "aria-describedby": error && showForm ? "login-erro" : undefined,
  });
  const showForm = viewMode === "forgot" || showEmailForm;
  const linkBtn = "inline-flex min-h-[44px] items-center underline decoration-lp-line decoration-1 underline-offset-4 transition-colors hover:decoration-lp-fg";

  return (
    <div className="lp min-h-[100svh] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" data-theme="dark">
      {/* ── Formulário ─────────────────────────────────────────────── */}
      <div className="relative flex min-h-[100svh] flex-col overflow-hidden pb-[max(24px,env(safe-area-inset-bottom))] pl-[max(20px,env(safe-area-inset-left))] pr-[max(20px,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] sm:px-10 lg:px-14">
        <header className="relative flex h-16 items-center justify-between">
          <Link to="/" aria-label="Hedge, página inicial" className="inline-flex min-h-[44px] items-center text-[19px] font-medium">
            <HedgeLogo accent />
          </Link>
          <Link to="/" className="lp-navlink text-[15px]">
            Voltar ao site
          </Link>
        </header>

        {/* Celular: sem o painel do lado, o monograma ocupa o espaço que sobra
            entre o topo e o formulário, e o formulário desce para perto do
            polegar. O tamanho vem desse espaço, então ele nunca cruza o
            texto. Com o formulário de email aberto, o espaço vai para ele. */}
        {!showForm && (
          <div ref={setMarkSpace} aria-hidden="true" className="pointer-events-none relative min-h-0 flex-1 lg:hidden">
            {roomForMark && <MarkGhost className="-right-[10%] top-4 h-[calc(100%-16px)]" />}
          </div>
        )}

        <main className={`relative flex py-10 lg:flex-1 lg:items-center ${showForm ? "flex-1 items-center" : "items-end"}`}>
          <div className="w-full max-w-[380px]">
            <div key={viewMode} className="lp-rise" style={d(0)}>
              <h1 className="lp-h2">{TITLES[viewMode].h}</h1>
              <p className="lp-lede mt-3 text-[16px]">{TITLES[viewMode].p}</p>
            </div>

            {/* Google primeiro, como atalho */}
            {viewMode !== "forgot" && (
              <div className="lp-rise mt-9" style={d(90)}>
                <div className="lp-google-wrap relative">
                  <button
                    type="button"
                    onClick={gisReady ? undefined : handleGoogleLogin}
                    disabled={loading}
                    tabIndex={gisReady ? -1 : 0}
                    aria-hidden={gisReady || undefined}
                    className="lp-google flex h-12 w-full items-center justify-center gap-3 rounded-[3px] text-[15px] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continuar com Google
                  </button>
                  {/* Botão oficial do Google, invisível por cima do desenhado:
                      o clique real cai no iframe do GIS (popup no domínio do
                      app), mantendo o visual do botão acima */}
                  {gisReady && !loading && (
                    <div className="absolute inset-0 overflow-hidden rounded-[3px]" style={{ opacity: 0.001 }}>
                      <div
                        ref={gisContainerRef}
                        className="flex h-full w-full items-center justify-center"
                        style={{ transform: "scaleY(1.25)" }}
                      />
                    </div>
                  )}
                </div>

                {showEmailForm ? (
                  <div className="mt-7 flex items-center gap-4 text-[13px] text-lp-muted">
                    <span className="h-px flex-1 bg-lp-line" />
                    ou com email
                    <span className="h-px flex-1 bg-lp-line" />
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowEmailForm(true)} className="lp-link mt-5 w-full justify-center text-[15px]">
                    Continuar com email
                  </button>
                )}
              </div>
            )}

            {showForm && (
              <form
                key={`form-${viewMode}`}
                onSubmit={handleSubmit}
                noValidate
                className={`lp-rise flex flex-col gap-6 ${viewMode === "forgot" ? "mt-9" : "mt-7"}`}
                style={d(viewMode === "forgot" ? 90 : 0)}
              >
                {viewMode === "signup" && (
                  <div>
                    <label htmlFor="login-nome" className="text-[13px] text-lp-muted">Nome</label>
                    <input
                      id="login-nome" {...fieldA11y("login-nome")}
                      type="text"
                      autoComplete="name"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Como quer ser chamado"
                      className="lp-input lp-field mt-1 w-full bg-transparent pb-3 pt-2 text-[16px]"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="login-email" className="text-[13px] text-lp-muted">Email</label>
                  <input
                    id="login-email" {...fieldA11y("login-email")}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="lp-input lp-field mt-1 w-full bg-transparent pb-3 pt-2 text-[16px]"
                  />
                </div>

                {viewMode !== "forgot" && (
                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="login-senha" className="text-[13px] text-lp-muted">Senha</label>
                      {viewMode === "login" && (
                        <button type="button" onClick={() => switchView("forgot")} className={`-my-3 text-[13px] ${linkBtn} text-lp-muted hover:text-lp-fg`}>
                          Esqueceu a senha?
                        </button>
                      )}
                    </div>
                    <div className="lp-field mt-1 flex items-center">
                      <input
                        id="login-senha" {...fieldA11y("login-senha")}
                        type={showPassword ? "text" : "password"}
                        autoComplete={viewMode === "signup" ? "new-password" : "current-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={viewMode === "signup" ? "Pelo menos 6 caracteres" : ""}
                        className="lp-input w-full min-w-0 bg-transparent pb-3 pt-2 text-[16px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                        aria-pressed={showPassword}
                        className="-mr-2 mb-1 flex h-11 w-11 shrink-0 items-center justify-center text-lp-muted transition-colors hover:text-lp-fg"
                      >
                        {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.5} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.5} />}
                      </button>
                    </div>
                  </div>
                )}

                {viewMode === "signup" && (
                  <div>
                    <label htmlFor="login-confirma" className="text-[13px] text-lp-muted">Confirmar senha</label>
                    <input
                      id="login-confirma" {...fieldA11y("login-confirma")}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="lp-input lp-field mt-1 w-full bg-transparent pb-3 pt-2 text-[16px]"
                    />
                  </div>
                )}

                {error && (
                  <div id="login-erro" role="alert" className="lp-swap flex items-start gap-3 rounded-[3px] bg-lp-surface px-4 py-3 text-[14px] leading-snug">
                    {isBlocked ? (
                      <ShieldAlert className="mt-px h-[18px] w-[18px] shrink-0 text-lp-acc" strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lp-acc" aria-hidden="true" />
                    )}
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div role="status" className="lp-swap flex items-start gap-3 rounded-[3px] bg-lp-surface px-4 py-3 text-[14px] leading-snug">
                    <Check className="mt-px h-[18px] w-[18px] shrink-0 text-lp-muted" strokeWidth={1.75} aria-hidden="true" />
                    <span>{success}</span>
                  </div>
                )}

                <button type="submit" disabled={loading} className="lp-btn lp-btn-lg mt-1 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? (
                    <>
                      <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
                      {viewMode === "forgot" ? "Enviando" : viewMode === "signup" ? "Criando conta" : "Entrando"}
                    </>
                  ) : viewMode === "login" ? "Entrar" : viewMode === "signup" ? "Criar conta" : "Enviar link"}
                </button>
              </form>
            )}

            {/* Mensagem fora do formulário (ex.: erro do Google antes de abrir o email) */}
            {!showForm && (error || success) && (
              <div role={error ? "alert" : "status"} className="lp-swap mt-6 flex items-start gap-3 rounded-[3px] bg-lp-surface px-4 py-3 text-[14px] leading-snug">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lp-acc" aria-hidden="true" />
                <span>{error ?? success}</span>
              </div>
            )}

            <p className="lp-rise mt-9 text-[15px] text-lp-muted" style={d(180)}>
              {viewMode === "forgot" ? (
                <>
                  Lembrou?{" "}
                  <button type="button" onClick={() => switchView("login", true)} className={`${linkBtn} text-lp-fg`}>
                    Voltar para entrar
                  </button>
                </>
              ) : (
                <>
                  {viewMode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
                  <button
                    type="button"
                    onClick={() => switchView(viewMode === "login" ? "signup" : "login", viewMode === "login")}
                    className={`${linkBtn} text-lp-fg`}
                  >
                    {viewMode === "login" ? "Criar conta" : "Entrar"}
                  </button>
                </>
              )}
            </p>
          </div>
        </main>

        <footer className="text-[13px] text-lp-muted">Gratuito, sem anúncios. Seus dados nunca são vendidos.</footer>
      </div>

      {/* ── O app, ao vivo (só no desktop) ────────────────────────────── */}
      <aside
        aria-label="Exemplo do Hedge"
        className="relative hidden items-center justify-center overflow-hidden lg:flex"
        style={{ borderLeft: "1px solid var(--lp-line)" }}
      >
        <MarkGhost className="left-1/2 top-1/2 h-[84%] -translate-x-1/2 -translate-y-1/2" />
        <div className="lp-rise relative w-full max-w-[540px] px-10" style={d(240)}>
          <LiveBalanceCard />
          <p className="mt-2 text-center text-[13px] text-lp-muted">A casa de exemplo "Apê 302". A sua começa vazia.</p>
        </div>
      </aside>
    </div>
  );
}
