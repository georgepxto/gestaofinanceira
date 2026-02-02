import { Plus, CreditCard } from "lucide-react";
import { useAppContext } from "../context";
import { TabGastos } from "../components/Tabs";

export const GastosPage = () => {
  const {
    mesVisualizacao,
    navegarMes,
    irParaHoje,
    error,
    totalMes,
    parcelasAtivas,
    loading,
    resumoMensal,
    filtroPessoaGasto,
    setFiltroPessoaGasto,
    filtroTipoGasto,
    setFiltroTipoGasto,
    filtroDiaGasto,
    setFiltroDiaGasto,
    pessoas,
    observacoesMes,
    getObsKey,
    getPagamentosParciais,
    getTotalPagoParcial,
    handleAbrirObs,
    handleDesfazerPagamentoParcial,
    handleEditGasto,
    handleDelete,
    setShowPagamentoParcial,
    setValorPagamentoParcial,
    setShowFecharMes,
    setValorPagoFecharMes,
    setShowForm,
    isMesFechado,
    getMesFechado,
    handleDesfazerFechamento,
  } = useAppContext();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Gastos do Mês</h1>
            <p className="text-gray-400 text-sm">Despesas compartilhadas por pessoa</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Novo Gasto</span>
        </button>
      </div>

      {/* Content */}
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
        isMesFechado={isMesFechado}
        getMesFechado={getMesFechado}
        handleDesfazerFechamento={handleDesfazerFechamento}
      />
    </div>
  );
};
