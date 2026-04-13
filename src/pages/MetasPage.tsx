import { useState, useEffect, useCallback } from "react";
import { Target, Plus, X, Loader2, Edit2 } from "lucide-react";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useAppContext } from "../context";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../utils/calculations";
import { PAGE_CONTAINER_RELATIVE_CLASS } from "../utils/layout";
import { CATEGORIAS } from "../utils/categories";
import { toast } from "../components/ui/Toaster";
import { TUTORIAL_TITLES } from "../utils/tutorial";
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

  const fetchMetas = useCallback(async (showLoading = true) => {
    if (!supabase) return;
    if (showLoading) {
      setLoading(true);
    }

    const { data } = await supabase
      .from("metas_gasto")
      .select("*")
      .order("categoria");

    setMetas(data || []);

    if (showLoading) {
      setLoading(false);
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
      toast.error("Não foi possível salvar a meta.");
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
          toast.error("Não foi possível excluir a meta.");
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className={PAGE_CONTAINER_RELATIVE_CLASS}>
      {/* Page Header */}
      <div className="flex items-center gap-3" data-tour="metas-header">
        <Target className="w-6 h-6 text-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Metas de Gasto</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Defina tetos mensais por categoria</p>
        </div>
      </div>

      {/* Adicionar nova meta */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm" data-tour="metas-form">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {metaEmEdicao ? "Editar Meta" : "Nova Meta"}
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={novaMeta.categoria}
            onChange={(e) => setNovaMeta({ ...novaMeta, categoria: e.target.value })}
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none appearance-none"
          >
            <option value="" disabled>Selecione uma categoria</option>
            {categoriasDisponiveis.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
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
            onClick={handleSaveMeta}
            data-tour="metas-btn-salvar"
            disabled={savingMeta || !novaMeta.categoria.trim() || !novaMeta.limite}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
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
              className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
          )}
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
                    <Target className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 capitalize">{meta.categoria}</span>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">Limite: {formatCurrency(meta.limite)} / mês</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEditarMeta(meta)}
                    className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors group"
                    title="Editar meta"
                  >
                    <Edit2 className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
                  </button>

                  <button
                    onClick={() => handleDeleteMeta(meta)}
                    data-tour="metas-item-remover"
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                    title="Remover meta"
                  >
                    <X className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-red-500 transition-colors" />
                  </button>
                </div>
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
