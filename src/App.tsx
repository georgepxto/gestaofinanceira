import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, ShieldAlert, LogOut } from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { formatCurrency } from "./utils/calculations";
import { Login } from "./components/Login";
import { Layout } from "./components/layout";
import { DashboardPage, EuPage, GastosPage, DividasPage, ConfiguracoesPage, PessoasPage, ContasBancariasPage, CartoesCreditoPage, MetasPage, AdminPage, LandingPage, ResetPasswordPage } from "./pages";
import type { CartaoCredito, ContaBancaria } from "./types";
import {
  FormGastoModal,
  FormDividaModal,
  FormMeuGastoModal,
  ConfirmModal,
  FeedbackModal,
  ObservacaoModal,
  PagamentoParcialModal,
  FecharMesModal,
  PagamentoModal,
} from "./components/modals";
import { AppProvider, useAppContext } from "./context";
import { ThemeProvider } from "./hooks/useTheme";
import { useNotifications } from "./hooks/useNotifications";
import "./index.css";

function AppContent() {
  const {
    user,
    authLoading,
    handleLogin,
    handleSignUp,
    handleLogout,
    
    // Modals
    modalFeedback,
    setModalFeedback,
    modalConfirm,
    setModalConfirm,
    
    // Gastos form
    showForm,
    editandoGasto,
    formData,
    setFormData,
    handleSubmit,
    resetFormGasto,
    pessoas,
    
    // Divida form
    showFormDivida,
    setShowFormDivida,
    formDivida,
    setFormDivida,
    handleAddDivida,
    
    // Meu gasto form
    showFormMeuGasto,
    editandoMeuGasto,
    formMeuGasto,
    setFormMeuGasto,
    handleSaveMeuGasto,
    resetFormMeuGasto,
    
    // Observação modal
    showObsModal,
    setShowObsModal,
    obsTexto,
    setObsTexto,
    handleSalvarObs,
    mesVisualizacao,
    
    // Pagamento parcial modal
    showPagamentoParcial,
    setShowPagamentoParcial,
    valorPagamentoParcial,
    setValorPagamentoParcial,
    resumoMensal,
    getTotalPagoParcial,
    handleAddPagamentoParcial,
    setErrorGastos,
    
    // Fechar mês modal
    showFecharMes,
    setShowFecharMes,
    valorPagoFecharMes,
    setValorPagoFecharMes,
    handleFecharMes,
    setErrorDividas,
    
    // Pagamento dívida modal
    showPagamento,
    setShowPagamento,
    valorPagamento,
    setValorPagamento,
    obsPagamento,
    setObsPagamento,
    handlePagamento,
    saldosDevedores,
    
    // Combined
    saving,
    error,

    // Admin & Features
    isAdmin,
    isActive,
    features,
    featuresLoading,
  } = useAppContext();

  // Registrar push notifications
  useNotifications(user?.id);

  // Fetch cartões para o modal
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  
  const fetchCartoes = useCallback(async () => {
    if (!supabase || !user) return;
    try {
      const { data } = await supabase.from("cartoes_credito").select("*").order("nome");
      setCartoes(data || []);
    } catch (err) {
      console.error("Erro ao buscar cartões:", err);
    }
  }, [user]);

  const fetchContas = useCallback(async () => {
    if (!supabase || !user) return;
    try {
      const { data } = await supabase.from("contas_bancarias").select("*").order("nome");
      setContas(data || []);
    } catch (err) {
      console.error("Erro ao buscar contas:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCartoes();
      fetchContas();
    }
  }, [user, fetchCartoes, fetchContas]);

  // Refetch cartões quando muda de rota
  const location = useLocation();
  useEffect(() => {
    if (user) {
      fetchCartoes();
      fetchContas();
    }
  }, [location.pathname, user, fetchCartoes, fetchContas]);

  // Refetch cartões quando a janela ganha foco
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchCartoes();
        fetchContas();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user, fetchCartoes]);

  // Loading de autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">
            Configuração Necessária
          </h1>
          <p className="text-gray-400">
            Configure as variáveis de ambiente do Supabase no arquivo .env.local
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login onLogin={handleLogin} onSignUp={handleSignUp} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Loading de features/role
  if (featuresLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Conta desativada pelo admin
  if (!isActive) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Conta Desativada
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Sua conta foi desativada pelo administrador. Entre em contato com o suporte para mais informações.
          </p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          element={
            <Layout
              onLogout={handleLogout}
              userName={user?.user_metadata?.nome}
              userEmail={user?.email}
            />
          }
        >
          <Route path="/" element={
            features.dashboard ? <DashboardPage /> : <Navigate to={features.meus_gastos ? "/eu" : "/configuracoes"} replace />
          } />
          {features.meus_gastos && <Route path="/eu" element={<EuPage />} />}
          {features.gastos_compartilhados && <Route path="/gastos" element={<GastosPage />} />}
          {features.saldo_devedor && <Route path="/dividas" element={<DividasPage />} />}
          {features.pessoas && <Route path="/pessoas" element={<PessoasPage />} />}
          {features.contas_bancarias && <Route path="/contas" element={<ContasBancariasPage />} />}
          {features.cartoes_credito && <Route path="/cartoes" element={<CartoesCreditoPage />} />}
          {features.configuracoes && <Route path="/configuracoes" element={<ConfiguracoesPage />} />}
          {features.metas && <Route path="/metas" element={<MetasPage />} />}
          {isAdmin && <Route path="/admin" element={<AdminPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {/* Modals - rendered at app level */}
      <FormMeuGastoModal
        show={showFormMeuGasto}
        isEditing={!!editandoMeuGasto}
        formData={formMeuGasto}
        saving={saving}
        error={error}
        cartoes={cartoes}
        contas={contas}
        pessoas={pessoas}
        onClose={() => resetFormMeuGasto()}
        onFormChange={setFormMeuGasto}
        onSubmit={handleSaveMeuGasto}
      />

      <FeedbackModal
        modal={modalFeedback}
        onClose={() => setModalFeedback({ ...modalFeedback, show: false })}
      />

      <ConfirmModal
        modal={modalConfirm}
        saving={saving}
        onClose={() => setModalConfirm({ ...modalConfirm, show: false })}
      />

      <ObservacaoModal
        show={!!showObsModal}
        pessoa={showObsModal}
        mesVisualizacao={mesVisualizacao}
        obsTexto={obsTexto}
        saving={saving}
        onClose={() => {
          setShowObsModal(null);
          setObsTexto("");
        }}
        onTextChange={setObsTexto}
        onSave={handleSalvarObs}
      />

      {/* Modal de Pagamento Parcial */}
      {(() => {
        const resumoPessoa = resumoMensal.find(
          (r) => r.pessoa === showPagamentoParcial
        );
        const totalDevido = resumoPessoa?.total || 0;
        const jaPago = getTotalPagoParcial(showPagamentoParcial || "");
        return (
          <PagamentoParcialModal
            show={!!showPagamentoParcial}
            pessoa={showPagamentoParcial}
            mesVisualizacao={mesVisualizacao}
            totalDevido={totalDevido}
            jaPago={jaPago}
            valorPagamento={valorPagamentoParcial}
            saving={saving}
            error={error}
            onClose={() => {
              setShowPagamentoParcial(null);
              setValorPagamentoParcial("");
              setErrorGastos(null);
            }}
            onValorChange={setValorPagamentoParcial}
            onSubmit={() => {
              if (showPagamentoParcial) {
                handleAddPagamentoParcial(showPagamentoParcial);
              }
            }}
          />
        );
      })()}

      {/* Modal de Fechar Mês */}
      <FecharMesModal
        show={!!showFecharMes}
        pessoa={showFecharMes}
        mesVisualizacao={mesVisualizacao}
        totalDevido={(() => {
          const resumoPessoa = resumoMensal.find(
            (r) => r.pessoa === showFecharMes
          );
          return resumoPessoa?.total || 0;
        })()}
        jaPago={getTotalPagoParcial(showFecharMes || "")}
        valorPagoFecharMes={valorPagoFecharMes}
        saving={saving}
        error={error}
        onClose={() => {
          setShowFecharMes(null);
          setValorPagoFecharMes("");
          setErrorDividas(null);
        }}
        onValorChange={setValorPagoFecharMes}
        onSubmit={(pessoa: string) => handleFecharMes(pessoa)}
      />

      {/* Modal de Formulário de Gasto */}
      <FormGastoModal
        show={showForm}
        isEditing={!!editandoGasto}
        formData={formData}
        pessoas={pessoas}
        cartoes={cartoes}
        contas={contas}
        saving={saving}
        error={error}
        onClose={() => resetFormGasto()}
        onFormChange={setFormData}
        onSubmit={handleSubmit}
      />

      {/* Modal de Nova Dívida */}
      <FormDividaModal
        show={showFormDivida}
        formData={formDivida}
        pessoas={pessoas}
        saving={saving}
        error={error}
        onClose={() => setShowFormDivida(false)}
        onFormChange={setFormDivida}
        onSubmit={handleAddDivida}
      />

      {/* Modal de Pagamento de Dívida */}
      <PagamentoModal
        show={!!showPagamento}
        dividaId={showPagamento}
        valorAtual={
          saldosDevedores.find((d) => d.id === showPagamento)?.valor_atual || 0
        }
        valorPagamento={valorPagamento}
        obsPagamento={obsPagamento}
        saving={saving}
        error={error}
        onClose={() => {
          setShowPagamento(null);
          setValorPagamento("");
          setObsPagamento("");
        }}
        onValorChange={setValorPagamento}
        onObsChange={setObsPagamento}
        onTudo={(valor) => setValorPagamento(formatCurrency(valor))}
        onSubmit={handlePagamento}
      />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
