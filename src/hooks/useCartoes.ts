import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { CartaoCredito } from "../types";

interface UseCartoesProps {
  user: { id: string } | null;
}

export function useCartoes({ user }: UseCartoesProps) {
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCartoes = useCallback(async () => {
    if (!supabase || !user) return;
    try {
      const { data } = await supabase.from("cartoes_credito").select("*").order("nome");
      setCartoes(data || []);
    } catch (err) {
      console.error("Erro ao buscar cartões:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Buscar ao montar
  useEffect(() => {
    if (user) {
      fetchCartoes();
    }
  }, [user, fetchCartoes]);

  // Refetch quando a janela ganha foco
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchCartoes();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user, fetchCartoes]);

  return {
    cartoes,
    loading,
    fetchCartoes,
  };
}
