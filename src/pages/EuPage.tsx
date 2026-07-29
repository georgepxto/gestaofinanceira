import { useState } from "react";
import { Plus, FileText, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useAppContext } from "../context";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { TabMeuGasto } from "../components/Tabs";
import { TUTORIAL_TITLES } from "../utils/tutorial";
import { supabase } from "../lib/supabase";
import { formatMonthYear } from "../utils/calculations";
import type { MetaGasto } from "../types";
import { PageHeader } from "../components/ui/PageHeader";

interface MeuGastoTutorialStep {
  target: string;
  alvo: string;
  titulo: string;
  descricao: string;
  placement?: "above" | "below";
}

const MEUS_GASTOS_TUTORIAL_KEY = "meus_gastos_tutorial_seen_v1";

const MEUS_GASTOS_TUTORIAL_STEPS: MeuGastoTutorialStep[] = [
  {
    target: "[data-tour='eu-header']",
    alvo: "Cabeçalho da aba",
    titulo: "Visão da aba Meus Gastos",
    descricao:
      "Aqui você controla despesas pessoais, gastos fixos, filtros e pagamentos em um único fluxo.",
    placement: "below",
  },
  {
    target: "[data-tour='eu-actions']",
    alvo: "Ações rápidas",
    titulo: "Botões principais",
    descricao:
      "Nesta área você abre novo gasto, quita fatura em lote e exporta PDF quando disponível.",
    placement: "below",
  },
  {
    target: "[data-tour='eu-btn-novo']",
    alvo: "Botão Novo",
    titulo: "Cadastrar gasto",
    descricao:
      "Use este botão para lançar um novo gasto pessoal, fixo, dividido ou dívida.",
    placement: "below",
  },
  {
    target: "[data-tour='eu-navegacao-mes']",
    alvo: "Navegação de mês",
    titulo: "Troca de período",
    descricao:
      "Altere o mês para revisar lançamentos passados e futuros sem sair da aba.",
  },
  {
    target: "[data-tour='eu-resumo-cards']",
    alvo: "Resumo financeiro",
    titulo: "Cards de totais",
    descricao:
      "Veja rapidamente os totais de crédito, débito, pagos e gastos fixos do mês selecionado.",
  },
  {
    target: "[data-tour='eu-filtro-categoria']",
    alvo: "Filtro por categoria",
    titulo: "Filtro por tipo",
    descricao:
      "Filtre os lançamentos por pessoal, dividido, dívida ou fixo para focar no que importa.",
  },
  {
    target: "[data-tour='eu-filtro-dia']",
    alvo: "Filtro por dia",
    titulo: "Filtro por data",
    descricao:
      "Selecione um dia específico do mês para analisar somente os gastos daquela data.",
  },
  {
    target: "[data-tour='eu-gastos-fixos']",
    alvo: "Gastos fixos",
    titulo: "Controle de fixos",
    descricao:
      "Aqui você edita, pausa, reativa ou desativa gastos recorrentes mensalmente.",
  },
  {
    target: "[data-tour='eu-lista-gastos']",
    alvo: "Lista de lançamentos",
    titulo: "Lista do mês",
    descricao:
      "Todos os gastos do mês ficam agrupados por dia, com status de pagamento e detalhes.",
  },
  {
    target: "[data-tour='eu-item-acoes']",
    alvo: "Ações do lançamento",
    titulo: "Ações por item",
    descricao:
      "Cada lançamento permite marcar como pago, editar, pausar fixo e excluir rapidamente.",
  },
  {
    target: "[data-tour='eu-help-button']",
    alvo: "Botão de ajuda",
    titulo: "Rever tutorial",
    descricao:
      "Clique no (?) sempre que quiser abrir novamente esta explicação da aba Meus Gastos.",
  },
];

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
    handleReativarGastoFixo,
    handleSuspenderMultiplosMeses,
    handleDeleteMeuGasto,
    handleTogglePagoMeuGasto,
    handlePagarTodosCredito,
    setShowFormMeuGasto,
    features,
    cartoes,
  } = useAppContext();

  const [exportingPDF, setExportingPDF] = useState(false);
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
  } = useGuidedTour<MeuGastoTutorialStep>({
    steps: MEUS_GASTOS_TUTORIAL_STEPS,
    storageKey: MEUS_GASTOS_TUTORIAL_KEY,
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial da aba Meus Gastos",
    ariaLabel: "Ver tutorial da aba Meus Gastos",
    dataTour: "eu-help-button",
  });

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const { generateMeusGastosPDF } = await import("../utils/pdfGenerator");
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

  const isMesCorrente = format(mesVisualizacao, "yyyy-MM") === format(new Date(), "yyyy-MM");

  return (
    <div className="space-y-6">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="eu-header"
        eyebrow={<>Gastos · <span className="capitalize">{format(mesVisualizacao, "MMMM", { locale: ptBR })}</span></>}
        title="Lançamentos"
        description="Suas despesas pessoais e gastos fixos do mês."
        action={
          <div className="flex items-center gap-3 flex-wrap" data-tour="eu-actions">
            {/* MES_PILL */}
            <div className="inline-flex items-center bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] rounded-xl p-1 shadow-sm" data-tour="eu-navegacao-mes">
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
                disabled={exportingPDF || (meusGastosDoMes.length === 0 && gastosFixos.length === 0)}
                data-tour="eu-btn-pdf"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                title="Exportar PDF"
              >
                {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                PDF
              </button>
            )}
            {meusGastosDoMes.some(g => g.tipo === "credito" && !g.pago) && (
              <button
                onClick={handlePagarTodosCredito}
                data-tour="eu-btn-pagar-fatura"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-emerald-400 text-zinc-600 hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-400 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                title="Dar baixa em todas as despesas de crédito"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="hidden sm:inline">Pagar fatura</span>
              </button>
            )}
            <button
              onClick={() => setShowFormMeuGasto(true)}
              data-tour="eu-btn-novo"
              className="inline-flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <Plus className="w-[18px] h-[18px]" />
              Novo gasto
            </button>
          </div>
        }
      />

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
          handleReativarGastoFixo={handleReativarGastoFixo}
          handleSuspenderMultiplosMeses={handleSuspenderMultiplosMeses}
        handleDeleteMeuGasto={handleDeleteMeuGasto}
        handleTogglePagoMeuGasto={handleTogglePagoMeuGasto}
        cartoes={cartoes}
      />

      <GuidedTourOverlay
        show={showTutorial}
        tutorialTitle={TUTORIAL_TITLES.meusGastos}
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
