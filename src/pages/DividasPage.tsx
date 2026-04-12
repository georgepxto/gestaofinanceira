import { Plus, TrendingDown } from "lucide-react";
import { useAppContext } from "../context";
import { TabDividas } from "../components/Tabs";

export const DividasPage = () => {
  const {
    saldosDevedores,
    filtroStatusDivida,
    setFiltroStatusDivida,
    filtroPessoaDivida,
    setFiltroPessoaDivida,
    dividasFiltradas,
    totalDividasPendentes,
    totalDividasQuitadas,
    totalPendentes,
    totalPagos,
    pessoasComDividas,
    showPagamento,
    setShowPagamento,
    handleDeleteDivida,
    handleDesfazerPagamento,
    setShowFormDivida,
  } = useAppContext();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingDown className="w-7 h-7 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dívidas em Aberto</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Acompanhe quanto ainda precisam te pagar</p>
          </div>
        </div>
        <button
          onClick={() => setShowFormDivida(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Nova Cobrança</span>
        </button>
      </div>

      {/* Content */}
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
    </div>
  );
};
