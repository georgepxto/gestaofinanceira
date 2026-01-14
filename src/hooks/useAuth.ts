import { useState, useEffect } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { authFunctions } from "../lib/supabase";

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
    } = authFunctions.onAuthStateChange((user) => {
      setUser(user);
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
