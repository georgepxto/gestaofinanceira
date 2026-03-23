import { useState } from "react";
import { Plus, User, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { useAppContext } from "../context";
import { TabMeuGasto } from "../components/Tabs";
import { generateMeusGastosPDF } from "../utils/pdfGenerator";
import { supabase } from "../lib/supabase";
import type { MetaGasto } from "../types";

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
    handlePagarTodosCredito,
    setShowFormMeuGasto,
    features,
    cartoes,
  } = useAppContext();

  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      // Buscar metas do Supabase
      let metas: MetaGasto[] = [];
      if (supabase) {
        const { data } = await supabase.from("metas_gasto").select("*").order("categoria");
        metas = data || [];
      }

      generateMeusGastosPDF(
        meusGastosDoMes,
        gastosFixos,
        metas,
        {
          credito: totalMeusGastosCredito,
          debito: totalMeusGastosDebito,
          pagos: totalMeusGastosPagos,
          fixos: totalGastosFixos,
        },
        mesVisualizacao,
        {
          categoria: filtroCategoriaMeuGasto,
          dia: filtroDiaMeuGasto,
        }
      );
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="w-7 h-7 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meus Gastos</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Despesas pessoais e gastos fixos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {features.exportar_pdf && (
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF || (meusGastosDoMes.length === 0 && gastosFixos.length === 0)}
              className="border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar PDF"
            >
              {exportingPDF ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>
          )}
          {meusGastosDoMes.some(g => g.tipo === "credito" && !g.pago) && (
            <button
              onClick={handlePagarTodosCredito}
              className="bg-purple-100/80 text-purple-700 hover:bg-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:hover:bg-purple-500/30 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="Dar baixa em todas as despesas de crédito"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="hidden sm:inline">Pagar Fatura</span>
            </button>
          )}
          <button
            onClick={() => setShowFormMeuGasto(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Novo</span>
          </button>
        </div>
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
        cartoes={cartoes}
      />
    </div>
  );
};
