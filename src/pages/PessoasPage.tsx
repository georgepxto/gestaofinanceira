import { useState, useMemo } from "react";
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useAppContext } from "../context";
import { useTheme } from "../hooks/useTheme";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { PageEmptyState } from "../components/ui/AsyncState";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { formatCurrency, formatMonthYear } from "../utils/calculations";
import { TUTORIAL_TITLES } from "../utils/tutorial";

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

  const { theme } = useTheme();
  const tooltipStyle = useMemo(() => theme === "dark"
    ? { backgroundColor: "#18181B", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", boxShadow: "0 4px 24px -4px rgba(0,0,0,0.5)", fontSize: "12px", color: "#FAFAFA" }
    : { backgroundColor: "#FFFFFF", border: "1px solid #E4E4E7", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", fontSize: "12px" },
    [theme]
  );
  const tooltipItemStyle = useMemo(() => theme === "dark" ? { color: "#F4F4F5" } : { color: "#27272A" }, [theme]);
  const tooltipLabelStyle = useMemo(() => theme === "dark" ? { color: "#A1A1AA" } : { color: "#71717A" }, [theme]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pessoaExpandida, setPessoaExpandida] = useState<string | null>(null);
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
  } = useGuidedTour<DevedoresTutorialStep>({
    steps: DEVEDORES_TUTORIAL_STEPS,
    storageKey: DEVEDORES_TUTORIAL_KEY,
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial da aba Devedores",
    ariaLabel: "Ver tutorial da aba Devedores",
    dataTour: "devedores-help-button",
  });

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
    <div className="space-y-6">
      {/* Barra de ações da visão Por pessoa */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddForm(true)}
          data-tour="devedores-btn-novo"
          className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Novo Devedor</span>
        </button>
      </div>

      {/* Seletor de Mês */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm p-4 border border-zinc-200 dark:border-zinc-800" data-tour="devedores-mes">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navegarMes("anterior")}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
          </button>
          <div className="text-center">
            <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 capitalize">
              {formatMonthYear(mesVisualizacao)}
            </h2>
            <button
              onClick={irParaHoje}
              className="text-sm text-emerald-600 hover:text-emerald-700 mt-1"
            >
              Ir para hoje
            </button>
          </div>
          <button
            onClick={() => navegarMes("proximo")}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Add Person Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">Adicionar Devedor</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={novaPessoa}
              onChange={(e) => setNovaPessoa(e.target.value)}
              placeholder="Nome do devedor"
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={adding || !novaPessoa.trim()}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Adicionar
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNovaPessoa(""); }}
                className="px-4 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors"
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
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
            <PageEmptyState
              compact
              title="Nenhum devedor cadastrado"
              description="Clique em Novo Devedor para começar a acompanhar valores em aberto."
            />
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
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm"
              >
                {/* Header — o gesto de expandir é um botão de verdade, para
                    funcionar por teclado; excluir fica fora dele (botão dentro
                    de botão é HTML inválido). */}
                <div className="flex items-center justify-between gap-3 p-4 hover:bg-zinc-50 dark:hover:bg-white/[0.06] transition-colors" data-tour="devedores-item-acoes">
                  <button
                    type="button"
                    onClick={() => toggleExpand(pessoa)}
                    aria-expanded={isExpanded}
                    className="flex flex-1 min-w-0 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
                  >
                    <div className="w-12 h-12 flex-shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                      <span className="font-display text-emerald-600 dark:text-emerald-400 font-bold text-xl">
                        {pessoa.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-zinc-900 dark:text-zinc-50 font-semibold text-lg truncate">{pessoa}</h3>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                        <span className="font-mono tabular-nums">{formatCurrency(stats.gastosMesAtual + stats.totalDividas)}</span> total
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => handleDelete(pessoa)}
                      disabled={pessoas.length <= 1}
                      aria-label={`Excluir ${pessoa}`}
                      className="p-2 rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    )}
                  </div>
                </div>

                {/* Conteúdo expandido com gráfico */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
                      <div className="bg-zinc-50 dark:bg-white/[0.03] rounded-xl p-3 border border-zinc-200 dark:border-zinc-800">
                        <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-1">Gastos do Mês</p>
                        <p className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100 font-semibold">{formatCurrency(stats.gastosMesAtual)}</p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 border border-amber-200/70 dark:border-amber-900/40">
                        <p className="text-amber-600 dark:text-amber-400 text-xs mb-1">Dívidas Pendentes</p>
                        <p className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100 font-semibold">{formatCurrency(stats.totalDividas)}</p>
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
                              contentStyle={tooltipStyle}
                              itemStyle={tooltipItemStyle}
                              labelStyle={tooltipLabelStyle}
                            />
                            <Legend
                              formatter={(value) => <span className="text-zinc-600 dark:text-zinc-400 text-sm">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <PageEmptyState
                        compact
                        title="Sem dados para exibir"
                        description="Quando houver gastos ou dívidas para esta pessoa, o gráfico aparecerá aqui."
                      />
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
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4" data-tour="devedores-resumo-total">
          <h3 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4 text-center">Resumo Total</h3>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-zinc-50 dark:bg-white/[0.03] rounded-xl p-3 text-center border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-1">Total Gastos do Mês</p>
              <p className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100 font-bold text-lg">{formatCurrency(totalGastosMes)}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 text-center border border-amber-200/70 dark:border-amber-900/40">
              <p className="text-amber-600 dark:text-amber-400 text-xs mb-1">Total Dívidas</p>
              <p className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100 font-bold text-lg">{formatCurrency(totalDividasGeral)}</p>
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
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Legend
                    formatter={(value) => <span className="text-zinc-600 dark:text-zinc-400 text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="text-center mt-4 p-3 bg-zinc-50 dark:bg-white/[0.04] rounded-lg">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Total Geral</p>
            <p className="text-zinc-900 dark:text-zinc-100 font-bold text-2xl">
              {formatCurrency(totalGastosMes + totalDividasGeral)}
            </p>
          </div>
        </div>
      )}

      <GuidedTourOverlay
        show={showTutorial}
        tutorialTitle={TUTORIAL_TITLES.devedores}
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
