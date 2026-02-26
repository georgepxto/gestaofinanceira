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
      // Buscar role
      const { data: roleData, error: roleError } = await supabase.rpc("get_my_role");
      
      if (!roleError && roleData && roleData.length > 0) {
        setRole({
          role: roleData[0].role || "user",
          is_active: roleData[0].is_active ?? true,
        });
      }

      // Buscar features
      const { data: featData, error: featError } = await supabase.rpc(
        "admin_get_user_features",
        { target_user_id: userId }
      );

      if (!featError && featData && featData.length > 0) {
        setFeatures({
          dashboard: featData[0].dashboard ?? true,
          meus_gastos: featData[0].meus_gastos ?? true,
          gastos_compartilhados: featData[0].gastos_compartilhados ?? true,
          saldo_devedor: featData[0].saldo_devedor ?? true,
          pessoas: featData[0].pessoas ?? true,
          contas_bancarias: featData[0].contas_bancarias ?? true,
          cartoes_credito: featData[0].cartoes_credito ?? true,
          metas: featData[0].metas ?? true,
          exportar_pdf: featData[0].exportar_pdf ?? true,
          configuracoes: featData[0].configuracoes ?? true,
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
