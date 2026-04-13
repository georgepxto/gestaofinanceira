import { Plus, TrendingDown } from "lucide-react";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useAppContext } from "../context";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { TabDividas } from "../components/Tabs";
import { PAGE_CONTAINER_RELATIVE_CLASS } from "../utils/layout";
import { TUTORIAL_TITLES } from "../utils/tutorial";

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
  } = useGuidedTour<DividasTutorialStep>({
    steps: DIVIDAS_TUTORIAL_STEPS,
    storageKey: DIVIDAS_TUTORIAL_KEY,
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial da aba Dívidas em Aberto",
    ariaLabel: "Ver tutorial da aba Dívidas em Aberto",
    dataTour: "dividas-help-button",
  });

  return (
    <div className={PAGE_CONTAINER_RELATIVE_CLASS}>
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

      <GuidedTourOverlay
        show={showTutorial}
        tutorialTitle={TUTORIAL_TITLES.dividas}
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
