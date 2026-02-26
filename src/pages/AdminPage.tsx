import { useState, useEffect } from "react";
import {
  Shield,
  Users,
  Loader2,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  User,
  Settings2,
  KeyRound,
  BarChart3,
  Activity,
  UserMinus,
  TrendingUp,
  Calendar,
  Eye,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { useAdmin } from "../hooks/useAdmin";
import { useAppContext } from "../context";
import type { AdminUser, UserFeatures, AdminTab, ActivityLog, InactiveUser } from "../types/admin";
import {
  DEFAULT_FEATURES,
  FEATURE_LABELS,
  FEATURE_DESCRIPTIONS,
} from "../types/admin";

// ========== ACTION LABELS ==========
const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  login: { label: "Login", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30", icon: "🟢" },
  logout: { label: "Logout", color: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800", icon: "⚪" },
  login_failed: { label: "Login Falhou", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30", icon: "🟡" },
  login_blocked: { label: "Bloqueado", color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30", icon: "🔴" },
  password_reset: { label: "Reset Senha", color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30", icon: "🔵" },

};

export const AdminPage = () => {
  const { setModalFeedback, setModalConfirm } = useAppContext();
  const {
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
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingFeatures, setEditingFeatures] = useState<Record<string, UserFeatures>>({});
  const [loadingFeatures, setLoadingFeatures] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [logFilter, setLogFilter] = useState<string>("all");
  const [inactiveDays, setInactiveDays] = useState(30);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Carregar dados da tab quando mudar
  useEffect(() => {
    if (activeTab === "dashboard" && !usageStats) {
      fetchUsageStats();
    } else if (activeTab === "logs" && activityLogs.length === 0) {
      fetchActivityLogs();
    } else if (activeTab === "inactive" && inactiveUsers.length === 0) {
      fetchInactiveUsers(inactiveDays);
    }
  }, [activeTab, usageStats, activityLogs.length, inactiveUsers.length, fetchUsageStats, fetchActivityLogs, fetchInactiveUsers, inactiveDays]);

  // Filtrar usuários
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !searchTerm ||
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.nome || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && u.is_active) ||
      (filterStatus === "inactive" && !u.is_active);

    return matchSearch && matchStatus;
  });

  // Estatísticas
  const totalUsers = users.filter((u) => u.role !== "admin").length;
  const activeUsers = users.filter((u) => u.role !== "admin" && u.is_active).length;
  const inactiveUsersCount = users.filter((u) => u.role !== "admin" && !u.is_active).length;

  // Expandir/recolher usuário e carregar features
  const handleToggleExpand = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      return;
    }

    setExpandedUser(userId);

    if (!editingFeatures[userId]) {
      setLoadingFeatures(userId);
      const features = await getUserFeatures(userId);
      setEditingFeatures((prev) => ({ ...prev, [userId]: features }));
      setLoadingFeatures(null);
    }
  };

  // Toggle de ativo/desativado
  const handleToggleActive = (user: AdminUser) => {
    const action = user.is_active ? "desativar" : "ativar";
    const nome = user.nome || user.email;

    setModalConfirm({
      show: true,
      titulo: `${user.is_active ? "Desativar" : "Ativar"} Usuário`,
      mensagem: `Tem certeza que deseja ${action} a conta de "${nome}"? ${
        user.is_active
          ? "O usuário não conseguirá acessar o sistema."
          : "O usuário poderá acessar o sistema novamente."
      }`,
      confirmLabel: user.is_active ? "Desativar" : "Ativar",
      confirmColor: user.is_active ? "red" : "green",
      onConfirm: async () => {
        const success = await toggleUserActive(user.id, !user.is_active);
        if (success) {
          setModalFeedback({
            show: true,
            titulo: "Sucesso!",
            mensagem: `Conta de "${nome}" foi ${user.is_active ? "desativada" : "ativada"}.`,
            tipo: "sucesso",
          });
        }
        setModalConfirm({ show: false, titulo: "", mensagem: "", onConfirm: () => {} });
      },
    });
  };

  // Resetar senha de um usuário
  const handleResetPassword = (user: AdminUser) => {
    const nome = user.nome || user.email;
    setModalConfirm({
      show: true,
      titulo: "Resetar Senha",
      mensagem: `Deseja enviar um email de redefinição de senha para "${nome}" (${user.email})? O usuário receberá um link para criar uma nova senha.`,
      confirmLabel: "Enviar Email",
      confirmColor: "blue",
      onConfirm: async () => {
        const success = await resetPassword(user.id, user.email);
        if (success) {
          setModalFeedback({
            show: true,
            titulo: "Email Enviado",
            mensagem: `Link de redefinição de senha enviado para ${user.email}.`,
            tipo: "sucesso",
          });
        }
        setModalConfirm({ show: false, titulo: "", mensagem: "", onConfirm: () => {} });
      },
    });
  };

  // Toggle individual de feature
  const handleToggleFeature = (userId: string, feature: keyof UserFeatures) => {
    setEditingFeatures((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || DEFAULT_FEATURES),
        [feature]: !(prev[userId] || DEFAULT_FEATURES)[feature],
      },
    }));
  };

  // Habilitar/desabilitar todas as features
  const handleSetAllFeatures = (userId: string, enabled: boolean) => {
    const newFeatures: UserFeatures = { ...DEFAULT_FEATURES };
    (Object.keys(newFeatures) as (keyof UserFeatures)[]).forEach((key) => {
      newFeatures[key] = enabled;
    });
    newFeatures.configuracoes = true;
    setEditingFeatures((prev) => ({ ...prev, [userId]: newFeatures }));
  };

  // Preset: "Apenas Pessoal"
  const handlePresetPessoal = (userId: string) => {
    setEditingFeatures((prev) => ({
      ...prev,
      [userId]: {
        dashboard: true,
        meus_gastos: true,
        gastos_compartilhados: false,
        saldo_devedor: false,
        pessoas: false,
        contas_bancarias: true,
        cartoes_credito: true,
        metas: true,
        exportar_pdf: true,
        configuracoes: true,
      },
    }));
  };

  // Salvar features
  const handleSaveFeatures = async (userId: string) => {
    const features = editingFeatures[userId];
    if (!features) return;

    const success = await updateUserFeatures(userId, features);
    if (success) {
      const user = users.find((u) => u.id === userId);
      setModalFeedback({
        show: true,
        titulo: "Sucesso!",
        mensagem: `Funcionalidades de "${user?.nome || user?.email}" atualizadas.`,
        tipo: "sucesso",
      });
    } else {
      setModalFeedback({
        show: true,
        titulo: "Erro",
        mensagem: "Não foi possível salvar as alterações.",
        tipo: "info",
      });
    }
  };

  // Desativar usuário inativo diretamente
  const handleDeactivateInactive = (inactiveUser: InactiveUser) => {
    const nome = inactiveUser.nome || inactiveUser.email;
    setModalConfirm({
      show: true,
      titulo: "Desativar Conta Inativa",
      mensagem: `"${nome}" está inativo há ${inactiveUser.days_inactive} dias. Deseja desativar a conta?`,
      confirmLabel: "Desativar",
      confirmColor: "red",
      onConfirm: async () => {
        const success = await toggleUserActive(inactiveUser.id, false);
        if (success) {
          setModalFeedback({
            show: true,
            titulo: "Conta Desativada",
            mensagem: `"${nome}" foi desativado.`,
            tipo: "sucesso",
          });
          fetchInactiveUsers(inactiveDays);
          fetchUsers();
        }
        setModalConfirm({ show: false, titulo: "", mensagem: "", onConfirm: () => {} });
      },
    });
  };

  // Formato de data legível
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  // ========== TABS ==========
  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: "Usuários", icon: <Users className="w-4 h-4" /> },
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "inactive", label: "Inativos", icon: <UserMinus className="w-4 h-4" /> },
    { id: "logs", label: "Atividade", icon: <Activity className="w-4 h-4" /> },
  ];

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Painel Admin
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Gerencie usuários, monitore atividade
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Erro global */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ==================== TAB: USERS ==================== */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalUsers}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Ativos</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{activeUsers}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <UserX className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Inativos</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{inactiveUsersCount}</p>
            </div>
          </div>

          {/* Busca e Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1">
              {(["all", "active", "inactive"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {status === "all" ? "Todos" : status === "active" ? "Ativos" : "Inativos"}
                </button>
              ))}
            </div>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-700 dark:text-gray-300"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Lista de Usuários */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado."}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden transition-all ${
                    !user.is_active
                      ? "border-red-200 dark:border-red-900/50 opacity-75"
                      : "border-gray-200 dark:border-gray-800"
                  }`}
                >
                  {/* User Row */}
                  <div className="p-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                        user.role === "admin"
                          ? "bg-indigo-100 dark:bg-indigo-950/30"
                          : user.is_active
                          ? "bg-emerald-100 dark:bg-emerald-950/30"
                          : "bg-red-100 dark:bg-red-950/30"
                      }`}
                    >
                      {user.role === "admin" ? (
                        <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {user.nome || "Sem nome"}
                        </span>
                        {user.role === "admin" && (
                          <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase rounded-full">
                            Admin
                          </span>
                        )}
                        {!user.is_active && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase rounded-full">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-0.5">
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {user.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Criado: {formatDate(user.created_at)}
                        </span>
                        <span className="hidden sm:flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Último login: {formatDate(user.last_sign_in_at)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {user.role !== "admin" && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Reset Senha */}
                        <button
                          onClick={() => handleResetPassword(user)}
                          disabled={saving}
                          className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-500 dark:text-blue-400 transition-colors"
                          title="Resetar senha"
                        >
                          <KeyRound className="w-5 h-5" />
                        </button>

                        {/* Toggle Ativo */}
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={saving}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_active
                              ? "hover:bg-red-50 dark:hover:bg-red-950/30 text-emerald-600 dark:text-emerald-400"
                              : "hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-red-500 dark:text-red-400"
                          }`}
                          title={user.is_active ? "Desativar conta" : "Ativar conta"}
                        >
                          {user.is_active ? (
                            <ToggleRight className="w-6 h-6" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </button>

                        {/* Expandir Features */}
                        <button
                          onClick={() => handleToggleExpand(user.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                          title="Gerenciar funcionalidades"
                        >
                          <Settings2 className="w-5 h-5" />
                          {expandedUser === user.id ? (
                            <ChevronUp className="w-3 h-3 absolute -mt-1 ml-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3 absolute -mt-1 ml-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Features Panel (Expandido) */}
                  {expandedUser === user.id && user.role !== "admin" && (
                    <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
                      {loadingFeatures === user.id ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        </div>
                      ) : (
                        <>
                          {/* Presets */}
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Presets:
                            </span>
                            <button
                              onClick={() => handleSetAllFeatures(user.id, true)}
                              className="px-3 py-1.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-950/50 transition-colors"
                            >
                              Completo
                            </button>
                            <button
                              onClick={() => handlePresetPessoal(user.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-950/50 transition-colors"
                            >
                              Apenas Pessoal
                            </button>
                            <button
                              onClick={() => handleSetAllFeatures(user.id, false)}
                              className="px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-950/50 transition-colors"
                            >
                              Desabilitar Tudo
                            </button>
                          </div>

                          {/* Feature Toggles */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(Object.keys(FEATURE_LABELS) as (keyof UserFeatures)[]).map((feature) => {
                              const isEnabled = (editingFeatures[user.id] || DEFAULT_FEATURES)[feature];
                              return (
                                <button
                                  key={feature}
                                  onClick={() => handleToggleFeature(user.id, feature)}
                                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                    isEnabled
                                      ? "bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300"
                                      : "bg-gray-100 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-80"
                                  }`}
                                >
                                  <div className={`w-8 h-5 rounded-full flex items-center transition-colors flex-shrink-0 ${
                                    isEnabled ? "bg-emerald-500 justify-end" : "bg-gray-300 dark:bg-gray-600 justify-start"
                                  }`}>
                                    <div className="w-4 h-4 bg-white rounded-full shadow mx-0.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className={`text-sm font-medium block ${isEnabled ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}>
                                      {FEATURE_LABELS[feature]}
                                    </span>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500 block truncate">
                                      {FEATURE_DESCRIPTIONS[feature]}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Salvar */}
                          <div className="flex justify-end mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => handleSaveFeatures(user.id)}
                              disabled={saving}
                              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium text-sm"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              Salvar Alterações
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB: DASHBOARD ==================== */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          {loadingStats ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : usageStats ? (
            <>
              {/* Métricas Principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={<Users className="w-5 h-5" />} label="Total Usuários" value={usageStats.total_users} color="indigo" />
                <StatCard icon={<UserCheck className="w-5 h-5" />} label="Ativos Hoje" value={usageStats.active_today} color="emerald" />
                <StatCard icon={<Activity className="w-5 h-5" />} label="Ativos 7 dias" value={usageStats.active_7d} color="blue" />
                <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Ativos 30 dias" value={usageStats.active_30d} color="purple" />
              </div>

              {/* Logins e Novos Usuários */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logins */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Logins
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Hoje</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">{usageStats.logins_today}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Últimos 7 dias</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">{usageStats.logins_7d}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Últimos 30 dias</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">{usageStats.logins_30d}</span>
                    </div>
                  </div>
                </div>

                {/* Novos Usuários */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Novos Cadastros
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Últimos 7 dias</span>
                      <span className="font-bold text-emerald-600">{usageStats.new_users_7d}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Últimos 30 dias</span>
                      <span className="font-bold text-emerald-600">{usageStats.new_users_30d}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Taxa de retenção (30d)</span>
                      <span className="font-bold text-indigo-600">
                        {usageStats.total_users > 0
                          ? Math.round((usageStats.active_30d / usageStats.total_users) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráfico de Logins por Dia */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Logins por Dia (últimos 30 dias)
                  </h3>
                  <button
                    onClick={fetchUsageStats}
                    disabled={loadingStats}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingStats ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {usageStats.daily_logins.length > 0 ? (
                  <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
                    {usageStats.daily_logins.map((d, i) => {
                      const maxVal = Math.max(...usageStats.daily_logins.map((x) => x.total), 1);
                      const height = Math.max((d.total / maxVal) * 100, 4);
                      return (
                        <div key={i} className="flex flex-col items-center gap-1 min-w-[24px]" title={`${d.dia}: ${d.total} logins`}>
                          <span className="text-[10px] text-gray-400">{d.total}</span>
                          <div
                            className="w-5 bg-indigo-500 dark:bg-indigo-400 rounded-t-sm transition-all hover:bg-indigo-600"
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-[9px] text-gray-400 -rotate-45 origin-left whitespace-nowrap">{d.dia}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 dark:text-gray-500 py-8">Nenhum dado de login ainda.</p>
                )}
              </div>

              {/* Gráfico de Cadastros por Dia */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  Novos Cadastros por Dia (últimos 30 dias)
                </h3>

                {usageStats.daily_signups.length > 0 ? (
                  <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
                    {usageStats.daily_signups.map((d, i) => {
                      const maxVal = Math.max(...usageStats.daily_signups.map((x) => x.total), 1);
                      const height = Math.max((d.total / maxVal) * 100, 4);
                      return (
                        <div key={i} className="flex flex-col items-center gap-1 min-w-[24px]" title={`${d.dia}: ${d.total} cadastros`}>
                          <span className="text-[10px] text-gray-400">{d.total}</span>
                          <div
                            className="w-5 bg-emerald-500 dark:bg-emerald-400 rounded-t-sm transition-all hover:bg-emerald-600"
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-[9px] text-gray-400 -rotate-45 origin-left whitespace-nowrap">{d.dia}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 dark:text-gray-500 py-8">Nenhum cadastro nos últimos 30 dias.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-16">Erro ao carregar estatísticas.</p>
          )}
        </div>
      )}

      {/* ==================== TAB: INATIVOS ==================== */}
      {activeTab === "inactive" && (
        <div className="space-y-4">
          {/* Filtro de dias */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sem acesso há mais de:
            </span>
            <div className="flex gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1">
              {[7, 15, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    setInactiveDays(days);
                    fetchInactiveUsers(days);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    inactiveDays === days
                      ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchInactiveUsers(inactiveDays)}
              disabled={loadingInactive}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500"
            >
              <RefreshCw className={`w-4 h-4 ${loadingInactive ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingInactive ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : inactiveUsers.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <UserCheck className="w-12 h-12 text-emerald-300 dark:text-emerald-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Todos os usuários estão ativos! 🎉
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Nenhum usuário inativo há mais de {inactiveDays} dias.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
                {inactiveUsers.length} usuário{inactiveUsers.length > 1 ? "s" : ""} inativo{inactiveUsers.length > 1 ? "s" : ""} há mais de {inactiveDays} dias
              </p>
              {inactiveUsers.map((iu) => (
                <div
                  key={iu.id}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-900/50 p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0">
                    <UserMinus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {iu.nome || "Sem nome"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{iu.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Último acesso: {formatDateShort(iu.last_sign_in_at)}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded-full font-medium">
                        {iu.days_inactive} dias inativo
                      </span>
                      {!iu.is_active && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-full font-medium">
                          Desativado
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {iu.is_active && (
                      <button
                        onClick={() => handleDeactivateInactive(iu)}
                        disabled={saving}
                        className="px-3 py-2 text-xs font-medium bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-950/50 transition-colors flex items-center gap-1"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Desativar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: LOGS ==================== */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Filtros de log */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 overflow-x-auto">
              {[
                { value: "all", label: "Todos" },
                { value: "login", label: "Logins" },
                { value: "login_failed", label: "Falhas" },
                { value: "login_blocked", label: "Bloqueios" },
                { value: "password_reset", label: "Reset Senha" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => {
                    setLogFilter(f.value);
                    fetchActivityLogs(f.value === "all" ? undefined : f.value);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    logFilter === f.value
                      ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchActivityLogs(logFilter === "all" ? undefined : logFilter)}
              disabled={loadingLogs}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500"
            >
              <RefreshCw className={`w-4 h-4 ${loadingLogs ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingLogs ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nenhum registro de atividade encontrado.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {activityLogs.map((log) => (
                  <LogRow key={log.id} log={log} formatDate={formatDate} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ========== COMPONENTES AUXILIARES ==========

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "text-indigo-500",
    emerald: "text-emerald-500",
    blue: "text-blue-500",
    purple: "text-purple-500",
    amber: "text-amber-500",
    red: "text-red-500",
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className={colorMap[color] || "text-gray-500"}>{icon}</span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

function LogRow({ log, formatDate }: { log: ActivityLog; formatDate: (d: string | null) => string }) {
  const actionInfo = ACTION_LABELS[log.action] || {
    label: log.action,
    color: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800",
    icon: "⚪",
  };

  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <span className="text-base">{actionInfo.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${actionInfo.color}`}>
            {actionInfo.label}
          </span>
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {log.email || "—"}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          <span>{formatDate(log.created_at)}</span>
          {log.ip_address && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {log.ip_address}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
