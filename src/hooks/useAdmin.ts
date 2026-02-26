import { useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { AdminUser, UserFeatures, UsageStats, ActivityLog, InactiveUser } from "../types/admin";
import { DEFAULT_FEATURES } from "../types/admin";

/**
 * Hook para funcionalidades de admin:
 * - Listar todos os usuários
 * - Ativar/desativar contas
 * - Gerenciar features por usuário
 * - Reset de senha
 * - Dashboard de uso
 * - Logs de atividade
 * - Usuários inativos
 */
export function useAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<InactiveUser[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingInactive, setLoadingInactive] = useState(false);

  // Buscar todos os usuários
  const fetchUsers = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_get_users");

      if (rpcError) {
        console.error("Erro ao buscar usuários:", rpcError);
        setError(rpcError.message);
        return;
      }

      setUsers(
        (data || []).map((u: AdminUser) => ({
          id: u.id,
          email: u.email || "",
          nome: u.nome || null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          is_active: u.is_active ?? true,
          role: u.role || "user",
        }))
      );
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
      setError("Erro ao carregar lista de usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Ativar/desativar um usuário
  const toggleUserActive = async (userId: string, active: boolean) => {
    if (!isSupabaseConfigured || !supabase) return false;

    setSaving(true);
    try {
      const { error: rpcError } = await supabase.rpc("admin_toggle_user_active", {
        target_user_id: userId,
        active,
      });

      if (rpcError) {
        console.error("Erro ao alterar status:", rpcError);
        setError(rpcError.message);
        return false;
      }

      // Atualizar localmente
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: active } : u))
      );
      return true;
    } catch (err) {
      console.error("Erro ao alterar status:", err);
      setError("Erro ao alterar status do usuário.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Buscar features de um usuário
  const getUserFeatures = async (userId: string): Promise<UserFeatures> => {
    if (!isSupabaseConfigured || !supabase) return DEFAULT_FEATURES;

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "admin_get_user_features",
        { target_user_id: userId }
      );

      if (rpcError || !data || data.length === 0) {
        return DEFAULT_FEATURES;
      }

      return {
        dashboard: data[0].dashboard ?? true,
        meus_gastos: data[0].meus_gastos ?? true,
        gastos_compartilhados: data[0].gastos_compartilhados ?? true,
        saldo_devedor: data[0].saldo_devedor ?? true,
        pessoas: data[0].pessoas ?? true,
        contas_bancarias: data[0].contas_bancarias ?? true,
        cartoes_credito: data[0].cartoes_credito ?? true,
        metas: data[0].metas ?? true,
        exportar_pdf: data[0].exportar_pdf ?? true,
        configuracoes: data[0].configuracoes ?? true,
      };
    } catch (err) {
      console.error("Erro ao buscar features:", err);
      return DEFAULT_FEATURES;
    }
  };

  // Atualizar features de um usuário
  const updateUserFeatures = async (
    userId: string,
    features: UserFeatures
  ): Promise<boolean> => {
    if (!isSupabaseConfigured || !supabase) return false;

    setSaving(true);
    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_update_user_features",
        {
          target_user_id: userId,
          p_dashboard: features.dashboard,
          p_meus_gastos: features.meus_gastos,
          p_gastos_compartilhados: features.gastos_compartilhados,
          p_saldo_devedor: features.saldo_devedor,
          p_pessoas: features.pessoas,
          p_contas_bancarias: features.contas_bancarias,
          p_cartoes_credito: features.cartoes_credito,
          p_metas: features.metas,
          p_exportar_pdf: features.exportar_pdf,
          p_configuracoes: features.configuracoes,
        }
      );

      if (rpcError) {
        console.error("Erro ao atualizar features:", rpcError);
        setError(rpcError.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Erro ao atualizar features:", err);
      setError("Erro ao atualizar funcionalidades.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ========== NOVAS FUNCIONALIDADES V2 ==========

  // Enviar email de reset de senha
  const resetPassword = async (userId: string, email: string): Promise<boolean> => {
    if (!isSupabaseConfigured || !supabase) return false;

    setSaving(true);
    try {
      // 1. Enviar email de reset via Supabase Auth
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        console.error("Erro ao enviar reset:", resetError);
        setError(resetError.message);
        return false;
      }

      // 2. Registrar no log
      await supabase.rpc("admin_log_password_reset", {
        target_user_id: userId,
      });

      return true;
    } catch (err) {
      console.error("Erro ao resetar senha:", err);
      setError("Erro ao enviar email de reset de senha.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Buscar estatísticas de uso
  const fetchUsageStats = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    setLoadingStats(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_get_usage_stats");

      if (rpcError) {
        console.error("Erro ao buscar stats:", rpcError);
        setError(rpcError.message);
        return;
      }

      setUsageStats(data as UsageStats);
    } catch (err) {
      console.error("Erro ao buscar stats:", err);
      setError("Erro ao carregar estatísticas.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Buscar logs de atividade
  const fetchActivityLogs = useCallback(async (
    action?: string,
    userId?: string,
    limit: number = 50
  ) => {
    if (!isSupabaseConfigured || !supabase) return;

    setLoadingLogs(true);
    try {
      const params: Record<string, unknown> = {
        p_limit: limit,
        p_offset: 0,
      };
      if (action) params.p_action = action;
      if (userId) params.p_user_id = userId;

      const { data, error: rpcError } = await supabase.rpc("admin_get_activity_logs", params);

      if (rpcError) {
        console.error("Erro ao buscar logs:", rpcError);
        setError(rpcError.message);
        return;
      }

      setActivityLogs((data || []) as ActivityLog[]);
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
      setError("Erro ao carregar logs de atividade.");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // Buscar usuários inativos
  const fetchInactiveUsers = useCallback(async (days: number = 30) => {
    if (!isSupabaseConfigured || !supabase) return;

    setLoadingInactive(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_get_inactive_users", {
        p_days: days,
      });

      if (rpcError) {
        console.error("Erro ao buscar inativos:", rpcError);
        setError(rpcError.message);
        return;
      }

      setInactiveUsers((data || []) as InactiveUser[]);
    } catch (err) {
      console.error("Erro ao buscar inativos:", err);
      setError("Erro ao carregar usuários inativos.");
    } finally {
      setLoadingInactive(false);
    }
  }, []);

  return {
    users,
    loading,
    saving,
    error,
    setError,
    fetchUsers,
    toggleUserActive,
    getUserFeatures,
    updateUserFeatures,
    // V2
    usageStats,
    activityLogs,
    inactiveUsers,
    loadingStats,
    loadingLogs,
    loadingInactive,
    resetPassword,
    fetchUsageStats,
    fetchActivityLogs,
    fetchInactiveUsers,
  };
}
