import { Plus, FileText } from "lucide-react";
import { PageHeader, classeAcoesCabecalho } from "../components/ui/PageHeader";
import { SeletorMes } from "../components/ui/SeletorMes";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useAppContext } from "../context";
import { useGuidedTour, usePageTutorialHelpButton, useIsMobile } from "../hooks";
import { Button } from "../components/ui/Button";
import { useAcaoPrincipalDaPagina } from "../components/layout/AcaoPrincipalContext";
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
    titulo: "Mês a mês",
    descricao:
      "Empréstimos e divisões do mês escolhido, item por item. Quanto cada pessoa deve no total fica em Pessoas.",
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
      "Registre um empréstimo: algo que alguém pegou com você e vai devolver.",
    placement: "below",
  },
  {
    target: "[data-tour='gastos-navegacao-mes']",
    alvo: "Navegação de mês",
    titulo: "Troca de período",
    descricao:
      "Navegue entre os meses para ver os lançamentos de cada um.",
  },
  {
    target: "[data-tour='gastos-resumo-cards']",
    alvo: "Cards de resumo",
    titulo: "Resumo do mês",
    descricao:
      "Quanto foi lançado no mês, quanto já voltou e quanto falta receber.",
  },
  {
    target: "[data-tour='gastos-filtros']",
    alvo: "Filtros",
    titulo: "Filtros inteligentes",
    descricao:
      "Filtre por pessoa, tipo e dia. Escolhendo uma pessoa, aparece o mês dela com as ações de pagar e fechar o mês.",
  },
  {
    target: "[data-tour='gastos-lista']",
    alvo: "Lista de lançamentos",
    titulo: "Lançamentos do mês",
    descricao:
      "Cada lançamento com pessoa, parcela e valor.",
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
      "Toque no (?) para ver este guia de novo.",
  },
];

export const GastosPage = () => {
  const {
    mesVisualizacao,
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
  const isMobile = useIsMobile();
  // "Novo empréstimo" é o botão laranja desta tela no desktop.
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
  } = useGuidedTour<GastosTutorialStep>({
    steps: GASTOS_TUTORIAL_STEPS,
    storageKey: GASTOS_TUTORIAL_KEY,
    ready: !loading,
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial de Mês a mês",
    ariaLabel: "Ver tutorial de Mês a mês",
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
    <div className="space-y-6 md:space-y-8">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="gastos-header"
        title="Mês a mês"
        description="Empréstimos e divisões de cada mês, item por item."
        action={
          <div className={classeAcoesCabecalho} data-tour="gastos-actions">
            <SeletorMes data-tour="gastos-navegacao-mes" />
            {features.exportar_pdf && (
              <Button
                onClick={handleExportPDF}
                disabled={parcelasAtivas.length === 0}
                data-tour="gastos-btn-pdf"
                title="Exportar PDF"
                icone={<FileText className="w-4 h-4" strokeWidth={1.5} />}
              >
                PDF
              </Button>
            )}
            <Button
              variante={isMobile ? "secundario" : "principal"}
              onClick={() => setShowForm(true)}
              data-tour="gastos-btn-novo"
              icone={<Plus className="w-4 h-4" strokeWidth={1.75} />}
            >
              Novo empréstimo
            </Button>
          </div>
        }
      />

      {/* Content */}
      <TabGastos
        mesVisualizacao={mesVisualizacao}
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
