import { useEffect, useState } from "react";
import { Plus, TrendingDown, HelpCircle, X } from "lucide-react";
import { useAppContext } from "../context";
import { TabDividas } from "../components/Tabs";

interface DividasTutorialStep {
  target: string;
  alvo: string;
  titulo: string;
  descricao: string;
  placement?: "above" | "below";
}

const DIVIDAS_TUTORIAL_KEY = "dividas_tutorial_seen_v1";

const DIVIDAS_TUTORIAL_STEPS: DividasTutorialStep[] = [
  {
    target: "[data-tour='dividas-header']",
    alvo: "Cabeçalho da aba",
    titulo: "Visão de Dívidas em Aberto",
    descricao:
      "Aqui você acompanha tudo que ainda precisam te pagar e organiza a cobrança por status e pessoa.",
    placement: "below",
  },
  {
    target: "[data-tour='dividas-btn-novo']",
    alvo: "Botão Nova Cobrança",
    titulo: "Registrar nova cobrança",
    descricao:
      "Use este botão para cadastrar um novo valor pendente com pessoa, descrição e valor inicial.",
    placement: "below",
  },
  {
    target: "[data-tour='dividas-total-card']",
    alvo: "Card de total",
    titulo: "Resumo principal",
    descricao:
      "O card mostra o total em aberto ou quitado, conforme o filtro de status ativo no momento.",
  },
  {
    target: "[data-tour='dividas-filtro-status']",
    alvo: "Filtro de status",
    titulo: "Pendentes e pagos",
    descricao:
      "Alterne entre pendentes e pagos para enxergar rapidamente o que falta receber e o que já foi quitado.",
  },
  {
    target: "[data-tour='dividas-filtro-pessoa']",
    alvo: "Filtro por devedor",
    titulo: "Filtrar por pessoa",
    descricao:
      "Selecione um devedor para ver só as cobranças dele e acompanhar saldo individual com precisão.",
  },
  {
    target: "[data-tour='dividas-lista']",
    alvo: "Lista de cobranças",
    titulo: "Detalhes e progresso",
    descricao:
      "Cada cobrança mostra valor original, valor restante, progresso pago e histórico completo de pagamentos.",
  },
  {
    target: "[data-tour='dividas-item-acoes']",
    alvo: "Ações por item",
    titulo: "Registrar e ajustar",
    descricao:
      "Nos botões do item você registra pagamento parcial ou exclui a cobrança quando necessário.",
  },
  {
    target: "[data-tour='dividas-help-button']",
    alvo: "Botão de ajuda",
    titulo: "Rever tutorial",
    descricao:
      "Clique no (?) para abrir novamente este passo a passo da aba Dívidas em Aberto.",
  },
];

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

  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialSteps, setTutorialSteps] = useState<DividasTutorialStep[]>([]);
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
    const alreadySeen = localStorage.getItem(DIVIDAS_TUTORIAL_KEY);
    if (!alreadySeen) {
      const availableSteps = DIVIDAS_TUTORIAL_STEPS.filter((step) =>
        Boolean(document.querySelector(step.target))
      );
      setTutorialSteps(availableSteps);
      setShowTutorial(availableSteps.length > 0);
      setTutorialStepIndex(0);
      localStorage.setItem(DIVIDAS_TUTORIAL_KEY, "true");
    }
  }, []);

  const openTutorial = () => {
    const availableSteps = DIVIDAS_TUTORIAL_STEPS.filter((step) =>
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

  return (
    <div className="relative p-4 md:p-6 space-y-6">
      <button
        onClick={openTutorial}
        data-tour="dividas-help-button"
        className="flex fixed top-4 right-16 md:right-20 z-40 w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 items-center justify-center shadow-sm transition-colors"
        title="Ver tutorial da aba Dívidas em Aberto"
        aria-label="Ver tutorial da aba Dívidas em Aberto"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Page Header */}
      <div className="flex items-center justify-between" data-tour="dividas-header">
        <div className="flex items-center gap-3" data-tour="dividas-header-info">
          <TrendingDown className="w-7 h-7 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dívidas em Aberto</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Acompanhe quanto ainda precisam te pagar</p>
          </div>
        </div>
        <button
          onClick={() => setShowFormDivida(true)}
          data-tour="dividas-btn-novo"
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Nova Cobrança</span>
        </button>
      </div>

      {/* Content */}
      <div data-tour="dividas-content">
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
                  Tutorial de Dívidas • Passo {tutorialStepIndex + 1} de {tutorialSteps.length}
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
