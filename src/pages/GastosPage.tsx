import { Plus, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "../components/ui/PageHeader";
import { formatMonthYear } from "../utils/calculations";
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

  const isMesCorrente = format(mesVisualizacao, "yyyy-MM") === format(new Date(), "yyyy-MM");

  return (
    <div className="space-y-6">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="gastos-header"
        eyebrow={<>A receber · <span className="capitalize">{format(mesVisualizacao, "MMMM", { locale: ptBR })}</span></>}
        title="Empréstimos do mês"
        description="Valores a receber, organizados por devedor."
        action={
          <div className="flex items-center gap-3 flex-wrap" data-tour="gastos-actions">
            {/* MES_PILL */}
            <div className="inline-flex items-center bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] rounded-xl p-1 shadow-sm" data-tour="gastos-navegacao-mes">
              <button
                onClick={() => navegarMes("anterior")}
                aria-label="Mês anterior"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"
              >
                <ChevronLeft className="w-[18px] h-[18px]" />
              </button>
              <span className="min-w-[128px] text-center text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-100">
                {formatMonthYear(mesVisualizacao)}
              </span>
              {!isMesCorrente && (
                <button
                  onClick={irParaHoje}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 px-1.5"
                >
                  hoje
                </button>
              )}
              <button
                onClick={() => navegarMes("proximo")}
                aria-label="Próximo mês"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"
              >
                <ChevronRight className="w-[18px] h-[18px]" />
              </button>
            </div>
            {features.exportar_pdf && (
              <button
                onClick={handleExportPDF}
                disabled={parcelasAtivas.length === 0}
                data-tour="gastos-btn-pdf"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                title="Exportar PDF"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
            )}
            <button
              onClick={() => setShowForm(true)}
              data-tour="gastos-btn-novo"
              className="inline-flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <Plus className="w-[18px] h-[18px]" />
              Novo empréstimo
            </button>
          </div>
        }
      />

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
