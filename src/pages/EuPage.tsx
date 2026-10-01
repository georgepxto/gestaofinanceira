import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, FileText, CheckCircle2 } from "lucide-react";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useAppContext } from "../context";
import { useGuidedTour, usePageTutorialHelpButton, useIsMobile } from "../hooks";
import { TabMeuGasto } from "../components/Tabs";
import { TUTORIAL_TITLES } from "../utils/tutorial";
import { supabase } from "../lib/supabase";
import type { MetaGasto } from "../types";
import { PageHeader } from "../components/ui/PageHeader";
import { SeletorMes } from "../components/ui/SeletorMes";
import { Button } from "../components/ui/Button";
import { useAcaoPrincipalDaPagina } from "../components/layout/AcaoPrincipalContext";

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
    titulo: "Lançamentos",
    descricao:
      "Aqui você controla despesas pessoais, gastos fixos, filtros e pagamentos em um único fluxo.",
    placement: "below",
  },
  {
    target: "[data-tour='eu-actions']",
    alvo: "Ações rápidas",
    titulo: "Botões principais",
    descricao:
      "Aqui você lança um gasto novo e exporta o mês em PDF.",
    placement: "below",
  },
  {
    target: "[data-tour='eu-btn-novo']",
    alvo: "Botão Novo",
    titulo: "Cadastrar gasto",
    descricao:
      "Lance um gasto pessoal, dividido ou fixo. Escolha a conta de onde ele sai para entrar no saldo.",
    placement: "below",
  },
  // No mobile este passo é substituído pelo do `+` da barra inferior — ver
  // `passosDoTutorial` no componente. Sem a troca, o tour apontaria para o
  // botão do header, que ali está escondido.
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
      "Os totais do mês: crédito (pela fatura), débito, o que já foi pago e os fixos.",
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
      "O que sai todo mês. No menu de cada um: pausar um mês, editar, desativar ou excluir. Mudar o valor não altera os meses que já passaram.",
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
      "Toque no (?) para ver este guia de novo.",
  },
];

export const EuPage = () => {
  const {
    mesVisualizacao,
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
  const isMobile = useIsMobile();
  // "Novo gasto" é o botão laranja desta tela no desktop; o "Lançar" da barra
  // lateral fica neutro enquanto ela está aberta.
  useAcaoPrincipalDaPagina(!isMobile);

  // O botão "Novo gasto" do header não existe no mobile (o `+` da barra faz o
  // mesmo). O passo do tour aponta para o gatilho que está na tela.
  const passosDoTutorial = useMemo(
    () =>
      MEUS_GASTOS_TUTORIAL_STEPS.map((passo) =>
        isMobile && passo.target === "[data-tour='eu-btn-novo']"
          ? {
              ...passo,
              target: "[data-tour='barra-btn-novo']",
              alvo: "Botão de lançar",
              descricao:
                "Use o + da barra de baixo para lançar um gasto pessoal, fixo, dividido ou dívida.",
            }
          : passo
      ),
    [isMobile]
  );

  // O botão de lançar da barra inferior chega aqui por rota, com `?novo=1`.
  // O parâmetro é consumido uma vez e apagado do histórico: sem isso o modal
  // reabriria toda vez que o usuário voltasse para esta tela.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("novo") !== "1") return;
    setShowFormMeuGasto(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, setShowFormMeuGasto]);
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
    steps: passosDoTutorial,
    storageKey: MEUS_GASTOS_TUTORIAL_KEY,
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial de Lançamentos",
    ariaLabel: "Ver tutorial de Lançamentos",
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

  return (
    <div className="space-y-6 md:space-y-8">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="eu-header"
        title="Lançamentos"
        description="Suas despesas pessoais e gastos fixos do mês."
        action={
          <div className="flex items-center gap-2 flex-wrap" data-tour="eu-actions">
            <SeletorMes data-tour="eu-navegacao-mes" />
            {features.exportar_pdf && (
              <Button
                onClick={handleExportPDF}
                disabled={meusGastosDoMes.length === 0 && gastosFixos.length === 0}
                carregando={exportingPDF}
                data-tour="eu-btn-pdf"
                title="Exportar PDF"
                icone={<FileText className="w-4 h-4" strokeWidth={1.5} />}
              >
                PDF
              </Button>
            )}
            {meusGastosDoMes.some((g) => g.tipo === "credito" && !g.pago) && (
              <Button
                onClick={handlePagarTodosCredito}
                data-tour="eu-btn-pagar-fatura"
                title="Dar baixa em todas as despesas de crédito"
                aria-label="Pagar fatura"
                icone={<CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />}
              >
                <span className="hidden sm:inline">Pagar fatura</span>
              </Button>
            )}
            {/* No celular o "+" da barra inferior é o botão da tela. O elemento
                continua no DOM porque o passo do tour ancora nele. */}
            <Button
              variante="principal"
              onClick={() => setShowFormMeuGasto(true)}
              data-tour="eu-btn-novo"
              className="hidden md:inline-flex"
              icone={<Plus className="w-4 h-4" strokeWidth={1.75} />}
            >
              Novo gasto
            </Button>
          </div>
        }
      />

      {/* Content */}
      <TabMeuGasto
        mesVisualizacao={mesVisualizacao}
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
