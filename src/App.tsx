import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { isSupabaseConfigured } from "./lib/supabase";
import { formatCurrency } from "./utils/calculations";
import { Login } from "./components/Login";
import { Layout } from "./components/layout";
import { EuPage, GastosPage, DividasPage, ConfiguracoesPage } from "./pages";
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
    showAddPessoa,
    setShowAddPessoa,
    novaPessoa,
    setNovaPessoa,
    handleAddPessoa,
    handleRemovePessoa,
    
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
  } = useAppContext();

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
    return <Login onLogin={handleLogin} onSignUp={handleSignUp} />;
  }

  return (
    <>
      <Routes>
        <Route
          element={
            <Layout
              onLogout={handleLogout}
              userName={user?.user_metadata?.nome}
              userEmail={user?.email}
            />
          }
        >
          <Route path="/" element={<EuPage />} />
          <Route path="/gastos" element={<GastosPage />} />
          <Route path="/dividas" element={<DividasPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
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
        saving={saving}
        error={error}
        onClose={() => resetFormGasto()}
        onFormChange={setFormData}
        onSubmit={handleSubmit}
        onAddPessoa={() =>
          handleAddPessoa((nome) =>
            setFormData({ ...formData, pessoa: nome })
          )
        }
        onRemovePessoa={handleRemovePessoa}
        showAddPessoa={showAddPessoa}
        onShowAddPessoa={setShowAddPessoa}
        novaPessoa={novaPessoa}
        onNovaPessoaChange={setNovaPessoa}
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
