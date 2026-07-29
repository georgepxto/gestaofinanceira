import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { AlertCircle, ShieldAlert, LogOut } from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { formatCurrency } from "./utils/calculations";
import type { CartaoCredito, ContaBancaria } from "./types";
import { Toaster } from "./components/ui/Toaster";
import { AppShellSkeleton, AuthSplashSkeleton } from "./components/layout/AppShellSkeleton";
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
import { Login } from "./components/Login";
import { LandingPage } from "./pages/LandingPage";
import "./index.css";

const Layout = lazy(() => import("./components/layout").then((m) => ({ default: m.Layout })));

const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const OrcamentoPage = lazy(() => import("./pages/OrcamentoPage").then((m) => ({ default: m.OrcamentoPage })));
const EuPage = lazy(() => import("./pages/EuPage").then((m) => ({ default: m.EuPage })));
const NaRuaPage = lazy(() => import("./pages/NaRuaPage").then((m) => ({ default: m.NaRuaPage })));
const GastosPage = lazy(() => import("./pages/GastosPage").then((m) => ({ default: m.GastosPage })));
const DividasPage = lazy(() => import("./pages/DividasPage").then((m) => ({ default: m.DividasPage })));
const ConfiguracoesPage = lazy(() => import("./pages/ConfiguracoesPage").then((m) => ({ default: m.ConfiguracoesPage })));
const PessoasPage = lazy(() => import("./pages/PessoasPage").then((m) => ({ default: m.PessoasPage })));
const CarteiraPage = lazy(() => import("./pages/CarteiraPage").then((m) => ({ default: m.CarteiraPage })));
const ContasBancariasPage = lazy(() => import("./pages/ContasBancariasPage").then((m) => ({ default: m.ContasBancariasPage })));
const CartoesCreditoPage = lazy(() => import("./pages/CartoesCreditoPage").then((m) => ({ default: m.CartoesCreditoPage })));
const MetasPage = lazy(() => import("./pages/MetasPage").then((m) => ({ default: m.MetasPage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));

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
    return <AuthSplashSkeleton />;
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold tracking-tight text-white mb-2">
            Configuração Necessária
          </h1>
          <p className="text-zinc-400">
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
    return <AppShellSkeleton />;
  }

  // Conta desativada pelo admin
  if (!isActive) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-app-dark flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
            Conta Desativada
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
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
      <Suspense fallback={<AppShellSkeleton />}>
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
              features.dashboard ? <DashboardPage /> : <Navigate to={features.meus_gastos ? "/gastos/lancamentos" : "/configuracoes"} replace />
            } />
            {/* Gastos — Lançamentos + Metas */}
            {(features.meus_gastos || features.metas) && (
              <Route path="/gastos" element={<OrcamentoPage />}>
                {features.meus_gastos && <Route path="lancamentos" element={<EuPage />} />}
                {features.metas && <Route path="metas" element={<MetasPage />} />}
                <Route index element={<Navigate to={features.meus_gastos ? "lancamentos" : "metas"} replace />} />
                <Route path="*" element={<Navigate to={features.meus_gastos ? "lancamentos" : "metas"} replace />} />
              </Route>
            )}
            {/* A receber — Por pessoa + Em aberto + Do mês */}
            {(features.gastos_compartilhados || features.saldo_devedor || features.pessoas) && (
              <Route path="/a-receber" element={<NaRuaPage />}>
                {features.pessoas && <Route path="pessoas" element={<PessoasPage />} />}
                {features.saldo_devedor && <Route path="aberto" element={<DividasPage />} />}
                {features.gastos_compartilhados && <Route path="mes" element={<GastosPage />} />}
                <Route index element={<Navigate to={features.pessoas ? "pessoas" : features.saldo_devedor ? "aberto" : "mes"} replace />} />
                <Route path="*" element={<Navigate to={features.pessoas ? "pessoas" : features.saldo_devedor ? "aberto" : "mes"} replace />} />
              </Route>
            )}
            {/* Carteira — Contas Bancárias + Cartões de Crédito */}
            {(features.contas_bancarias || features.cartoes_credito) && (
              <Route path="/carteira" element={<CarteiraPage />}>
                {features.contas_bancarias && <Route path="contas" element={<ContasBancariasPage />} />}
                {features.cartoes_credito && <Route path="cartoes" element={<CartoesCreditoPage />} />}
                <Route index element={<Navigate to={features.contas_bancarias ? "contas" : "cartoes"} replace />} />
                <Route path="*" element={<Navigate to={features.contas_bancarias ? "contas" : "cartoes"} replace />} />
              </Route>
            )}
            {/* Redirects das rotas antigas */}
            <Route path="/orcamento/gastos" element={<Navigate to="/gastos/lancamentos" replace />} />
            <Route path="/orcamento/metas" element={<Navigate to="/gastos/metas" replace />} />
            <Route path="/orcamento" element={<Navigate to="/gastos" replace />} />
            <Route path="/eu" element={<Navigate to="/gastos/lancamentos" replace />} />
            <Route path="/metas" element={<Navigate to="/gastos/metas" replace />} />
            <Route path="/dividas" element={<Navigate to="/a-receber/aberto" replace />} />
            <Route path="/pessoas" element={<Navigate to="/a-receber/pessoas" replace />} />
            <Route path="/contas" element={<Navigate to="/carteira/contas" replace />} />
            <Route path="/cartoes" element={<Navigate to="/carteira/cartoes" replace />} />
            {features.configuracoes && <Route path="/configuracoes" element={<ConfiguracoesPage />} />}
            {isAdmin && <Route path="/admin" element={<AdminPage />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>

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
      <Toaster />
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
