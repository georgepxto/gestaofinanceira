import { Plus, User } from "lucide-react";
import { useAppContext } from "../context";
import { TabMeuGasto } from "../components/Tabs";

export const EuPage = () => {
  const {
    mesVisualizacao,
    navegarMes,
    irParaHoje,
    totalMeusGastosCredito,
    totalMeusGastosDebito,
    totalMeusGastosPagos,
    totalGastosFixos,
    filtroCategoriaMeuGasto,
    setFiltroCategoriaMeuGasto,
    filtroDiaMeuGasto,
    setFiltroDiaMeuGasto,
    gastosFixos,
    meusGastosDoMes,
    handleEditMeuGasto,
    handleToggleGastoFixo,
    handleDeleteMeuGasto,
    handleTogglePagoMeuGasto,
    setShowFormMeuGasto,
  } = useAppContext();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="w-7 h-7 text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Meus Gastos</h1>
            <p className="text-gray-400 text-sm">Despesas pessoais e gastos fixos</p>
          </div>
        </div>
        <button
          onClick={() => setShowFormMeuGasto(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Novo</span>
        </button>
      </div>

      {/* Content */}
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
    </div>
  );
};
