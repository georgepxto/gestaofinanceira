import React, { useState } from "react";
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  User,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ error?: string }>;
  onSignUp: (
    email: string,
    password: string,
    nome: string
  ) => Promise<{ error?: string }>;
}

type ViewMode = "login" | "signup" | "forgot";

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

  const switchView = (newView: ViewMode) => {
    setViewMode(newView);
    setError(null);
    setSuccess(null);
    setIsBlocked(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0B0F19] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to landing */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-8 h-8 mb-4">
            <img src="/favicon-light.png" alt="Hedge" className="w-8 h-8 dark:hidden" />
            <img src="/favicon-dark.png" alt="Hedge" className="w-8 h-8 hidden dark:block" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Hedge
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {viewMode === "login" && "Controle de finanças"}
            {viewMode === "signup" && "Crie sua conta"}
            {viewMode === "forgot" && "Recuperar senha"}
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Voltar (apenas forgot) */}
            {viewMode === "forgot" && (
              <button
                type="button"
                onClick={() => switchView("login")}
                className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 text-sm mb-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </button>
            )}

            {/* Nome (apenas signup) */}
            {viewMode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Nome
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Seu nome"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Senha */}
            {viewMode !== "forgot" && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400"
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
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
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
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : viewMode === "login" ? (
                "Entrar"
              ) : viewMode === "signup" ? (
                "Criar Conta"
              ) : (
                "Enviar Email"
              )}
            </button>
          </form>

          {/* Separador + Google Login */}
          {viewMode !== "forgot" && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">ou</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continuar com Google
              </button>
            </>
          )}

          {/* Alternar entre Login e Signup */}
          {viewMode !== "forgot" && (
            <div className="mt-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {viewMode === "login" ? "Não tem uma conta?" : "Já tem uma conta?"}
                <button
                  onClick={() => switchView(viewMode === "login" ? "signup" : "login")}
                  className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  {viewMode === "login" ? "Criar conta" : "Fazer login"}
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
          Gerencie suas finanças de forma simples
        </p>
      </div>
    </div>
  );
}
