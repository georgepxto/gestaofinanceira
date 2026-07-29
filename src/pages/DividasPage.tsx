import { Plus } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useAppContext } from "../context";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { TabDividas } from "../components/Tabs";
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
    <div className="space-y-6">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="dividas-header"
        eyebrow="Cobranças"
        title="Dívidas em aberto"
        description="Tudo que ainda precisam te pagar, com o progresso de cada cobrança."
        action={
          <button
            onClick={() => setShowFormDivida(true)}
            data-tour="dividas-btn-novo"
            className="inline-flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-[18px] h-[18px]" />
            Nova cobrança
          </button>
        }
      />

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
