import { useEffect, useState } from "react";
import { Users, Plus, Trash2, Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, HelpCircle, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useAppContext } from "../context";
import { formatCurrency, formatMonthYear } from "../utils/calculations";

const COLORS = ["#10B981", "#F59E0B"]; // emerald, amber

interface DevedoresTutorialStep {
  target: string;
  alvo: string;
  titulo: string;
  descricao: string;
  placement?: "above" | "below";
}

const DEVEDORES_TUTORIAL_KEY = "devedores_tutorial_seen_v1";

const DEVEDORES_TUTORIAL_STEPS: DevedoresTutorialStep[] = [
  {
    target: "[data-tour='devedores-header']",
    alvo: "Cabeçalho da aba",
    titulo: "Visão de Devedores",
    descricao:
      "Aqui você gerencia pessoas com valores em aberto e acompanha o total consolidado de cada uma.",
    placement: "below",
  },
  {
    target: "[data-tour='devedores-btn-novo']",
    alvo: "Botão Novo Devedor",
    titulo: "Adicionar pessoa",
    descricao:
      "Use este botão para cadastrar um novo devedor e começar a acompanhar os valores pendentes dele.",
    placement: "below",
  },
  {
    target: "[data-tour='devedores-mes']",
    alvo: "Navegação mensal",
    titulo: "Troca de período",
    descricao:
      "Altere o mês para comparar gastos e dívidas pendentes em diferentes períodos.",
  },
  {
    target: "[data-tour='devedores-lista']",
    alvo: "Lista de devedores",
    titulo: "Cards por pessoa",
    descricao:
      "Cada card mostra total da pessoa e permite expandir para ver detalhes, gráfico e composição dos valores.",
  },
  {
    target: "[data-tour='devedores-item-acoes']",
    alvo: "Ações por pessoa",
    titulo: "Ações rápidas",
    descricao:
      "Dentro de cada card você pode expandir/fechar e remover pessoas quando for necessário.",
  },
  {
    target: "[data-tour='devedores-resumo-total']",
    alvo: "Resumo total",
    titulo: "Panorama geral",
    descricao:
      "No final da tela você vê o total consolidado de gastos do mês e dívidas pendentes de todos os devedores.",
  },
  {
    target: "[data-tour='devedores-help-button']",
    alvo: "Botão de ajuda",
    titulo: "Rever tutorial",
    descricao:
      "Clique no (?) para abrir novamente esta explicação da aba Devedores.",
  },
];

export const PessoasPage = () => {
  const {
    pessoas,
    novaPessoa,
    setNovaPessoa,
    handleAddPessoa,
    handleRemovePessoa,
    setModalConfirm,
    resumoMensal,
    saldosDevedores,
    mesVisualizacao,
    navegarMes,
    irParaHoje,
  } = useAppContext();

  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pessoaExpandida, setPessoaExpandida] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialSteps, setTutorialSteps] = useState<DevedoresTutorialStep[]>([]);
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
    const alreadySeen = localStorage.getItem(DEVEDORES_TUTORIAL_KEY);
    if (!alreadySeen) {
      const availableSteps = DEVEDORES_TUTORIAL_STEPS.filter((step) =>
        Boolean(document.querySelector(step.target))
      );
      setTutorialSteps(availableSteps);
      setShowTutorial(availableSteps.length > 0);
      setTutorialStepIndex(0);
      localStorage.setItem(DEVEDORES_TUTORIAL_KEY, "true");
    }
  }, []);

  const openTutorial = () => {
    const availableSteps = DEVEDORES_TUTORIAL_STEPS.filter((step) =>
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

  const handleAdd = async () => {
    if (!novaPessoa.trim()) return;
    setAdding(true);
    await handleAddPessoa();
    setAdding(false);
    setShowAddForm(false);
  };

  const handleDelete = (nome: string) => {
    setModalConfirm({
      show: true,
      titulo: "Excluir Pessoa",
      mensagem: `Tem certeza que deseja excluir "${nome}"? Isso não afetará gastos ou dívidas já cadastradas.`,
      onConfirm: () => {
        handleRemovePessoa(nome);
        setModalConfirm({ show: false, titulo: "", mensagem: "", onConfirm: () => {} });
      },
    });
  };

  // Calcular estatísticas por pessoa
  const getEstatisticasPessoa = (nome: string) => {
    const resumoPessoa = resumoMensal.find((r) => r.pessoa === nome);
    const dividasPessoa = saldosDevedores.filter((d) => d.pessoa === nome);
    
    const gastosMesAtual = resumoPessoa?.total || 0;
    const dividasPendentes = dividasPessoa.filter((d) => d.valor_atual > 0);
    const totalDividas = dividasPendentes.reduce((sum, d) => sum + d.valor_atual, 0);
    const qtdDividas = dividasPendentes.length;
    
    return { gastosMesAtual, totalDividas, qtdDividas };
  };

  // Totais gerais
  const totalGastosMes = resumoMensal.reduce((sum, r) => sum + r.total, 0);
  const totalDividasGeral = saldosDevedores
    .filter((d) => d.valor_atual > 0)
    .reduce((sum, d) => sum + d.valor_atual, 0);

  // Dados do gráfico geral
  const dadosGraficoGeral = [
    { name: "Gastos do Mês", value: totalGastosMes },
    { name: "Dívidas Pendentes", value: totalDividasGeral },
  ].filter((d) => d.value > 0);

  const toggleExpand = (nome: string) => {
    setPessoaExpandida(pessoaExpandida === nome ? null : nome);
  };

  return (
    <div className="relative p-4 md:p-6 space-y-6">
      <button
        onClick={openTutorial}
        data-tour="devedores-help-button"
        className="hidden md:flex absolute -top-9 right-12 z-30 w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 items-center justify-center shadow-sm transition-colors"
        title="Ver tutorial da aba Devedores"
        aria-label="Ver tutorial da aba Devedores"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Page Header */}
      <div className="flex items-center justify-between" data-tour="devedores-header">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Devedores</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie pessoas com valores em aberto com você</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          data-tour="devedores-btn-novo"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Novo Devedor</span>
        </button>
      </div>

      {/* Seletor de Mês */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-800" data-tour="devedores-mes">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navegarMes("anterior")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {formatMonthYear(mesVisualizacao)}
            </h2>
            <button
              onClick={irParaHoje}
              className="text-sm text-blue-600 hover:text-blue-700 mt-1"
            >
              Ir para hoje
            </button>
          </div>
          <button
            onClick={() => navegarMes("proximo")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Add Person Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Adicionar Devedor</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={novaPessoa}
              onChange={(e) => setNovaPessoa(e.target.value)}
              placeholder="Nome do devedor"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={adding || !novaPessoa.trim()}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Adicionar
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNovaPessoa(""); }}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* People List with Charts */}
      <div className="space-y-3" data-tour="devedores-lista">
        {pessoas.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center shadow-sm">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum devedor cadastrado</p>
          </div>
        ) : (
          pessoas.map((pessoa) => {
            const stats = getEstatisticasPessoa(pessoa);
            const isExpanded = pessoaExpandida === pessoa;
            const dadosGraficoPessoa = [
              { name: "Gastos do Mês", value: stats.gastosMesAtual },
              { name: "Dívidas", value: stats.totalDividas },
            ].filter((d) => d.value > 0);

            return (
              <div
                key={pessoa}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
              >
                {/* Header clicável */}
                <div
                  onClick={() => toggleExpand(pessoa)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3" data-tour="devedores-item-acoes">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-xl">
                        {pessoa.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-lg">{pessoa}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {formatCurrency(stats.gastosMesAtual + stats.totalDividas)} total
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(pessoa); }}
                      disabled={pessoas.length <= 1}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Conteúdo expandido com gráfico */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                        <p className="text-blue-600 dark:text-blue-400 text-xs mb-1">Gastos do Mês</p>
                        <p className="text-gray-900 dark:text-gray-100 font-semibold">{formatCurrency(stats.gastosMesAtual)}</p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3">
                        <p className="text-orange-600 dark:text-orange-400 text-xs mb-1">Dívidas Pendentes</p>
                        <p className="text-gray-900 dark:text-gray-100 font-semibold">{formatCurrency(stats.totalDividas)}</p>
                      </div>
                    </div>

                    {dadosGraficoPessoa.length > 0 ? (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height={192}>
                          <PieChart>
                            <Pie
                              data={dadosGraficoPessoa}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {dadosGraficoPessoa.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => formatCurrency(Number(value))}
                              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                              itemStyle={{ color: "#374151" }}
                              labelStyle={{ color: "#6b7280" }}
                            />
                            <Legend
                              formatter={(value) => <span className="text-gray-600 dark:text-gray-400 text-sm">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 text-center py-4">Sem dados para exibir</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Gráfico Total */}
      {pessoas.length > 0 && (totalGastosMes > 0 || totalDividasGeral > 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4" data-tour="devedores-resumo-total">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">Resumo Total</h3>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
              <p className="text-blue-600 dark:text-blue-400 text-xs mb-1">Total Gastos do Mês</p>
              <p className="text-gray-900 dark:text-gray-100 font-bold text-lg">{formatCurrency(totalGastosMes)}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-center">
              <p className="text-orange-600 dark:text-orange-400 text-xs mb-1">Total Dívidas</p>
              <p className="text-gray-900 dark:text-gray-100 font-bold text-lg">{formatCurrency(totalDividasGeral)}</p>
            </div>
          </div>

          {dadosGraficoGeral.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={dadosGraficoGeral}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dadosGraficoGeral.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                    itemStyle={{ color: "#374151" }}
                    labelStyle={{ color: "#6b7280" }}
                  />
                  <Legend
                    formatter={(value) => <span className="text-gray-600 dark:text-gray-400 text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="text-center mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Geral</p>
            <p className="text-gray-900 dark:text-gray-100 font-bold text-2xl">
              {formatCurrency(totalGastosMes + totalDividasGeral)}
            </p>
          </div>
        </div>
      )}

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
                  Tutorial de Devedores • Passo {tutorialStepIndex + 1} de {tutorialSteps.length}
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
