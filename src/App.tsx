import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { AlertCircle, ShieldAlert, LogOut } from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { formatCurrencyValue } from "./utils/calculations";
import type { CartaoCredito, ContaBancaria } from "./types";
import { Toaster } from "./components/ui/Toaster";
// Import direto do arquivo, não do index de `layout`: o index reexporta o
// Layout, e um import estático dele arrastaria a casca inteira para o chunk de
// entrada — justamente o que o `lazy` acima evita.
import { BootSplash, AparecerSeDemorar } from "./components/layout/BootSplash";
import { useEsperaLonga } from "./hooks";
import {
  FormGastoModal,
  FormDividaModal,
  FormGasto,
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

// A landing e o login só servem a quem está fora: com eles no chunk de entrada,
// quem já tem sessão baixava a página de venda inteira (e o GSAP) em toda
// abertura do app. O pré-carregamento logo abaixo cobre o visitante.
const LandingPage = lazy(() => import("./pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const Login = lazy(() => import("./components/Login").then((m) => ({ default: m.Login })));

const Layout = lazy(() => import("./components/layout").then((m) => ({ default: m.Layout })));

const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));

// O Layout não é uma rota entre outras — é a casca de todas elas, e o Dashboard
// é a rota de entrada de todo mundo. Deixá-los carregar só sob demanda serializa
// os chunks depois das RPCs de feature flags; disparando o import aqui, rede e
// download correm juntos e a espera passa a ser o maior dos dois, não a soma.
//
// Só estes dois. Pré-carregar as outras telas trocaria boot rápido por download
// que ninguém pediu.
//
// E só para quem tem sessão salva: sem ela, "/" é a landing, e baixar o
// Dashboard ali só disputa banda com o hero. A chave é a padrão do supabase-js
// (sb-<ref>-auth-token). Na dúvida (storage bloqueado), pré-carrega.
const temSessaoSalva = (() => {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
  } catch {
    return true;
  }
})();
if (temSessaoSalva) {
  void import("./components/layout");
  void import("./pages/DashboardPage");
} else {
  void import("./pages/LandingPage");
}

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

/**
 * Os formulários e modais do app, que vivem acima das rotas. Ficam num
 * componente só deles para que o estado de formulário (uma mudança por tecla)
 * não passe pelo componente que monta as rotas.
 */
function ModaisDoApp() {
  const {
    user,
    modalFeedback,
    setModalFeedback,
    modalConfirm,
    setModalConfirm,
    showForm,
    editandoGasto,
    formData,
    setFormData,
    handleSubmit,
    resetFormGasto,
    pessoas,
    adicionarPessoa,
    gastosFixos,
    showFormDivida,
    setShowFormDivida,
    formDivida,
    setFormDivida,
    handleAddDivida,
    showFormMeuGasto,
    editandoMeuGasto,
    formMeuGasto,
    setFormMeuGasto,
    handleSaveMeuGasto,
    resetFormMeuGasto,
    showObsModal,
    setShowObsModal,
    obsTexto,
    setObsTexto,
    handleSalvarObs,
    mesVisualizacao,
    showPagamentoParcial,
    setShowPagamentoParcial,
    valorPagamentoParcial,
    setValorPagamentoParcial,
    resumoMensal,
    getTotalPagoParcial,
    handleAddPagamentoParcial,
    setErrorGastos,
    showFecharMes,
    setShowFecharMes,
    valorPagoFecharMes,
    setValorPagoFecharMes,
    handleFecharMes,
    setErrorDividas,
    showPagamento,
    setShowPagamento,
    valorPagamento,
    setValorPagamento,
    obsPagamento,
    setObsPagamento,
    handlePagamento,
    saldosDevedores,
    saving,
    error,
  } = useAppContext();

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

  // Cartões e contas alimentam os modais de lançamento, que vivem no nível do
  // App. Quem cobre o dado que envelheceu são o efeito de montagem acima e o de
  // foco de janela abaixo — havia um terceiro, por troca de rota, que refazia as
  // duas queries em toda navegação, inclusive nas telas que não têm nada a ver
  // com cartão ou conta. Se um modal precisar de dado fresco, o lugar de buscar
  // é a abertura dele.

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
  }, [user, fetchCartoes, fetchContas]);

  return (
    <>
      {/* Um formulário de gasto para celular e desktop: o <FormSheet> sobe de
          baixo num e entra pela direita no outro. */}
      <FormGasto
        show={showFormMeuGasto}
        isEditing={!!editandoMeuGasto}
        formData={formMeuGasto}
        saving={saving}
        error={error}
        cartoes={cartoes}
        contas={contas}
        pessoas={pessoas}
        onAdicionarPessoa={adicionarPessoa}
        fixos={gastosFixos}
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
            contas={contas}
            onSubmit={(pessoa, contaId) => handleAddPagamentoParcial(pessoa, contaId)}
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
        contas={contas}
        onSubmit={(pessoa, contaId) => handleFecharMes(pessoa, contaId)}
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
        onTudo={(valor) => setValorPagamento(formatCurrencyValue(valor))}
        contas={contas}
        onSubmit={(dividaId, contaId) => handlePagamento(dividaId, contaId)}
      />
    </>
  );
}

function AppContent() {
  // Só o que decide QUAL tela aparece. Os formulários e modais ficam em
  // <ModaisDoApp>: como o contexto assina por campo, digitar num formulário
  // redesenha os modais, não as rotas.
  const {
    user,
    authLoading,
    handleLogin,
    handleSignUp,
    handleLogout,
    isAdmin,
    isActive,
    features,
    featuresLoading,
  } = useAppContext();

  // Registrar push notifications
  useNotifications(user?.id);

  // Limiar dos dois portões de boot. Ficam aqui em cima, antes de qualquer
  // `return`: hook depois de saída condicional quebra a ordem entre renders.
  const mostrarBootAuth = useEsperaLonga(authLoading);
  const mostrarBootFeatures = useEsperaLonga(featuresLoading);

  // Loading de autenticação
  if (authLoading) {
    return mostrarBootAuth ? <BootSplash /> : null;
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-6">
        <div className="max-w-sm">
          <AlertCircle className="w-5 h-5 text-danger-ink mb-3" strokeWidth={1.5} />
          <h1 className="text-xl font-medium text-fg mb-2">Falta configurar o Supabase</h1>
          <p className="text-sm text-fg-2">
            Preencha as variáveis de ambiente do Supabase no arquivo .env.local.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<AparecerSeDemorar><BootSplash /></AparecerSeDemorar>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login onLogin={handleLogin} onSignUp={handleSignUp} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Loading de features/role
  if (featuresLoading) {
    return mostrarBootFeatures ? <BootSplash /> : null;
  }

  // Conta desativada pelo admin
  if (!isActive) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-6">
        <div className="max-w-sm">
          <ShieldAlert className="w-5 h-5 text-danger-ink mb-3" strokeWidth={1.5} />
          <h1 className="text-xl font-medium text-fg mb-2">Conta desativada</h1>
          <p className="text-sm text-fg-2 mb-6">
            Sua conta foi desativada pelo administrador. Fale com o suporte para saber mais.
          </p>
          <button
            onClick={handleLogout}
            className="h-11 md:h-10 px-4 inline-flex items-center gap-2 rounded bg-surface-2 text-fg hover:bg-surface-3 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<AparecerSeDemorar><BootSplash /></AparecerSeDemorar>}>
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
            {/* Gastos — Lançamentos + Limites (as antigas Metas) */}
            {(features.meus_gastos || features.metas) && (
              <Route path="/gastos" element={<OrcamentoPage />}>
                {features.meus_gastos && <Route path="lancamentos" element={<EuPage />} />}
                {features.metas && <Route path="limites" element={<MetasPage />} />}
                {features.metas && <Route path="metas" element={<Navigate to="/gastos/limites" replace />} />}
                <Route index element={<Navigate to={features.meus_gastos ? "lancamentos" : "limites"} replace />} />
                <Route path="*" element={<Navigate to={features.meus_gastos ? "lancamentos" : "limites"} replace />} />
              </Route>
            )}
            {/* A receber — Pessoas + Cobranças + Do mês */}
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
            <Route path="/orcamento/metas" element={<Navigate to="/gastos/limites" replace />} />
            <Route path="/orcamento" element={<Navigate to="/gastos" replace />} />
            <Route path="/eu" element={<Navigate to="/gastos/lancamentos" replace />} />
            <Route path="/metas" element={<Navigate to="/gastos/limites" replace />} />
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

      <ModaisDoApp />
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
