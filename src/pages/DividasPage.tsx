import { Plus } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useAppContext } from "../context";
import { useGuidedTour, usePageTutorialHelpButton, useIsMobile } from "../hooks";
import { Button } from "../components/ui/Button";
import { useAcaoPrincipalDaPagina } from "../components/layout/AcaoPrincipalContext";
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
    titulo: "Cobranças",
    descricao:
      "As dívidas que ficaram: as que você cadastrou e o resto dos meses fechados. Não dependem de mês.",
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
      "O total do que ainda te devem, ou do que já foi quitado, conforme a escolha ao lado.",
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
      "Toque no (?) para ver este guia de novo.",
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
  const isMobile = useIsMobile();
  // "Nova cobrança" é o botão laranja desta tela no desktop.
  useAcaoPrincipalDaPagina(!isMobile);
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
    title: "Ver tutorial de Cobranças",
    ariaLabel: "Ver tutorial de Cobranças",
    dataTour: "dividas-help-button",
  });

  return (
    <div className="space-y-6 md:space-y-8">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="dividas-header"
        title="Cobranças"
        description="Dívidas que ficaram, sem mês: as que você cadastrou e o resto dos meses fechados."
        action={
          <Button
            variante={isMobile ? "secundario" : "principal"}
            onClick={() => setShowFormDivida(true)}
            data-tour="dividas-btn-novo"
            icone={<Plus className="w-4 h-4" strokeWidth={1.75} />}
          >
            Nova cobrança
          </Button>
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
