import { useEffect, useState } from "react";
import { Plus, User, FileText, Loader2, CheckCircle2, HelpCircle, X } from "lucide-react";
import { useAppContext } from "../context";
import { TabMeuGasto } from "../components/Tabs";
import { generateMeusGastosPDF } from "../utils/pdfGenerator";
import { supabase } from "../lib/supabase";
import type { MetaGasto } from "../types";

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
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialSteps, setTutorialSteps] = useState<MeuGastoTutorialStep[]>([]);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const alreadySeen = localStorage.getItem(MEUS_GASTOS_TUTORIAL_KEY);
    if (!alreadySeen) {
      const availableSteps = MEUS_GASTOS_TUTORIAL_STEPS.filter((step) =>
        Boolean(document.querySelector(step.target))
      );
      setTutorialSteps(availableSteps);
      setShowTutorial(availableSteps.length > 0);
      setTutorialStepIndex(0);
      localStorage.setItem(MEUS_GASTOS_TUTORIAL_KEY, "true");
    }
  }, []);

  const openTutorial = () => {
    const availableSteps = MEUS_GASTOS_TUTORIAL_STEPS.filter((step) =>
      Boolean(document.querySelector(step.target))
    );
    setTutorialSteps(availableSteps);
    setTutorialStepIndex(0);
    setShowTutorial(availableSteps.length > 0);
  };

  const closeTutorial = () => {
    setShowTutorial(false);
  };

  const nextTutorialStep = () => {
    if (tutorialStepIndex >= tutorialSteps.length - 1) {
      closeTutorial();
      return;
    }
    setTutorialStepIndex((prev) => prev + 1);
  };

  const previousTutorialStep = () => {
    setTutorialStepIndex((prev) => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    if (!showTutorial || tutorialSteps.length === 0) return;

    const currentStep = tutorialSteps[tutorialStepIndex];
    const targetElement = document.querySelector(currentStep.target);

    if (!targetElement) {
      setHighlightRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(currentStep.target);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setHighlightRect(rect);
    };

    const targetRect = (targetElement as HTMLElement).getBoundingClientRect();
    const isFullyVisible =
      targetRect.top >= 96 &&
      targetRect.bottom <= window.innerHeight - 96 &&
      targetRect.left >= 16 &&
      targetRect.right <= window.innerWidth - 16;

    if (!isFullyVisible && tutorialStepIndex > 0) {
      (targetElement as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [showTutorial, tutorialStepIndex, tutorialSteps]);

  const currentTutorialStep = tutorialSteps[tutorialStepIndex];

  const isMobile = viewportSize.width < 640;
  const tooltipWidth = isMobile ? Math.min(viewportSize.width - 24, 360) : 340;
  const tooltipHeight = isMobile ? 320 : 300;
  const tooltipLeft = highlightRect
    ? isMobile
      ? 12
      : Math.min(
          Math.max(16, highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2),
          Math.max(16, viewportSize.width - tooltipWidth - 16)
        )
    : 16;
  const { tooltipTop, showTooltipBelow } = (() => {
    if (!highlightRect) {
      return { tooltipTop: 16, showTooltipBelow: false };
    }

    if (isMobile) {
      return {
        tooltipTop: Math.max(12, viewportSize.height - tooltipHeight - 12),
        showTooltipBelow: true,
      };
    }

    const minTop = 16;
    const maxTop = Math.max(16, viewportSize.height - tooltipHeight - 16);
    const spacing = 12;
    const preferredPlacement = currentTutorialStep?.placement;
    const topBelow = highlightRect.bottom + spacing;
    const topAbove = highlightRect.top - tooltipHeight - spacing;
    const canPlaceBelow = topBelow <= maxTop;
    const canPlaceAbove = topAbove >= minTop;

    if (preferredPlacement === "below" && canPlaceBelow) {
      return { tooltipTop: topBelow, showTooltipBelow: true };
    }

    if (preferredPlacement === "above" && canPlaceAbove) {
      return { tooltipTop: topAbove, showTooltipBelow: false };
    }

    if (canPlaceBelow) {
      return { tooltipTop: topBelow, showTooltipBelow: true };
    }

    if (canPlaceAbove) {
      return { tooltipTop: topAbove, showTooltipBelow: false };
    }

    const clampedBelow = Math.min(Math.max(topBelow, minTop), maxTop);
    const clampedAbove = Math.min(Math.max(topAbove, minTop), maxTop);
    const overlapBelow = Math.max(
      0,
      Math.min(clampedBelow + tooltipHeight, highlightRect.bottom) -
        Math.max(clampedBelow, highlightRect.top)
    );
    const overlapAbove = Math.max(
      0,
      Math.min(clampedAbove + tooltipHeight, highlightRect.bottom) -
        Math.max(clampedAbove, highlightRect.top)
    );

    if (overlapBelow <= overlapAbove) {
      return { tooltipTop: clampedBelow, showTooltipBelow: true };
    }

    return { tooltipTop: clampedAbove, showTooltipBelow: false };
  })();

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
    <div className="relative p-4 md:p-6 space-y-6">
      <button
        onClick={openTutorial}
        data-tour="eu-help-button"
        className="flex fixed top-4 right-16 md:right-20 z-40 w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 items-center justify-center shadow-sm transition-colors"
        title="Ver tutorial da aba Meus Gastos"
        aria-label="Ver tutorial da aba Meus Gastos"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Page Header */}
      <div className="flex items-center justify-between" data-tour="eu-header">
        <div className="flex items-center gap-3">
          <User className="w-7 h-7 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Meus Gastos</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Despesas pessoais e gastos fixos</p>
          </div>
        </div>
        <div className="flex items-center gap-2" data-tour="eu-actions">
          {features.exportar_pdf && (
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF || (meusGastosDoMes.length === 0 && gastosFixos.length === 0)}
              data-tour="eu-btn-pdf"
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
              data-tour="eu-btn-pagar-fatura"
              className="bg-purple-100/80 text-purple-700 hover:bg-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:hover:bg-purple-500/30 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="Dar baixa em todas as despesas de crédito"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="hidden sm:inline">Pagar Fatura</span>
            </button>
          )}
          <button
            onClick={() => setShowFormMeuGasto(true)}
            data-tour="eu-btn-novo"
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
          handleReativarGastoFixo={handleReativarGastoFixo}
          handleSuspenderMultiplosMeses={handleSuspenderMultiplosMeses}
        handleDeleteMeuGasto={handleDeleteMeuGasto}
        handleTogglePagoMeuGasto={handleTogglePagoMeuGasto}
        cartoes={cartoes}
      />

      {showTutorial && currentTutorialStep && (
        <div className="fixed inset-0 z-[60] pointer-events-none" style={{ position: "fixed" }}>
          {highlightRect && (
            <>
              <div
                className="fixed bg-black/75"
                style={{
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: Math.max(0, highlightRect.top - 8),
                }}
              />
              <div
                className="fixed bg-black/75"
                style={{
                  top: Math.max(0, highlightRect.top - 8),
                  left: 0,
                  width: Math.max(0, highlightRect.left - 8),
                  height: highlightRect.height + 16,
                }}
              />
              <div
                className="fixed bg-black/75"
                style={{
                  top: Math.max(0, highlightRect.top - 8),
                  left: highlightRect.right + 8,
                  width: Math.max(0, viewportSize.width - highlightRect.right - 8),
                  height: highlightRect.height + 16,
                }}
              />
              <div
                className="fixed bg-black/75"
                style={{
                  top: highlightRect.bottom + 8,
                  left: 0,
                  width: "100%",
                  height: Math.max(0, viewportSize.height - highlightRect.bottom - 8),
                }}
              />
              <div
                className="fixed rounded-2xl border-2 border-blue-300 bg-transparent"
                style={{
                  top: highlightRect.top - 8,
                  left: highlightRect.left - 8,
                  width: highlightRect.width + 16,
                  height: highlightRect.height + 16,
                  boxShadow: "0 0 0 2px rgba(96,165,250,0.55), 0 0 24px rgba(59,130,246,0.18)",
                }}
              />
            </>
          )}

          {highlightRect && (
            <div
              className="absolute w-0 h-0"
              style={{
                left: highlightRect.left + highlightRect.width / 2 - 10,
                top: showTooltipBelow ? highlightRect.bottom + 6 : highlightRect.top - 16,
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderTop: showTooltipBelow ? "12px solid #2563EB" : "0px solid transparent",
                borderBottom: showTooltipBelow ? "0px solid transparent" : "12px solid #2563EB",
              }}
            />
          )}

          <div
            className="absolute pointer-events-auto bg-gray-900 text-gray-100 w-[calc(100vw-24px)] max-w-[360px] rounded-2xl border border-blue-900 overflow-hidden shadow-2xl max-h-[calc(100vh-24px)] overflow-y-auto"
            style={{ left: tooltipLeft, top: tooltipTop }}
          >
            <div className="px-4 py-3 border-b border-blue-900 flex items-start justify-between gap-3 bg-blue-700">
              <div>
                <p className="text-xs font-medium text-blue-100">
                  Tutorial de Meus Gastos • Passo {tutorialStepIndex + 1} de {tutorialSteps.length}
                </p>
                <h3 className="text-base font-semibold text-white mt-1">
                  {currentTutorialStep.titulo}
                </h3>
              </div>
              <button
                onClick={closeTutorial}
                className="p-1.5 rounded-lg hover:bg-blue-800 transition-colors"
                aria-label="Fechar tutorial"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="px-4 py-4">
              <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-950 text-blue-200 text-xs font-semibold mb-3 border border-blue-900">
                {currentTutorialStep.alvo}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {currentTutorialStep.descricao}
              </p>

              <div className="flex gap-1.5 mt-4">
                {tutorialSteps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i <= tutorialStepIndex ? "bg-blue-500" : "bg-gray-700"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between gap-2 bg-gray-950">
              <button
                onClick={previousTutorialStep}
                disabled={tutorialStepIndex === 0}
                className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Voltar
              </button>

              <button
                onClick={nextTutorialStep}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                {tutorialStepIndex === tutorialSteps.length - 1 ? "Concluir" : "Próximo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
