import React, { useState } from "react";
import {
  DollarSign,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  User,
  ArrowLeft,
} from "lucide-react";
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
  const [viewMode, setViewMode] = useState<ViewMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl mb-4">
            <DollarSign className="w-7 h-7 text-white stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Reppago
          </h1>
          <p className="text-gray-400 mt-2">
            {viewMode === "login" && "Controle de finanças"}
            {viewMode === "signup" && "Crie sua conta"}
            {viewMode === "forgot" && "Recuperar senha"}
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Voltar (apenas forgot) */}
            {viewMode === "forgot" && (
              <button
                type="button"
                onClick={() => switchView("login")}
                className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </button>
            )}

            {/* Nome (apenas signup) */}
            {viewMode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Seu nome"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Senha */}
            {viewMode !== "forgot" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-xl p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Sucesso */}
            {success && (
              <div className="bg-green-900/50 border border-green-700 rounded-xl p-3 text-green-300 text-sm">
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

          {/* Alternar entre Login e Signup */}
          {viewMode !== "forgot" && (
            <div className="mt-6 text-center">
              <p className="text-gray-400">
                {viewMode === "login" ? "Não tem uma conta?" : "Já tem uma conta?"}
                <button
                  onClick={() => switchView(viewMode === "login" ? "signup" : "login")}
                  className="ml-2 text-blue-400 hover:text-blue-300 font-medium"
                >
                  {viewMode === "login" ? "Criar conta" : "Fazer login"}
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Gerencie suas finanças de forma simples
        </p>
      </div>
    </div>
  );
}
