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
import { Resumo, ResumoItem } from "../components/ui/Resumo";

// ========== ACTION LABELS ==========
const ACTION_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  login: { label: "Login", color: "text-fg bg-surface-2", dot: "bg-accent" },
  logout: { label: "Logout", color: "text-fg-2 bg-surface-2", dot: "bg-surface-3" },
  login_failed: { label: "Login Falhou", color: "text-accent-ink bg-accent/[0.12]", dot: "bg-accent" },
  login_blocked: { label: "Bloqueado", color: "text-danger-ink bg-danger/[0.12]", dot: "bg-danger" },
  password_reset: { label: "Reset Senha", color: "text-fg-2 bg-surface-2", dot: "bg-surface-3" },

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
      titulo: `${user.is_active ? "Desativar" : "Ativar"} usuário`,
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
            titulo: "Pronto",
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
      titulo: "Redefinir senha",
      mensagem: `Deseja enviar um email de redefinição de senha para "${nome}" (${user.email})? O usuário receberá um link para criar uma nova senha.`,
      confirmLabel: "Enviar e-mail",
      confirmColor: "emerald",
      onConfirm: async () => {
        const success = await resetPassword(user.id, user.email);
        if (success) {
          setModalFeedback({
            show: true,
            titulo: "E-mail enviado",
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
        titulo: "Pronto",
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
      titulo: "Desativar conta inativa",
      mensagem: `"${nome}" está inativo há ${inactiveUser.days_inactive} dias. Deseja desativar a conta?`,
      confirmLabel: "Desativar",
      confirmColor: "red",
      onConfirm: async () => {
        const success = await toggleUserActive(inactiveUser.id, false);
        if (success) {
          setModalFeedback({
            show: true,
            titulo: "Conta desativada",
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
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface-1 border border-line hover:border-line text-fg-2 hover:text-fg rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        }
      />

      {/* FAIXA_RESUMO */}
      <Resumo>
        <ResumoItem rotulo="Contas" apoio="sem contar administradores">
          <Valor porte="destaque" className="block mt-1 text-fg">
            {totalUsers}
          </Valor>
        </ResumoItem>
        <ResumoItem rotulo="Habilitadas">
          <Valor porte="medio" className="block mt-1.5 text-fg">{activeUsers}</Valor>
        </ResumoItem>
        <ResumoItem rotulo="Suspensas">
          <Valor porte="medio" className="block mt-1.5 text-fg">{inactiveUsersCount}</Valor>
        </ResumoItem>
        <ResumoItem rotulo="Ativas hoje" tomRotulo="acento">
          <Valor porte="medio" className="block mt-1.5 text-fg">
            {usageStats ? usageStats.active_today : "—"}
          </Valor>
        </ResumoItem>
      </Resumo>

      {/* SEGMENTADO de abas */}
      <div className="flex gap-1 bg-surface-2 p-1 rounded overflow-x-auto w-fit max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-accent text-accent-fg font-medium"
                : "text-fg-2 hover:bg-surface-3 hover:text-fg font-medium"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "inactive" && inactiveUsers.length > 0 && (
              <span className={`font-mono valor text-xs px-1.5 py-0.5 rounded-sm ${
                activeTab === "inactive" ? "bg-surface-1/25 text-accent-fg" : "bg-surface-3 text-fg-2"
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full h-11 pl-10 pr-3 bg-surface-2 border border-line rounded text-sm text-fg placeholder:text-fg-3 outline-none focus:border-fg-3"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1 bg-surface-2 p-1 rounded">
                {(["all", "active", "inactive"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded text-sm transition-colors ${
                      filterStatus === status
                        ? "bg-accent text-accent-fg font-medium"
                        : "text-fg-2 hover:bg-surface-3 hover:text-fg font-medium"
                    }`}
                  >
                    {status === "all" ? "Todas" : status === "active" ? "Habilitadas" : "Suspensas"}
                  </button>
                ))}
              </div>
              <span className="font-mono valor text-sm text-fg-2 whitespace-nowrap">
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
                  <div className="grid [grid-template-columns:minmax(200px,1fr)_120px_120px_128px_150px] gap-3 items-center pb-2 border-b border-line">
                    <Rotulo as="span">Usuário</Rotulo>
                    <Rotulo as="span">Criada</Rotulo>
                    <Rotulo as="span">Último acesso</Rotulo>
                    <Rotulo as="span">Status</Rotulo>
                    <Rotulo as="span">Ações</Rotulo>
                  </div>
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`grid [grid-template-columns:minmax(200px,1fr)_120px_120px_128px_150px] gap-3 items-center py-3 border-b border-line last:border-b-0 hover:bg-surface-2 transition-colors ${
                        expandedUser === user.id ? "bg-surface-2/40" : ""
                      }`}
                    >
                      {/* Usuário */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0 ${
                          user.role === "admin" || !user.is_active
                            ? "bg-surface-2"
                            : "bg-surface-2"
                        }`}>
                          <span className={`font-medium ${
                            user.role === "admin" || !user.is_active
                              ? "text-fg-2"
                              : "text-fg"
                          }`}>
                            {(user.nome || user.email || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-fg truncate">
                              {user.nome || "Sem nome"}
                            </p>
                            {user.role === "admin" && (
                              <span className="font-mono text-xs font-medium px-2 py-0.5 rounded bg-surface-2 text-fg-2">Admin</span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-fg-2 truncate">{user.email}</p>
                        </div>
                      </div>
                      {/* Criada */}
                      <span className="font-mono valor text-sm text-fg-2 whitespace-nowrap">
                        {formatDateShort(user.created_at)}
                      </span>
                      {/* Último acesso */}
                      <span className="font-mono valor text-sm text-fg-2 whitespace-nowrap">
                        {formatDateShort(user.last_sign_in_at)}
                      </span>
                      {/* Status — badge textual, nunca no mesmo controle que a ação */}
                      <span>
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium px-2 py-0.5 rounded bg-surface-2 text-fg">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent" /> {/* ds-ok: ponto de estado de 8px */}
                            Habilitada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium px-2 py-0.5 rounded bg-surface-2 text-fg-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-surface-3" /> {/* ds-ok: ponto de estado de 8px */}
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
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 border rounded text-xs font-medium transition-colors ${
                              expandedUser === user.id
                                ? "bg-surface-2 border-fg-3 text-fg"
                                : "bg-surface-1 border-line hover:border-line text-fg-2 hover:text-fg"
                            }`}
                            title="Gerenciar permissões"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                            Permissões
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            disabled={saving}
                            className="w-8 h-8 rounded flex items-center justify-center text-fg-2 hover:bg-surface-2 hover:text-fg transition-colors"
                            title="Enviar reset de senha"
                            aria-label={`Enviar reset de senha para ${user.nome || user.email}`}
                          >
                            <KeyRound className="w-[15px] h-[15px]" />
                          </button>
                          {user.is_active ? (
                            <button
                              onClick={() => handleToggleActive(user)}
                              disabled={saving}
                              className="w-8 h-8 rounded flex items-center justify-center text-fg-2 hover:bg-danger/[0.12] hover:text-danger-ink transition-colors"
                              title="Suspender conta"
                              aria-label={`Suspender conta de ${user.nome || user.email}`}
                            >
                              <Ban className="w-[15px] h-[15px]" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleActive(user)}
                              disabled={saving}
                              className="w-8 h-8 rounded flex items-center justify-center text-fg-2 hover:bg-surface-2 hover:text-fg transition-colors"
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
                  <div className="mt-4 border-t border-line pt-4">
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                      <h3 className="font-medium text-fg">
                        Permissões de {user.nome || user.email}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleSetAllFeatures(user.id, true)}
                          className="px-3 py-1.5 text-xs font-medium bg-surface-2 text-fg rounded hover:bg-surface-2 transition-colors"
                        >
                          Completo
                        </button>
                        <button
                          onClick={() => handlePresetPessoal(user.id)}
                          className="px-3 py-1.5 text-xs font-medium bg-surface-2 text-fg-2 rounded hover:bg-surface-3 hover:text-fg transition-colors"
                        >
                          Apenas pessoal
                        </button>
                        <button
                          onClick={() => handleSetAllFeatures(user.id, false)}
                          className="px-3 py-1.5 text-xs font-medium bg-surface-2 text-fg-2 rounded hover:bg-danger/[0.12] hover:text-danger-ink transition-colors"
                        >
                          Desabilitar tudo
                        </button>
                      </div>
                    </div>

                    {loadingFeatures === user.id ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-fg" />
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
                                className={`flex items-center gap-3 p-3 rounded border transition-all text-left ${
                                  isEnabled
                                    ? "bg-surface-1 border-fg-3 hover:border-fg-3"
                                    : "bg-surface-2 border-line hover:border-line"
                                }`}
                              >
                                <div className={`w-8 h-5 rounded-sm flex items-center transition-colors flex-shrink-0 ${
                                  isEnabled ? "bg-accent justify-end" : "bg-surface-3 justify-start"
                                }`}>
                                  <div className="w-4 h-4 bg-surface-1 rounded-sm mx-0.5" />
                                </div>
                                <div className="min-w-0">
                                  <span className={`text-sm font-medium block ${isEnabled ? "text-fg" : "text-fg-2"}`}>
                                    {FEATURE_LABELS[feature]}
                                  </span>
                                  <span className="text-xs text-fg-2 block truncate">
                                    {FEATURE_DESCRIPTIONS[feature]}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Rodapé */}
                        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-line">
                          <button
                            onClick={() => setExpandedUser(null)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface-1 border border-line hover:border-line text-fg-2 hover:text-fg rounded text-sm font-medium transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSaveFeatures(user.id)}
                            disabled={saving}
                            className="inline-flex items-center gap-2 h-10 px-4 bg-accent hover:bg-accent/90 disabled:bg-surface-3 disabled:text-fg-3 text-accent-fg rounded text-sm font-medium transition-colors"
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
              <Loader2 className="w-8 h-8 animate-spin text-fg" />
            </div>
          ) : usageStats ? (
            <>
              {/* Métricas Principais */}
              <Resumo>
                <ResumoItem rotulo="Total usuários">
                  <Valor porte="medio" className="block mt-1.5 text-fg">{usageStats.total_users}</Valor>
                </ResumoItem>
                <ResumoItem rotulo="Ativos hoje" tomRotulo="acento">
                  <Valor porte="medio" className="block mt-1.5 text-fg">{usageStats.active_today}</Valor>
                </ResumoItem>
                <ResumoItem rotulo="Ativos 7 dias">
                  <Valor porte="medio" className="block mt-1.5 text-fg">{usageStats.active_7d}</Valor>
                </ResumoItem>
                <ResumoItem rotulo="Ativos 30 dias">
                  <Valor porte="medio" className="block mt-1.5 text-fg">{usageStats.active_30d}</Valor>
                </ResumoItem>
              </Resumo>

              {/* Logins e Novos Usuários */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logins */}
                <Card>
                  <h3 className="font-medium tracking-tight text-fg flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-fg-3" />
                    Logins
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-fg-2">Hoje</span>
                      <span className="font-mono valor font-medium text-fg">{usageStats.logins_today}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-fg-2">Últimos 7 dias</span>
                      <span className="font-mono valor font-medium text-fg">{usageStats.logins_7d}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-fg-2">Últimos 30 dias</span>
                      <span className="font-mono valor font-medium text-fg">{usageStats.logins_30d}</span>
                    </div>
                  </div>
                </Card>

                {/* Novos Usuários */}
                <Card>
                  <h3 className="font-medium tracking-tight text-fg flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-fg" />
                    Novos Cadastros
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-fg-2">Últimos 7 dias</span>
                      <span className="font-mono valor font-medium text-fg">{usageStats.new_users_7d}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-fg-2">Últimos 30 dias</span>
                      <span className="font-mono valor font-medium text-fg">{usageStats.new_users_30d}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-fg-2">Taxa de retenção (30d)</span>
                      <span className="font-mono valor font-medium text-fg">
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
                  <h3 className="font-medium tracking-tight text-fg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-fg-3" />
                    Logins por Dia (últimos 30 dias)
                  </h3>
                  <button
                    onClick={fetchUsageStats}
                    disabled={loadingStats}
                    className="p-2 hover:bg-surface-2 rounded transition-colors text-fg-2"
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
                          <span className="font-mono valor text-[10px] text-fg-2">{d.total}</span>
                          <div
                            className="w-5 bg-accent rounded-t-sm transition-all hover:bg-accent/90"
                            style={{ height: `${height}%` }}
                          />
                          <span className="font-mono text-[9px] text-fg-3 -rotate-45 origin-left whitespace-nowrap">{d.dia}</span>
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
                <h3 className="font-medium tracking-tight text-fg flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-fg" />
                  Novos Cadastros por Dia (últimos 30 dias)
                </h3>

                {usageStats.daily_signups.length > 0 ? (
                  <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
                    {usageStats.daily_signups.map((d, i) => {
                      const maxVal = Math.max(...usageStats.daily_signups.map((x) => x.total), 1);
                      const height = Math.max((d.total / maxVal) * 100, 4);
                      return (
                        <div key={i} className="flex flex-col items-center gap-1 min-w-[24px]" title={`${d.dia}: ${d.total} cadastros`}>
                          <span className="font-mono valor text-[10px] text-fg-2">{d.total}</span>
                          <div
                            className="w-5 bg-accent rounded-t-sm transition-all hover:bg-accent/90"
                            style={{ height: `${height}%` }}
                          />
                          <span className="font-mono text-[9px] text-fg-3 -rotate-45 origin-left whitespace-nowrap">{d.dia}</span>
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
            <span className="text-sm font-medium text-fg">
              Sem acesso há mais de:
            </span>
            <div className="flex gap-1 bg-surface-2 border border-line rounded p-1">
              {[7, 15, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    setInactiveDays(days);
                    fetchInactiveUsers(days);
                  }}
                  className={`px-3 py-1.5 rounded font-mono valor text-sm font-medium transition-colors ${
                    inactiveDays === days
                      ? "bg-accent/[0.12] text-accent-ink"
                      : "text-fg-2 hover:bg-surface-2"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchInactiveUsers(inactiveDays)}
              disabled={loadingInactive}
              className="p-2 hover:bg-surface-2 rounded transition-colors text-fg-2"
            >
              <RefreshCw className={`w-4 h-4 ${loadingInactive ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingInactive ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent-ink" />
            </div>
          ) : inactiveUsers.length === 0 ? (
            <PageSuccessState
              title="Todos os usuários estão ativos"
              description={`Nenhum usuário inativo há mais de ${inactiveDays} dias.`}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-fg-2">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-accent-ink" />
                {inactiveUsers.length} usuário{inactiveUsers.length > 1 ? "s" : ""} inativo{inactiveUsers.length > 1 ? "s" : ""} há mais de {inactiveDays} dias
              </p>
              {inactiveUsers.map((iu) => (
                <div
                  key={iu.id}
                  /* ds-ok: card de cor própria — a borda âmbar comunica estado, é a exceção prevista no Card */
                  className="bg-surface-1 rounded border border-amber-200 p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-sm bg-accent/[0.12] flex items-center justify-center flex-shrink-0">
                    <UserMinus className="w-5 h-5 text-accent-ink" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-fg truncate">
                      {iu.nome || "Sem nome"}
                    </p>
                    <p className="text-sm text-fg-2 truncate">{iu.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-fg-2">
                      <span className="flex items-center gap-1 font-mono valor">
                        <Clock className="w-3 h-3" />
                        Último acesso: {formatDateShort(iu.last_sign_in_at)}
                      </span>
                      <span className="px-2 py-0.5 font-mono valor bg-accent/[0.12] text-accent-ink rounded-sm font-medium">
                        {iu.days_inactive} dias inativo
                      </span>
                      {!iu.is_active && (
                        <span className="px-2 py-0.5 bg-danger/[0.12] text-danger-ink rounded-sm font-medium">
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
                        className="px-3 py-2 text-xs font-medium bg-danger/[0.12] text-danger-ink rounded hover:bg-danger/[0.2] transition-colors flex items-center gap-1"
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
            <div className="flex gap-1 bg-surface-2 border border-line rounded p-1 overflow-x-auto">
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
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                    logFilter === f.value
                      ? "bg-accent text-accent-fg"
                      : "text-fg-2 hover:bg-surface-2"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchActivityLogs(logFilter === "all" ? undefined : logFilter)}
              disabled={loadingLogs}
              className="p-2 hover:bg-surface-2 rounded transition-colors text-fg-2"
            >
              <RefreshCw className={`w-4 h-4 ${loadingLogs ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingLogs ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-fg" />
            </div>
          ) : activityLogs.length === 0 ? (
            <PageEmptyState
              title="Nenhum registro de atividade"
              description="Logins, logouts e alterações de permissão aparecem aqui conforme acontecem."
            />
          ) : (
            <Card padding="nenhum" className="overflow-hidden">
              <div className="divide-y divide-line">
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


function LogRow({ log, formatDate }: { log: ActivityLog; formatDate: (d: string | null) => string }) {
  const actionInfo = ACTION_LABELS[log.action] || {
    label: log.action,
    color: "text-fg-2 bg-surface-2",
    dot: "bg-surface-3",
  };

  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-surface-2 transition-colors">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${actionInfo.dot}`} /> {/* ds-ok: ponto de estado de 8px */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-sm ${actionInfo.color}`}>
            {actionInfo.label}
          </span>
          <span className="text-sm text-fg truncate">
            {log.email || "—"}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 font-mono text-xs valor text-fg-2">
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
