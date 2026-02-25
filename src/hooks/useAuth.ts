import { useState, useEffect } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { authFunctions, supabase } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await authFunctions.getSession();
      setUser(session?.user ?? null);
      setAuthLoading(false);
    };

    checkAuth();
    const {
      data: { subscription },
    } = authFunctions.onAuthStateChange(async (authUser) => {
      // Bloquear novos cadastros via Google OAuth
      if (authUser && supabase) {
        const createdAt = new Date(authUser.created_at).getTime();
        const now = Date.now();
        const isNewUser = (now - createdAt) < 30000; // criado nos últimos 30s
        const isGoogleUser = authUser.app_metadata?.provider === "google";

        if (isNewUser && isGoogleUser) {
          // Deletar conta recém-criada e deslogar
          try {
            await supabase.rpc("delete_user_account");
          } catch (e) {
            console.error("Erro ao deletar conta Google não autorizada:", e);
          }
          await authFunctions.signOut();
          localStorage.setItem("auth_error", "Conta não encontrada. Crie uma conta primeiro com email e senha.");
          setUser(null);
          return;
        }
      }
      setUser(authUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const result = await authFunctions.signIn(email, password);
    if (!result.error && result.user) {
      setUser(result.user);
    }
    return { error: result.error ?? undefined };
  };

  const handleSignUp = async (
    email: string,
    password: string,
    nome: string
  ) => {
    const result = await authFunctions.signUp(email, password, nome);
    return { error: result.error ?? undefined };
  };

  const handleLogout = async () => {
    await authFunctions.signOut();
    setUser(null);
  };

  return {
    user,
    authLoading,
    handleLogin,
    handleSignUp,
    handleLogout,
  };
}
