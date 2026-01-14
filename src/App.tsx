import { useState } from "react";
import {
  Plus,
  TrendingDown,
  Loader2,
  AlertCircle,
  UserCircle,
  Receipt,
  Clock,
  LogOut,
} from "lucide-react";
import { addMonths, subMonths } from "date-fns";
import { isSupabaseConfigured } from "./lib/supabase";
import { formatCurrency } from "./utils/calculations";
import { Login } from "./components/Login";
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
import { TabGastos, TabDividas, TabMeuGasto } from "./components/Tabs";
import {
  useAuth,
  useModals,
  usePessoas,
  useObservacoes,
  usePagamentosParciais,
  useGastos,
  useSaldosDevedores,
  useMeusGastos,
} from "./hooks";
import "./index.css";

function App() {
  // === NAVEGAÇÃO ===
  const [abaAtiva, setAbaAtiva] = useState<"gastos" | "dividas" | "eu">("eu");
  const [mesVisualizacao, setMesVisualizacao] = useState<Date>(new Date());

  // Navegação entre meses
  const navegarMes = (direcao: "anterior" | "proximo") => {
    setMesVisualizacao((prev) =>
      direcao === "anterior" ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  // Ir para o mês atual
  const irParaHoje = () => {
    setMesVisualizacao(new Date());
  };

  // === HOOKS ===
  const { user, authLoading, handleLogin, handleSignUp, handleLogout } =
    useAuth();

  const {
    modalFeedback,
    setModalFeedback,
    modalConfirm,
    setModalConfirm,
  } = useModals();

  const {
    pessoas,
    novaPessoa,
    setNovaPessoa,
    showAddPessoa,
    setShowAddPessoa,
    fetchPessoas,
    handleAddPessoa,
    handleRemovePessoa,
  } = usePessoas({ user });

  const {
    observacoesMes,
    showObsModal,
    setShowObsModal,
    obsTexto,
    setObsTexto,
    saving: savingObs,
    getObsKey,
    getMesAtual,
    handleSalvarObs,
    handleAbrirObs,
  } = useObservacoes({ mesVisualizacao, user });

  const {

    parcelasAtivas,
    resumoMensal,
    totalMes,
    showForm,
    setShowForm,
    editandoGasto,

    loading,
    saving: savingGastos,
    error: errorGastos,
    setError: setErrorGastos,
    filtroPessoaGasto,
    setFiltroPessoaGasto,
    filtroTipoGasto,
    setFiltroTipoGasto,
    filtroDiaGasto,
    setFiltroDiaGasto,
    formData,
    setFormData,
    handleSubmit,
    handleEditGasto,
    handleDelete,
    resetForm: resetFormGasto,
  } = useGastos({
    user,
    mesVisualizacao,
    setModalConfirm,
  });

  const {
    showPagamentoParcial,
    setShowPagamentoParcial,
    valorPagamentoParcial,
    setValorPagamentoParcial,
    saving: savingPagParcial,
    getPagamentosParciais,
    getTotalPagoParcial,
    handleAddPagamentoParcial,
    handleDesfazerPagamentoParcial,
  } = usePagamentosParciais({
    user,
    getObsKey,
    getMesAtual,
    setModalConfirm,
    setModalFeedback,
    resumoMensal,
    setError: setErrorGastos,
  });

  const {
    saldosDevedores,
    showFormDivida,
    setShowFormDivida,
    showPagamento,
    setShowPagamento,
    valorPagamento,
    setValorPagamento,
    obsPagamento,
    setObsPagamento,
    showFecharMes,
    setShowFecharMes,
    valorPagoFecharMes,
    setValorPagoFecharMes,
    saving: savingDividas,
    error: errorDividas,
    setError: setErrorDividas,
    filtroPessoaDivida,
    setFiltroPessoaDivida,
    filtroStatusDivida,
    setFiltroStatusDivida,
    formDivida,
    setFormDivida,
    dividasFiltradas,
    totalPendentes,
    totalPagos,
    totalDividasPendentes,
    totalDividasQuitadas,
    pessoasComDividas,
    handleAddDivida,
    handlePagamento,
    handleDesfazerPagamento,
    handleDeleteDivida,
    handleFecharMes,

  } = useSaldosDevedores({
    user,
    mesVisualizacao,
    resumoMensal,
    getTotalPagoParcial,
    getObsKey,
    getMesAtual,
    setPagamentosParciais: () => {}, // Will be overridden
    setModalConfirm,
    setModalFeedback,
    fetchPessoas,
  });

  const {
    showFormMeuGasto,
    setShowFormMeuGasto,
    editandoMeuGasto,

    saving: savingMeusGastos,
    error: errorMeusGastos,
    filtroCategoriaMeuGasto,
    setFiltroCategoriaMeuGasto,
    filtroDiaMeuGasto,
    setFiltroDiaMeuGasto,
    formMeuGasto,
    setFormMeuGasto,
    meusGastosDoMes,
    gastosFixos,
    totalMeusGastosCredito,
    totalMeusGastosDebito,
    totalMeusGastosPagos,
    totalGastosFixos,
    handleEditMeuGasto,
    handleSaveMeuGasto,
    handleTogglePagoMeuGasto,
    handleDeleteMeuGasto,
    handleToggleGastoFixo,
    resetForm: resetFormMeuGasto,
  } = useMeusGastos({
    user,
    mesVisualizacao,
    setModalConfirm,
  });

  // Estado de saving e error combinados
  const saving = savingObs || savingGastos || savingPagParcial || savingDividas || savingMeusGastos;
  const error = errorGastos || errorDividas || errorMeusGastos;

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
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg sticky top-0 z-40 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-blue-500" />
              {user?.user_metadata?.nome || "Controle Financeiro"}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (abaAtiva === "gastos") setShowForm(true);
                  else if (abaAtiva === "dividas") setShowFormDivida(true);
                  else setShowFormMeuGasto(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">
                  {abaAtiva === "gastos"
                    ? "Novo Gasto"
                    : abaAtiva === "dividas"
                    ? "Nova Dívida"
                    : "Novo"}
                </span>
              </button>
              {user && (
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setAbaAtiva("eu")}
              className={`py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                abaAtiva === "eu"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <UserCircle className="w-4 h-4" />
              Eu
            </button>
            <button
              onClick={() => setAbaAtiva("gastos")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                abaAtiva === "gastos"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Gastos do Mês</span>
              <span className="sm:hidden">Gastos</span>
            </button>
            <button
              onClick={() => setAbaAtiva("dividas")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                abaAtiva === "dividas"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Clock className="w-4 h-4" />
              Saldo Devedor
              {saldosDevedores.filter((d) => d.valor_atual > 0).length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {saldosDevedores.filter((d) => d.valor_atual > 0).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* === ABA GASTOS === */}
        {abaAtiva === "gastos" && (
          <TabGastos
            mesVisualizacao={mesVisualizacao}
            navegarMes={navegarMes}
            irParaHoje={irParaHoje}
            error={error}
            totalMes={totalMes}
            parcelasAtivas={parcelasAtivas}
            loading={loading}
            resumoMensal={resumoMensal}
            filtroPessoaGasto={filtroPessoaGasto}
            setFiltroPessoaGasto={setFiltroPessoaGasto}
            filtroTipoGasto={filtroTipoGasto}
            setFiltroTipoGasto={setFiltroTipoGasto}
            filtroDiaGasto={filtroDiaGasto}
            setFiltroDiaGasto={setFiltroDiaGasto}
            pessoas={pessoas}
            observacoesMes={observacoesMes}
            getObsKey={getObsKey}
            getPagamentosParciais={getPagamentosParciais}
            getTotalPagoParcial={getTotalPagoParcial}
            handleAbrirObs={handleAbrirObs}
            handleDesfazerPagamentoParcial={handleDesfazerPagamentoParcial}
            handleEditGasto={handleEditGasto}
            handleDelete={handleDelete}
            setShowPagamentoParcial={setShowPagamentoParcial}
            setValorPagamentoParcial={setValorPagamentoParcial}
            setShowFecharMes={setShowFecharMes}
            setValorPagoFecharMes={setValorPagoFecharMes}
          />
        )}

        {/* === ABA DÍVIDAS === */}
        {abaAtiva === "dividas" && (
          <TabDividas
            saldosDevedores={saldosDevedores}
            filtroStatusDivida={filtroStatusDivida}
            setFiltroStatusDivida={setFiltroStatusDivida}
            filtroPessoaDivida={filtroPessoaDivida}
            setFiltroPessoaDivida={setFiltroPessoaDivida}
            dividasFiltradas={dividasFiltradas}
            totalDividasPendentes={totalDividasPendentes}
            totalDividasQuitadas={totalDividasQuitadas}
            totalPendentes={totalPendentes}
            totalPagos={totalPagos}
            pessoasComDividas={pessoasComDividas}
            showPagamento={showPagamento}
            setShowPagamento={setShowPagamento}
            handleDeleteDivida={handleDeleteDivida}
            handleDesfazerPagamento={handleDesfazerPagamento}
          />
        )}

        {/* === ABA EU (MEUS GASTOS) === */}
        {abaAtiva === "eu" && (
          <TabMeuGasto
            mesVisualizacao={mesVisualizacao}
            navegarMes={navegarMes}
            irParaHoje={irParaHoje}
            totalMeusGastosCredito={totalMeusGastosCredito}
            totalMeusGastosDebito={totalMeusGastosDebito}
            totalMeusGastosPagos={totalMeusGastosPagos}
            totalGastosFixos={totalGastosFixos}
            filtroCategoriaMeuGasto={filtroCategoriaMeuGasto}
            setFiltroCategoriaMeuGasto={setFiltroCategoriaMeuGasto}
            filtroDiaMeuGasto={filtroDiaMeuGasto}
            setFiltroDiaMeuGasto={setFiltroDiaMeuGasto}
            gastosFixos={gastosFixos}
            meusGastosDoMes={meusGastosDoMes}
            handleEditMeuGasto={handleEditMeuGasto}
            handleToggleGastoFixo={handleToggleGastoFixo}
            handleDeleteMeuGasto={handleDeleteMeuGasto}
            handleTogglePagoMeuGasto={handleTogglePagoMeuGasto}
          />
        )}
      </main>

      <FormMeuGastoModal
        show={showFormMeuGasto}
        isEditing={!!editandoMeuGasto}
        formData={formMeuGasto}
        saving={saving}
        error={error}
        onClose={() => {
          resetFormMeuGasto();
        }}
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
        onClose={() => setModalConfirm((prev) => ({ ...prev, show: false }))}
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
        onClose={() => {
          resetFormGasto();
        }}
        onFormChange={setFormData}
        onSubmit={handleSubmit}
        onAddPessoa={() => handleAddPessoa((nome) => setFormData((prev) => ({ ...prev, pessoa: nome })))}
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
    </div>
  );
}

export default App;
