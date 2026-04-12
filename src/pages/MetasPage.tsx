import { useState, useEffect, useCallback } from "react";
import { Target, Plus, X, Loader2, HelpCircle } from "lucide-react";
import { useAppContext } from "../context";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../utils/calculations";
import { CATEGORIAS } from "../utils/categories";
import type { MetaGasto } from "../types";

interface MetasTutorialStep {
  target: string;
  alvo: string;
  titulo: string;
  descricao: string;
  placement?: "above" | "below";
}

const METAS_TUTORIAL_KEY = "metas_gasto_tutorial_seen_v1";

const METAS_TUTORIAL_STEPS: MetasTutorialStep[] = [
  {
    target: "[data-tour='metas-header']",
    alvo: "Cabeçalho da aba",
    titulo: "Visão de Metas de Gasto",
    descricao:
      "Aqui você define limites mensais por categoria para acompanhar o consumo e evitar estouro de orçamento.",
    placement: "below",
  },
  {
    target: "[data-tour='metas-form']",
    alvo: "Formulário de meta",
    titulo: "Criar nova meta",
    descricao:
      "Selecione a categoria, informe o limite mensal e salve para começar a monitorar no dashboard.",
  },
  {
    target: "[data-tour='metas-btn-salvar']",
    alvo: "Botão Salvar",
    titulo: "Salvar rapidamente",
    descricao:
      "Use este botão para criar ou atualizar a meta da categoria selecionada.",
  },
  {
    target: "[data-tour='metas-lista']",
    alvo: "Lista de metas",
    titulo: "Metas cadastradas",
    descricao:
      "Aqui ficam todas as metas já criadas, com limite mensal e opção de remoção.",
  },
  {
    target: "[data-tour='metas-item-remover']",
    alvo: "Remover meta",
    titulo: "Excluir meta",
    descricao:
      "Quando necessário, remova uma meta clicando no ícone de fechar ao lado do item.",
  },
  {
    target: "[data-tour='metas-help-button']",
    alvo: "Botão de ajuda",
    titulo: "Rever tutorial",
    descricao:
      "Clique no (?) para abrir novamente este guia da aba Metas de Gasto.",
  },
];

export const MetasPage = () => {
  const { user, setModalFeedback } = useAppContext();

  const [metas, setMetas] = useState<MetaGasto[]>([]);
  const [novaMeta, setNovaMeta] = useState({ categoria: "", limite: "" });
  const [savingMeta, setSavingMeta] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialSteps, setTutorialSteps] = useState<MetasTutorialStep[]>([]);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const fetchMetas = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from("metas_gasto").select("*").order("categoria");
    setMetas(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetas();
  }, [fetchMetas]);

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
    const alreadySeen = localStorage.getItem(METAS_TUTORIAL_KEY);
    if (!alreadySeen) {
      const availableSteps = METAS_TUTORIAL_STEPS.filter((step) =>
        Boolean(document.querySelector(step.target))
      );
      setTutorialSteps(availableSteps);
      setShowTutorial(availableSteps.length > 0);
      setTutorialStepIndex(0);
      localStorage.setItem(METAS_TUTORIAL_KEY, "true");
    }
  }, []);

  const openTutorial = () => {
    const availableSteps = METAS_TUTORIAL_STEPS.filter((step) =>
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

  const handleAddMeta = async () => {
    if (!supabase || !novaMeta.categoria.trim() || !novaMeta.limite) return;
    setSavingMeta(true);
    try {
      const { error } = await supabase.from("metas_gasto").upsert({
        categoria: novaMeta.categoria.trim(),
        limite: parseFloat(novaMeta.limite),
        user_id: user?.id,
      }, { onConflict: "user_id,categoria" });
      if (error) throw error;
      setNovaMeta({ categoria: "", limite: "" });
      fetchMetas();
      setModalFeedback({ show: true, titulo: "Sucesso!", mensagem: "Meta salva com sucesso.", tipo: "sucesso" });
    } catch (err) {
      console.error("Erro ao salvar meta:", err);
      setModalFeedback({ show: true, titulo: "Erro", mensagem: "Não foi possível salvar a meta.", tipo: "info" });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleDeleteMeta = async (id: string) => {
    if (!supabase) return;
    await supabase.from("metas_gasto").delete().eq("id", id);
    fetchMetas();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="relative p-4 md:p-6 space-y-6">
      <button
        onClick={openTutorial}
        data-tour="metas-help-button"
        className="hidden md:flex absolute -top-9 right-12 z-30 w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 items-center justify-center shadow-sm transition-colors"
        title="Ver tutorial da aba Metas de Gasto"
        aria-label="Ver tutorial da aba Metas de Gasto"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Page Header */}
      <div className="flex items-center gap-3" data-tour="metas-header">
        <Target className="w-7 h-7 text-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Metas de Gasto</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Defina tetos mensais por categoria</p>
        </div>
      </div>

      {/* Adicionar nova meta */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm" data-tour="metas-form">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Nova Meta</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={novaMeta.categoria}
            onChange={(e) => setNovaMeta({ ...novaMeta, categoria: e.target.value })}
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none appearance-none"
          >
            <option value="" disabled>Selecione uma categoria</option>
            {CATEGORIAS
              .filter(cat => !metas.some(m => m.categoria.toLowerCase() === cat.toLowerCase()))
              .map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))
            }
          </select>
          <div className="relative w-full sm:w-44">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">R$</span>
            <input
              type="number"
              value={novaMeta.limite}
              onChange={(e) => setNovaMeta({ ...novaMeta, limite: e.target.value })}
              placeholder="0,00"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>
          <button
            onClick={handleAddMeta}
            data-tour="metas-btn-salvar"
            disabled={savingMeta || !novaMeta.categoria.trim() || !novaMeta.limite}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {savingMeta ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Salvar
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Selecione a categoria e defina o limite mensal. As barras de progresso aparecerão no Dashboard.
        </p>
      </section>

      {/* Lista de metas */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm" data-tour="metas-lista">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Suas Metas</h2>
        {metas.length > 0 ? (
          <div className="space-y-3">
            {metas.map((meta) => (
              <div key={meta.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:border-gray-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 capitalize">{meta.categoria}</span>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">Limite: {formatCurrency(meta.limite)} / mês</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteMeta(meta.id)}
                  data-tour="metas-item-remover"
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                  title="Remover meta"
                >
                  <X className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-red-500 transition-colors" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhuma meta definida ainda.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Adicione uma meta acima para começar a monitorar seus gastos.</p>
          </div>
        )}
      </section>

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
                  Tutorial de Metas • Passo {tutorialStepIndex + 1} de {tutorialSteps.length}
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
