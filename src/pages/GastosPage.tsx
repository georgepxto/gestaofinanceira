import { Plus, FileText } from "lucide-react";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useAppContext } from "../context";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { TabGastos } from "../components/Tabs";
import { TUTORIAL_TITLES } from "../utils/tutorial";

interface GastosTutorialStep {
  target: string;
  alvo: string;
  titulo: string;
  descricao: string;
  placement?: "above" | "below";
}

const GASTOS_TUTORIAL_KEY = "gastos_tutorial_seen_v1";

const GASTOS_TUTORIAL_STEPS: GastosTutorialStep[] = [
  {
    target: "[data-tour='gastos-header']",
    alvo: "Cabeçalho da aba",
    titulo: "Visão de Empréstimos do Mês",
    descricao:
      "Nesta tela você acompanha os valores emprestados no mês, com foco no que ainda precisa receber.",
    placement: "below",
  },
  {
    target: "[data-tour='gastos-actions']",
    alvo: "Ações rápidas",
    titulo: "Ações principais",
    descricao:
      "Aqui você cria novo empréstimo, exporta PDF e revisa o tutorial sempre que quiser.",
    placement: "below",
  },
  {
    target: "[data-tour='gastos-btn-novo']",
    alvo: "Botão Novo Empréstimo",
    titulo: "Novo empréstimo",
    descricao:
      "Use este botão para registrar um novo valor a receber no mês atual.",
    placement: "below",
  },
  {
    target: "[data-tour='gastos-navegacao-mes']",
    alvo: "Navegação de mês",
    titulo: "Troca de período",
    descricao:
      "Navegue entre os meses para comparar evolução de empréstimos e cobranças.",
  },
  {
    target: "[data-tour='gastos-resumo-cards']",
    alvo: "Cards de resumo",
    titulo: "Resumo do mês",
    descricao:
      "Veja o total do mês e os cartões por devedor com status de pagamento, fechamento e observações.",
  },
  {
    target: "[data-tour='gastos-filtros']",
    alvo: "Filtros",
    titulo: "Filtros inteligentes",
    descricao:
      "Filtre os lançamentos por devedor, tipo (crédito/débito) e dia para encontrar rapidamente o que precisa.",
  },
  {
    target: "[data-tour='gastos-lista']",
    alvo: "Lista de empréstimos",
    titulo: "Lançamentos do mês",
    descricao:
      "A lista mostra cada lançamento com parcela, pessoa, valor e detalhes da cobrança.",
  },
  {
    target: "[data-tour='gastos-item-acoes']",
    alvo: "Ações por item",
    titulo: "Editar e excluir",
    descricao:
      "Cada item permite editar rapidamente ou excluir o lançamento quando necessário.",
  },
  {
    target: "[data-tour='gastos-help-button']",
    alvo: "Botão de ajuda",
    titulo: "Rever tutorial",
    descricao:
      "Clique no (?) para abrir novamente esta explicação da aba Empréstimos do Mês.",
  },
];

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
    features,
  } = useAppContext();

  const {
    viewportSize,
    showTutorial,
    tutorialStepIndex,
    tutorialSteps,
    currentTutorialStep,
    highlightRect,
    tooltipLeft,
    tooltipTop,
    showTooltipBelow,
    openTutorial,
    closeTutorial,
    nextTutorialStep,
    previousTutorialStep,
  } = useGuidedTour<GastosTutorialStep>({
    steps: GASTOS_TUTORIAL_STEPS,
    storageKey: GASTOS_TUTORIAL_KEY,
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial da aba Empréstimos do Mês",
    ariaLabel: "Ver tutorial da aba Empréstimos do Mês",
    dataTour: "gastos-help-button",
  });

  const handleExportPDF = async () => {
    const { generateGastosPDF } = await import("../utils/pdfGenerator");
    const pagamentosPorPessoa: Record<string, import("../types/extended").PagamentoParcial[]> = {};
    pessoas.forEach(pessoa => {
      const pagamentos = getPagamentosParciais(pessoa);
      if (pagamentos.length > 0) {
        pagamentosPorPessoa[pessoa] = pagamentos;
      }
    });

    generateGastosPDF(
      parcelasAtivas,
      resumoMensal,
      totalMes,
      mesVisualizacao,
      {
        pessoa: filtroPessoaGasto,
        tipo: filtroTipoGasto,
        dia: filtroDiaGasto,
      },
      pagamentosPorPessoa
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra de ações da visão Por mês */}
      <div className="flex justify-end">
            <div className="flex items-center gap-2" data-tour="gastos-actions">
              {features.exportar_pdf && (
                <button
                  onClick={handleExportPDF}
                  disabled={parcelasAtivas.length === 0}
                  data-tour="gastos-btn-pdf"
                  className="border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.06] hover:border-zinc-300 px-3 py-2.5 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  title="Exportar PDF"
                >
                  <FileText className="w-5 h-5" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              )}
              <button
                onClick={() => setShowForm(true)}
                data-tour="gastos-btn-novo"
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Novo Empréstimo</span>
              </button>
            </div>
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

      <GuidedTourOverlay
        show={showTutorial}
        tutorialTitle={TUTORIAL_TITLES.gastos}
        currentStep={currentTutorialStep}
        stepIndex={tutorialStepIndex}
        totalSteps={tutorialSteps.length}
        highlightRect={highlightRect}
        viewportSize={viewportSize}
        tooltipLeft={tooltipLeft}
        tooltipTop={tooltipTop}
        showTooltipBelow={showTooltipBelow}
        onClose={closeTutorial}
        onPrevious={previousTutorialStep}
        onNext={nextTutorialStep}
      />
    </div>
  );
};
