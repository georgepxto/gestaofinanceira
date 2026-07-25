import { useState, useEffect, useCallback } from "react";
import { Target, Plus, X, Loader2, Edit2 } from "lucide-react";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useAppContext } from "../context";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../utils/calculations";
import { CATEGORIAS } from "../utils/categories";
import { toast } from "../components/ui/Toaster";
import { TUTORIAL_TITLES } from "../utils/tutorial";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../components/ui/AsyncState";
import { toActionableErrorMessage } from "../utils/feedbackMessages";
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
  const { user, setModalConfirm } = useAppContext();

  const [metas, setMetas] = useState<MetaGasto[]>([]);
  const [novaMeta, setNovaMeta] = useState({ categoria: "", limite: "" });
  const [metaEmEdicao, setMetaEmEdicao] = useState<MetaGasto | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchMetas = useCallback(async (showLoading = true) => {
    if (!supabase) return;
    if (showLoading) {
      setLoading(true);
      setLoadError(null);
    }

    try {
      const { data, error } = await supabase
        .from("metas_gasto")
        .select("*")
        .order("categoria");

      if (error) throw error;
      setMetas(data || []);
    } catch (err) {
      setLoadError(toActionableErrorMessage(err, "Não foi possível carregar as metas."));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchMetas();
  }, [fetchMetas]);
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
  } = useGuidedTour<MetasTutorialStep>({
    steps: METAS_TUTORIAL_STEPS,
    storageKey: METAS_TUTORIAL_KEY,
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial da aba Metas de Gasto",
    ariaLabel: "Ver tutorial da aba Metas de Gasto",
    dataTour: "metas-help-button",
  });

  const handleSaveMeta = async () => {
    if (!supabase || !novaMeta.categoria.trim() || !novaMeta.limite) return;
    setSavingMeta(true);
    try {
      const categoria = novaMeta.categoria.trim();
      const limite = parseFloat(novaMeta.limite);

      const { error } = metaEmEdicao
        ? await supabase
            .from("metas_gasto")
            .update({ categoria, limite })
            .eq("id", metaEmEdicao.id)
        : await supabase.from("metas_gasto").upsert(
            {
              categoria,
              limite,
              user_id: user?.id,
            },
            { onConflict: "user_id,categoria" }
          );

      if (error) throw error;

      setNovaMeta({ categoria: "", limite: "" });
      setMetaEmEdicao(null);
      await fetchMetas(false);
      toast.success(
        metaEmEdicao ? "Meta atualizada com sucesso." : "Meta salva com sucesso."
      );
    } catch (err) {
      console.error("Erro ao salvar meta:", err);
      toast.error(toActionableErrorMessage(err, "Não foi possível salvar a meta."));
    } finally {
      setSavingMeta(false);
    }
  };

  const handleDeleteMeta = (meta: MetaGasto) => {
    setModalConfirm({
      show: true,
      titulo: "Excluir meta",
      mensagem: `Deseja realmente excluir a meta de "${meta.categoria}"?`,
      onConfirm: async () => {
        if (!supabase) return;
        try {
          const { error } = await supabase.from("metas_gasto").delete().eq("id", meta.id);
          if (error) throw error;

          await fetchMetas(false);

          if (metaEmEdicao?.id === meta.id) {
            setMetaEmEdicao(null);
            setNovaMeta({ categoria: "", limite: "" });
          }
        } catch (err) {
          console.error("Erro ao excluir meta:", err);
          toast.error(toActionableErrorMessage(err, "Não foi possível excluir a meta."));
          throw err;
        }
      },
    });
  };

  const handleEditarMeta = (meta: MetaGasto) => {
    setMetaEmEdicao(meta);
    setNovaMeta({ categoria: meta.categoria, limite: String(meta.limite) });
  };

  const handleCancelarEdicao = () => {
    setMetaEmEdicao(null);
    setNovaMeta({ categoria: "", limite: "" });
  };

  const categoriasDisponiveis = CATEGORIAS.filter(
    (cat) =>
      !metas.some(
        (m) =>
          m.categoria.toLowerCase() === cat.toLowerCase() &&
          m.id !== metaEmEdicao?.id
      )
  );

  if (loading) {
    return <PageLoadingState title="Carregando metas" description="Estamos buscando suas metas cadastradas." />;
  }

  if (loadError) {
    return (
      <PageErrorState
        title="Não foi possível abrir a página de metas"
        description={loadError}
        onAction={() => fetchMetas(true)}
        actionLabel="Tentar novamente"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Adicionar nova meta */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-tour="metas-form">
        <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
          {metaEmEdicao ? "Editar Meta" : "Nova Meta"}
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={novaMeta.categoria}
            onChange={(e) => setNovaMeta({ ...novaMeta, categoria: e.target.value })}
            className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none"
          >
            <option value="" disabled>Selecione uma categoria</option>
            {categoriasDisponiveis.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
          </select>
          <div className="relative w-full sm:w-44">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-sm">R$</span>
            <input
              type="number"
              value={novaMeta.limite}
              onChange={(e) => setNovaMeta({ ...novaMeta, limite: e.target.value })}
              placeholder="0,00"
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <button
            onClick={handleSaveMeta}
            data-tour="metas-btn-salvar"
            disabled={savingMeta || !novaMeta.categoria.trim() || !novaMeta.limite}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {savingMeta ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : metaEmEdicao ? (
              <Edit2 className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {metaEmEdicao ? "Atualizar" : "Salvar"}
          </button>

          {metaEmEdicao && (
            <button
              onClick={handleCancelarEdicao}
              className="px-4 py-3 border border-zinc-300 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/[0.06] transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
          Selecione a categoria e defina o limite mensal. As barras de progresso aparecerão no Dashboard.
        </p>
      </section>

      {/* Lista de metas */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-tour="metas-lista">
        <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">Suas Metas</h2>
        {metas.length > 0 ? (
          <div className="space-y-3">
            {metas.map((meta) => (
              <div key={meta.id} className="flex items-center justify-between gap-3 bg-zinc-50 dark:bg-white/[0.04] rounded-lg p-4 border border-zinc-100 hover:border-zinc-300 dark:border-white/[0.06] dark:hover:border-white/[0.14] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 flex-shrink-0 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center">
                    <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 capitalize">{meta.categoria}</span>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs">Limite: <span className="font-mono tabular-nums">{formatCurrency(meta.limite)}</span> / mês</p>
                  </div>
                </div>
                {/* Ação em item de lista: ícone fantasma — cor só no hover. */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleEditarMeta(meta)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors"
                    title="Editar meta"
                    aria-label={`Editar meta de ${meta.categoria}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteMeta(meta)}
                    data-tour="metas-item-remover"
                    className="p-1.5 rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                    title="Remover meta"
                    aria-label={`Remover meta de ${meta.categoria}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PageEmptyState
            compact
            title="Nenhuma meta cadastrada"
            description="Crie uma meta por categoria para acompanhar limites e evitar estouro de orçamento."
          />
        )}
      </section>

      <GuidedTourOverlay
        show={showTutorial}
        tutorialTitle={TUTORIAL_TITLES.metas}
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
