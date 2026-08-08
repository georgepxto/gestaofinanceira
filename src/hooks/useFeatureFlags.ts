import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { UserRole, UserFeatures } from "../types/admin";
import { DEFAULT_FEATURES } from "../types/admin";

interface UseFeatureFlagsProps {
  userId: string | undefined;
}

/**
 * Hook que carrega o role e as features do usuário logado.
 * - Verifica se é admin
 * - Verifica se a conta está ativa
 * - Carrega quais funcionalidades estão habilitadas
 */
export function useFeatureFlags({ userId }: UseFeatureFlagsProps) {
  const [role, setRole] = useState<UserRole>({ role: "user", is_active: true });
  const [features, setFeatures] = useState<UserFeatures>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);

  const fetchRoleAndFeatures = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !userId) {
      setLoading(false);
      return;
    }

    try {
      // As duas RPCs não dependem uma da outra: em série, o boot do app pagava
      // duas viagens de rede para não usar o resultado da primeira.
      const [roleRes, featRes] = await Promise.all([
        supabase.rpc("get_my_role"),
        supabase.rpc("admin_get_user_features", { target_user_id: userId }),
      ]);

      if (!roleRes.error && roleRes.data && roleRes.data.length > 0) {
        setRole({
          role: roleRes.data[0].role || "user",
          is_active: roleRes.data[0].is_active ?? true,
        });
      }

      if (!featRes.error && featRes.data && featRes.data.length > 0) {
        const f = featRes.data[0];
        setFeatures({
          dashboard: f.dashboard ?? true,
          meus_gastos: f.meus_gastos ?? true,
          gastos_compartilhados: f.gastos_compartilhados ?? true,
          saldo_devedor: f.saldo_devedor ?? true,
          pessoas: f.pessoas ?? true,
          contas_bancarias: f.contas_bancarias ?? true,
          cartoes_credito: f.cartoes_credito ?? true,
          metas: f.metas ?? true,
          exportar_pdf: f.exportar_pdf ?? true,
          configuracoes: f.configuracoes ?? true,
        });
      }
    } catch (err) {
      console.error("Erro ao carregar role/features:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchRoleAndFeatures();
    } else {
      setLoading(false);
    }
  }, [userId, fetchRoleAndFeatures]);

  const isAdmin = role.role === "admin";
  const isActive = role.is_active;

  // Admin sempre tem acesso a tudo
  const effectiveFeatures: UserFeatures = isAdmin ? DEFAULT_FEATURES : features;

  return {
    role,
    features: effectiveFeatures,
    isAdmin,
    isActive,
    loading,
    refetch: fetchRoleAndFeatures,
  };
}
