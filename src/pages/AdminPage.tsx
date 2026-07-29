import { useState, useEffect } from "react";
import {
  Users,
  Loader2,
  UserCheck,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
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
import { PageEmptyState, PageErrorState, PageLoadingState, PageSuccessState } from "../components/ui/AsyncState";
import { PageHeader } from "../components/ui/PageHeader";
import { Valor } from "../components/ui/Valor";
import { toActionableErrorMessage } from "../utils/feedbackMessages";
import { PAGE_CONTAINER_CLASS } from "../utils/layout";
import type { AdminUser, UserFeatures, AdminTab, ActivityLog, InactiveUser } from "../types/admin";
import {
  DEFAULT_FEATURES,
  FEATURE_LABELS,
  FEATURE_DESCRIPTIONS,
} from "../types/admin";
import { Rotulo } from "../components/ui/Rotulo";
import { Card } from "../components/ui/Card";

// ========== ACTION LABELS ==========
const ACTION_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  login: { label: "Login", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30", dot: "bg-emerald-500" },
  logout: { label: "Logout", color: "text-zinc-600 bg-zinc-50 dark:text-zinc-400 dark:bg-white/[0.04]", dot: "bg-zinc-300" },
  login_failed: { label: "Login Falhou", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30", dot: "bg-amber-500" },
  login_blocked: { label: "Bloqueado", color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30", dot: "bg-red-500" },
  password_reset: { label: "Reset Senha", color: "text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-white/[0.04]", dot: "bg-zinc-400" },

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

  // A faixa de resumo usa "Ativas hoje" — carrega as estatísticas já na entrada.
  useEffect(() => {
    fetchUsageStats();
  }, [fetchUsageStats]);

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
      confirmColor: user.is_active ? "red" : "emerald",
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
      confirmColor: "emerald",
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
    { id: "dashboard", label: "Uso", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "inactive", label: "Inativos", icon: <UserMinus className="w-4 h-4" /> },
    { id: "logs", label: "Atividade", icon: <Activity className="w-4 h-4" /> },
  ];

  if (loading && users.length === 0) {
    return (
      <PageLoadingState
        title="Carregando painel admin"
        description="Estamos sincronizando usuários, permissões e atividade recente."
      />
    );
  }

  return (
    <div className={`${PAGE_CONTAINER_CLASS} pb-20`}>
      {/* HEADER_PAGINA — a palavra "Ferramenta interna" sinaliza a área; a cor segue o padrão das outras páginas */}
      <PageHeader
        eyebrow="Ferramenta interna"
        title="Painel Admin"
        description="Contas, permissões e atividade dos usuários."
        action={
          <button
            onClick={() => {
              fetchUsers();
              fetchUsageStats();
              if (activeTab === "logs") fetchActivityLogs(logFilter === "all" ? undefined : logFilter);
              if (activeTab === "inactive") fetchInactiveUsers(inactiveDays);
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        }
      />

      {/* FAIXA_RESUMO */}
      <Card padding="resumo" className="grid gap-x-7 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <div className="min-w-0">
          <Rotulo>Contas</Rotulo>
          <Valor porte="destaque" className="block mt-1 text-zinc-900 dark:text-zinc-50">
            {totalUsers}
          </Valor>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">sem contar administradores</p>
        </div>
        <div className="min-w-0">
          <Rotulo>Habilitadas</Rotulo>
          <p className="font-mono valor text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1.5">{activeUsers}</p>
        </div>
        <div className="min-w-0">
          <Rotulo>Suspensas</Rotulo>
          <p className="font-mono valor text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1.5">{inactiveUsersCount}</p>
        </div>
        <div className="min-w-0">
          <Rotulo tom="acento">Ativas hoje</Rotulo>
          <p className="font-mono valor text-2xl font-semibold text-emerald-700 dark:text-emerald-400 mt-1.5">
            {usageStats ? usageStats.active_today : "—"}
          </p>
        </div>
      </Card>

      {/* SEGMENTADO de abas */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-white/[0.04] p-1 rounded-xl overflow-x-auto w-fit max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-emerald-600 text-white font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "inactive" && inactiveUsers.length > 0 && (
              <span className={`font-mono valor text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === "inactive" ? "bg-white/25 text-white" : "bg-zinc-200 dark:bg-white/[0.07] text-zinc-600 dark:text-zinc-300"
              }`}>
                {inactiveUsers.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Erro global */}
      {error && (
        <PageErrorState
          compact
          title="Ocorreu um problema no painel admin"
          description={toActionableErrorMessage(error, "Não foi possível concluir a última ação administrativa.")}
          onAction={() => {
            setError(null);
            fetchUsers();
          }}
          actionLabel="Recarregar usuários"
        />
      )}

      {/* ==================== TAB: USERS ==================== */}
      {activeTab === "users" && (
        <Card>
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center mb-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full h-11 pl-10 pr-3 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1 bg-zinc-100 dark:bg-white/[0.04] p-1 rounded-xl">
                {(["all", "active", "inactive"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      filterStatus === status
                        ? "bg-emerald-600 text-white font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                    }`}
                  >
                    {status === "all" ? "Todas" : status === "active" ? "Habilitadas" : "Suspensas"}
                  </button>
                ))}
              </div>
              <span className="font-mono valor text-[13px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                {filteredUsers.length} {filteredUsers.length === 1 ? "resultado" : "resultados"}
              </span>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <PageEmptyState
              title={searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
              description={
                searchTerm
                  ? "A busca procura por nome e e-mail. Tente outro termo ou limpe o campo."
                  : "Assim que alguém criar uma conta, ela aparece nesta lista."
              }
            />
          ) : (
            <>
              {/* Wrapper rolável SÓ nas linhas — o painel de permissões vive fora */}
              <div className="overflow-x-auto">
                <div className="min-w-[820px]">
                  {/* Cabeçalho */}
                  <div className="grid [grid-template-columns:minmax(200px,1fr)_120px_120px_128px_150px] gap-3 items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <Rotulo as="span">Usuário</Rotulo>
                    <Rotulo as="span">Criada</Rotulo>
                    <Rotulo as="span">Último acesso</Rotulo>
                    <Rotulo as="span">Status</Rotulo>
                    <Rotulo as="span">Ações</Rotulo>
                  </div>
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`grid [grid-template-columns:minmax(200px,1fr)_120px_120px_128px_150px] gap-3 items-center py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 hover:bg-app-row dark:hover:bg-white/[0.02] transition-colors ${
                        expandedUser === user.id ? "bg-emerald-50/40 dark:bg-emerald-950/10" : ""
                      }`}
                    >
                      {/* Usuário */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          user.role === "admin" || !user.is_active
                            ? "bg-zinc-100 dark:bg-white/[0.06]"
                            : "bg-emerald-50 dark:bg-emerald-950/40"
                        }`}>
                          <span className={`font-display font-bold ${
                            user.role === "admin" || !user.is_active
                              ? "text-zinc-500 dark:text-zinc-400"
                              : "text-emerald-700 dark:text-emerald-400"
                          }`}>
                            {(user.nome || user.email || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {user.nome || "Sem nome"}
                            </p>
                            {user.role === "admin" && (
                              <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-400">Admin</span>
                            )}
                          </div>
                          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      {/* Criada */}
                      <span className="font-mono valor text-[13px] text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {formatDateShort(user.created_at)}
                      </span>
                      {/* Último acesso */}
                      <span className="font-mono valor text-[13px] text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {formatDateShort(user.last_sign_in_at)}
                      </span>
                      {/* Status — badge textual, nunca no mesmo controle que a ação */}
                      <span>
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Habilitada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                            Suspensa
                          </span>
                        )}
                      </span>
                      {/* Ações */}
                      {user.role === "admin" ? (
                        <Rotulo as="span">
                          sem ações
                        </Rotulo>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleExpand(user.id)}
                            aria-expanded={expandedUser === user.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
                              expandedUser === user.id
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                                : "bg-white dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                            }`}
                            title="Gerenciar permissões"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                            Permissões
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            disabled={saving}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"
                            title="Enviar reset de senha"
                            aria-label={`Enviar reset de senha para ${user.nome || user.email}`}
                          >
                            <KeyRound className="w-[15px] h-[15px]" />
                          </button>
                          {user.is_active ? (
                            <button
                              onClick={() => handleToggleActive(user)}
                              disabled={saving}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                              title="Suspender conta"
                              aria-label={`Suspender conta de ${user.nome || user.email}`}
                            >
                              <Ban className="w-[15px] h-[15px]" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleActive(user)}
                              disabled={saving}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors"
                              title="Reativar conta"
                              aria-label={`Reativar conta de ${user.nome || user.email}`}
                            >
                              <UserCheck className="w-[15px] h-[15px]" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Painel de permissões — FORA do wrapper rolável, largura total */}
              {expandedUser && (() => {
                const user = users.find((u) => u.id === expandedUser);
                if (!user || user.role === "admin") return null;
                return (
                  <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                      <h3 className="font-display font-bold text-zinc-900 dark:text-zinc-100">
                        Permissões de {user.nome || user.email}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleSetAllFeatures(user.id, true)}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
                        >
                          Completo
                        </button>
                        <button
                          onClick={() => handlePresetPessoal(user.id)}
                          className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-white/[0.08] hover:text-zinc-900 transition-colors"
                        >
                          Apenas pessoal
                        </button>
                        <button
                          onClick={() => handleSetAllFeatures(user.id, false)}
                          className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                        >
                          Desabilitar tudo
                        </button>
                      </div>
                    </div>

                    {loadingFeatures === user.id ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 dark:text-emerald-400" />
                      </div>
                    ) : (
                      <>
                        {/* Grid de toggles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(Object.keys(FEATURE_LABELS) as (keyof UserFeatures)[]).map((feature) => {
                            const isEnabled = (editingFeatures[user.id] || DEFAULT_FEATURES)[feature];
                            return (
                              <button
                                key={feature}
                                onClick={() => handleToggleFeature(user.id, feature)}
                                role="switch"
                                aria-checked={isEnabled}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                  isEnabled
                                    ? "bg-white dark:bg-white/[0.06] border-emerald-100 dark:border-emerald-900/60 hover:border-emerald-300"
                                    : "bg-zinc-50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/[0.09] hover:border-zinc-300 dark:hover:border-white/[0.14]"
                                }`}
                              >
                                <div className={`w-8 h-5 rounded-full flex items-center transition-colors flex-shrink-0 ${
                                  isEnabled ? "bg-emerald-500 justify-end" : "bg-zinc-300 dark:bg-white/25 justify-start"
                                }`}>
                                  <div className="w-4 h-4 bg-white rounded-full shadow mx-0.5" />
                                </div>
                                <div className="min-w-0">
                                  <span className={`text-sm font-medium block ${isEnabled ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"}`}>
                                    {FEATURE_LABELS[feature]}
                                  </span>
                                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate">
                                    {FEATURE_DESCRIPTIONS[feature]}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Rodapé */}
                        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                          <button
                            onClick={() => setExpandedUser(null)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-xl text-sm font-medium transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSaveFeatures(user.id)}
                            disabled={saving}
                            className="inline-flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500 text-white rounded-xl text-sm font-semibold transition-colors"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Salvar permissões
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </Card>
      )}

      {/* ==================== TAB: DASHBOARD ==================== */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          {loadingStats ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : usageStats ? (
            <>
              {/* Métricas Principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={<Users className="w-5 h-5" />} label="Total Usuários" value={usageStats.total_users} color="zinc" />
                <StatCard icon={<UserCheck className="w-5 h-5" />} label="Ativos Hoje" value={usageStats.active_today} color="emerald" />
                <StatCard icon={<Activity className="w-5 h-5" />} label="Ativos 7 dias" value={usageStats.active_7d} color="zinc" />
                <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Ativos 30 dias" value={usageStats.active_30d} color="zinc" />
              </div>

              {/* Logins e Novos Usuários */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logins */}
                <Card>
                  <h3 className="font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    Logins
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Hoje</span>
                      <span className="font-mono valor font-bold text-zinc-900 dark:text-zinc-100">{usageStats.logins_today}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Últimos 7 dias</span>
                      <span className="font-mono valor font-bold text-zinc-900 dark:text-zinc-100">{usageStats.logins_7d}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Últimos 30 dias</span>
                      <span className="font-mono valor font-bold text-zinc-900 dark:text-zinc-100">{usageStats.logins_30d}</span>
                    </div>
                  </div>
                </Card>

                {/* Novos Usuários */}
                <Card>
                  <h3 className="font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Novos Cadastros
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Últimos 7 dias</span>
                      <span className="font-mono valor font-bold text-emerald-600 dark:text-emerald-400">{usageStats.new_users_7d}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Últimos 30 dias</span>
                      <span className="font-mono valor font-bold text-emerald-600 dark:text-emerald-400">{usageStats.new_users_30d}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Taxa de retenção (30d)</span>
                      <span className="font-mono valor font-bold text-zinc-900 dark:text-zinc-100">
                        {usageStats.total_users > 0
                          ? Math.round((usageStats.active_30d / usageStats.total_users) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Gráfico de Logins por Dia */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    Logins por Dia (últimos 30 dias)
                  </h3>
                  <button
                    onClick={fetchUsageStats}
                    disabled={loadingStats}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors text-zinc-500"
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
                          <span className="font-mono valor text-[10px] text-zinc-500 dark:text-zinc-400">{d.total}</span>
                          <div
                            className="w-5 bg-emerald-500 dark:bg-emerald-400 rounded-t-sm transition-all hover:bg-emerald-600"
                            style={{ height: `${height}%` }}
                          />
                          <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 -rotate-45 origin-left whitespace-nowrap">{d.dia}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <PageEmptyState
                    compact
                    title="Nenhum dado de login ainda"
                    description="Os acessos aparecem aqui conforme os usuários entrarem no app."
                  />
                )}
              </Card>

              {/* Gráfico de Cadastros por Dia */}
              <Card>
                <h3 className="font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
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
                          <span className="font-mono valor text-[10px] text-zinc-500 dark:text-zinc-400">{d.total}</span>
                          <div
                            className="w-5 bg-emerald-500 dark:bg-emerald-400 rounded-t-sm transition-all hover:bg-emerald-600"
                            style={{ height: `${height}%` }}
                          />
                          <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 -rotate-45 origin-left whitespace-nowrap">{d.dia}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <PageEmptyState
                    compact
                    title="Nenhum cadastro nos últimos 30 dias"
                    description="Contas novas criadas no período aparecem neste gráfico."
                  />
                )}
              </Card>
            </>
          ) : (
            <PageErrorState
              title="Erro ao carregar estatísticas"
              description="Os números de uso não vieram do servidor. Recarregue a página para tentar de novo."
            />
          )}
        </div>
      )}

      {/* ==================== TAB: INATIVOS ==================== */}
      {activeTab === "inactive" && (
        <div className="space-y-4">
          {/* Filtro de dias */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Sem acesso há mais de:
            </span>
            <div className="flex gap-1 bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] rounded-xl p-1">
              {[7, 15, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    setInactiveDays(days);
                    fetchInactiveUsers(days);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-mono valor text-sm font-medium transition-colors ${
                    inactiveDays === days
                      ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchInactiveUsers(inactiveDays)}
              disabled={loadingInactive}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors text-zinc-500"
            >
              <RefreshCw className={`w-4 h-4 ${loadingInactive ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingInactive ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : inactiveUsers.length === 0 ? (
            <PageSuccessState
              title="Todos os usuários estão ativos"
              description={`Nenhum usuário inativo há mais de ${inactiveDays} dias.`}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
                {inactiveUsers.length} usuário{inactiveUsers.length > 1 ? "s" : ""} inativo{inactiveUsers.length > 1 ? "s" : ""} há mais de {inactiveDays} dias
              </p>
              {inactiveUsers.map((iu) => (
                <div
                  key={iu.id}
                  /* ds-ok: card de cor própria — a borda âmbar comunica estado, é a exceção prevista no Card */
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0">
                    <UserMinus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                      {iu.nome || "Sem nome"}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{iu.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1 font-mono valor">
                        <Clock className="w-3 h-3" />
                        Último acesso: {formatDateShort(iu.last_sign_in_at)}
                      </span>
                      <span className="px-2 py-0.5 font-mono valor bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded-full font-medium">
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
            <div className="flex gap-1 bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] rounded-xl p-1 overflow-x-auto">
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
                      ? "bg-emerald-600 text-white"
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchActivityLogs(logFilter === "all" ? undefined : logFilter)}
              disabled={loadingLogs}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors text-zinc-500"
            >
              <RefreshCw className={`w-4 h-4 ${loadingLogs ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingLogs ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : activityLogs.length === 0 ? (
            <PageEmptyState
              title="Nenhum registro de atividade"
              description="Logins, logouts e alterações de permissão aparecem aqui conforme acontecem."
            />
          ) : (
            <Card padding="nenhum" className="overflow-hidden">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {activityLogs.map((log) => (
                  <LogRow key={log.id} log={log} formatDate={formatDate} />
                ))}
              </div>
            </Card>
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
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    red: "text-red-500",
    zinc: "text-zinc-400 dark:text-zinc-500",
  };

  return (
    <Card padding="compacto">
      <div className="flex items-center gap-2 mb-1">
        <span className={colorMap[color] || "text-zinc-400 dark:text-zinc-500"}>{icon}</span>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">{label}</span>
      </div>
      <p className="font-mono valor text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
    </Card>
  );
}

function LogRow({ log, formatDate }: { log: ActivityLog; formatDate: (d: string | null) => string }) {
  const actionInfo = ACTION_LABELS[log.action] || {
    label: log.action,
    color: "text-zinc-600 bg-zinc-50 dark:text-zinc-400 dark:bg-white/[0.04]",
    dot: "bg-zinc-300",
  };

  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-white/[0.06] transition-colors">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${actionInfo.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${actionInfo.color}`}>
            {actionInfo.label}
          </span>
          <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
            {log.email || "—"}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 font-mono text-xs valor text-zinc-500 dark:text-zinc-400">
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
