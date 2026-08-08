import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAppContext } from "../context";
import { PageErrorState, PageSuccessState } from "../components/ui/AsyncState";
import { toActionableErrorMessage } from "../utils/feedbackMessages";
import { Card } from "../components/ui/Card";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Se não estiver logado (o link de reset obrigatoriamente loga o usuário)
  // redirecionamos por segurança
  React.useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      if (!supabase) throw new Error("Supabase não configurado");

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess("Senha atualizada com sucesso! Redirecionando...");
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar a senha");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-app-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o App
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-8 h-8 mb-4">
            <img src="/favicon-light.png" alt="Hedge" className="w-8 h-8 dark:hidden" />
            <img src="/favicon-dark.png" alt="Hedge" className="w-8 h-8 hidden dark:block" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Atualizar Senha
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            Digite sua nova senha de acesso abaixo
          </p>
        </div>

        <Card padding="resumo">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-12 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error & Success Messages */}
            {error && (
              <PageErrorState
                compact
                title="Não foi possível atualizar a senha"
                description={toActionableErrorMessage(error, "Não conseguimos finalizar a atualização da sua senha.")}
              />
            )}
            {success && (
              <PageSuccessState
                compact
                title="Senha atualizada com sucesso"
                description="Você será redirecionado automaticamente em alguns segundos."
              />
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Atualizar Senha"
              )}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
