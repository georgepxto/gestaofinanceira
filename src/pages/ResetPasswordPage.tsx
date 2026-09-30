import React, { useState } from "react";
import { HedgeMark } from "../components/landing/HedgeMark";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAppContext } from "../context";
import { toActionableErrorMessage } from "../utils/feedbackMessages";
import { Button } from "../components/ui/Button";
import { Campo, campoClasse } from "../components/ui/FormSheet";

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
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <button
          onClick={() => navigate("/")}
          className="h-11 -ml-2 px-2 inline-flex items-center gap-1.5 rounded text-sm text-fg-2 hover:text-fg transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Voltar para o app
        </button>

        <HedgeMark className="h-8 w-auto text-accent" title="Hedge" />
        <h1 className="text-2xl md:text-[28px] font-title leading-tight tracking-[-0.01em] text-fg mt-6">Nova senha</h1>
        <p className="text-[15px] md:text-sm text-fg-2 mt-1">Escolha a senha que você vai usar para entrar.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <Campo rotulo="Nova senha" htmlFor="reset-senha" dica="Pelo menos 6 caracteres.">
            <div className="relative">
              <input
                id="reset-senha"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${campoClasse} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-fg-3 hover:text-fg transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            </div>
          </Campo>

          <Campo rotulo="Confirmar a senha" htmlFor="reset-confirma">
            <input
              id="reset-confirma"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={campoClasse}
            />
          </Campo>

          {error && (
            <p role="alert" className="text-sm text-danger-ink">
              {toActionableErrorMessage(error, "Não conseguimos atualizar a sua senha.")}
            </p>
          )}
          {success && (
            <p role="status" className="text-sm text-fg-2">
              Senha atualizada. Você volta para o app em alguns segundos.
            </p>
          )}

          <Button type="submit" variante="principal" cheio carregando={loading} disabled={!!success}>
            Salvar nova senha
          </Button>
        </form>
      </div>
    </div>
  );
}
