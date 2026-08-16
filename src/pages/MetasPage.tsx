import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, X, Loader2, Edit2 } from "lucide-react";
import { Link } from "react-router-dom";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { PageHeader } from "../components/ui/PageHeader";
import { SeletorMes } from "../components/ui/SeletorMes";
import { useAppContext } from "../context";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatMesAno } from "../utils/calculations";
import { categoriaDeGasto, comCategoriaAtual } from "../utils/categories";
import { useCategorias } from "../hooks/useCategorias";
import { toast } from "../components/ui/Toaster";
import { TUTORIAL_TITLES } from "../utils/tutorial";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../components/ui/AsyncState";
import { Valor } from "../components/ui/Valor";
import { toActionableErrorMessage } from "../utils/feedbackMessages";
import type { MetaGasto } from "../types";
import { Rotulo } from "../components/ui/Rotulo";
import { Card } from "../components/ui/Card";

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
      "Selecione a categoria, informe o limite mensal e salve para começar a monitorar o consumo.",
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
      "Aqui ficam todas as metas já criadas, ordenadas por risco de estouro, com o consumo do mês em cada barra.",
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

interface LinhaConsumo extends MetaGasto {
  gasto: number;
  pct: number;
}

export const MetasPage = () => {
  const { user, setModalConfirm, meusGastosDoMes, mesVisualizacao } = useAppContext();

  const { categorias: categoriasGasto } = useCategorias("gasto");

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

  // A meta em edição pode estar numa categoria que saiu da lista — ela precisa
  // continuar selecionável, senão salvar de novo mudaria a categoria da meta.
  const categoriasDisponiveis = comCategoriaAtual(
    categoriasGasto,
    metaEmEdicao?.categoria
  ).filter(
    (cat) =>
      !metas.some(
        (m) =>
          m.categoria.toLowerCase() === cat.toLowerCase() &&
          m.id !== metaEmEdicao?.id
      )
  );

  // Consumo por meta — o mesmo cruzamento meta×gastos do resumo do orçamento,
  // só leitura: soma os gastos pessoais do mês por categoria da meta.
  const linhas = useMemo<LinhaConsumo[]>(() => {
    return metas
      .map((meta) => {
        const gasto = meusGastosDoMes
          .filter(
            (g) => categoriaDeGasto(g).toLowerCase() === meta.categoria.toLowerCase()
          )
          .reduce((soma, g) => soma + g.valor, 0);
        const pct = meta.limite > 0 ? (gasto / meta.limite) * 100 : 0;
        return { ...meta, gasto, pct };
      })
      .sort((a, b) => b.pct - a.pct); // ordenadas por risco de estouro
  }, [metas, meusGastosDoMes]);

  const totalGasto = linhas.reduce((soma, l) => soma + l.gasto, 0);
  const totalLimite = linhas.reduce((soma, l) => soma + l.limite, 0);
  const pctTotal = totalLimite > 0 ? (totalGasto / totalLimite) * 100 : 0;
  const disponivel = totalLimite - totalGasto;
  const estouradas = linhas.filter((l) => l.pct > 100);
  const quaseNoLimite = linhas.filter((l) => l.pct >= 80 && l.pct <= 100);
  const noControle = linhas.filter((l) => l.pct < 80);
  const emRisco = [...estouradas, ...quaseNoLimite];

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
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="metas-header"
        eyebrow="Gastos"
        title="Metas de gasto"
        description="Seus limites por categoria — e quanto de cada um você já usou."
        action={<SeletorMes />}
      />

      {/* Card herói: Orçado vs. gasto */}
      {linhas.length > 0 && (
        <Card as="section" padding="resumo">
          <Rotulo tom="acento" className="mb-2">
            Orçado vs. gasto · <span className="normal-case">{formatMesAno(mesVisualizacao)}</span>
          </Rotulo>
          <div className="flex items-end justify-between gap-5 flex-wrap mb-4">
            <p className="whitespace-nowrap">
              <Valor porte="heroi" className="text-zinc-900 dark:text-zinc-50">
                {formatCurrency(totalGasto)}
              </Valor>
              {/* Subordinado ao herói: mesmo bloco, corpo menor e cor mais fraca. */}
              <Valor porte="medio" className="text-zinc-500 dark:text-zinc-400"> / {formatCurrency(totalLimite)}</Valor>
            </p>
            <div className="text-right">
              <Valor porte="medio" className={`block ${disponivel >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {formatCurrency(disponivel)}
              </Valor>
              <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                {disponivel >= 0 ? "disponível" : "acima do orçado"} · {pctTotal.toFixed(0)}% usado
              </p>
            </div>
          </div>
          <div className={`h-2.5 rounded-full overflow-hidden ${pctTotal > 100 ? "bg-red-50 dark:bg-red-950/30" : "bg-zinc-100 dark:bg-white/[0.04]"}`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${pctTotal > 100 ? "bg-red-500" : pctTotal >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(pctTotal, 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-5 flex-wrap mt-4">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {estouradas.length} estourada{estouradas.length === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {quaseNoLimite.length} quase no limite
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {noControle.length} no controle
            </span>
          </div>
        </Card>
      )}

      {/* Grid: Suas metas + coluna direita */}
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(330px,1fr))]">
        {/* Card Suas metas */}
        <Card as="section" className="min-w-0" data-tour="metas-lista">
          <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Suas metas</h2>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 mb-4">ordenadas por risco de estouro</p>
          {linhas.length > 0 ? (
            <div className="space-y-4">
              {linhas.map((linha) => {
                const estourou = linha.pct > 100;
                const quase = linha.pct >= 80 && linha.pct <= 100;
                const corGasto = estourou
                  ? "text-red-600 dark:text-red-400"
                  : quase
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-zinc-900 dark:text-zinc-100";
                return (
                  <div key={linha.id}>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 capitalize truncate">{linha.categoria}</span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <span className="font-mono valor text-[13px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          <span className={corGasto}>{formatCurrency(linha.gasto)}</span> / {formatCurrency(linha.limite)}
                        </span>
                        <button
                          onClick={() => handleEditarMeta(linha)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"
                          title="Editar meta"
                          aria-label={`Editar meta de ${linha.categoria}`}
                        >
                          <Edit2 className="w-[15px] h-[15px]" />
                        </button>
                        <button
                          onClick={() => handleDeleteMeta(linha)}
                          data-tour="metas-item-remover"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                          title="Remover meta"
                          aria-label={`Remover meta de ${linha.categoria}`}
                        >
                          <X className="w-[15px] h-[15px]" />
                        </button>
                      </span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${estourou ? "bg-red-50 dark:bg-red-950/30" : "bg-zinc-100 dark:bg-white/[0.04]"}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${estourou ? "bg-red-500" : quase ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(linha.pct, 100)}%` }}
                      />
                    </div>
                    <p className={`font-mono text-[11px] mt-1 ${estourou ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                      {linha.pct.toFixed(0)}% · {estourou
                        ? `estourou ${formatCurrency(linha.gasto - linha.limite)}`
                        : `restam ${formatCurrency(linha.limite - linha.gasto)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <PageEmptyState
              compact
              title="Nenhuma meta cadastrada"
              description="Crie uma meta por categoria para acompanhar limites e evitar estouro de orçamento."
            />
          )}
        </Card>

        {/* Coluna direita */}
        <div className="space-y-5 min-w-0">
          {/* Card Nova meta */}
          <Card as="section" data-tour="metas-form">
            <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
              {metaEmEdicao ? "Editar meta" : "Nova meta"}
            </h2>
            <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 mb-4">
              {categoriasDisponiveis.length} categoria{categoriasDisponiveis.length === 1 ? "" : "s"} ainda sem limite
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Categoria</label>
                <select
                  value={novaMeta.categoria}
                  onChange={(e) => setNovaMeta({ ...novaMeta, categoria: e.target.value })}
                  className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
                >
                  <option value="" disabled>Selecione uma categoria</option>
                  {categoriasDisponiveis.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Limite mensal</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-zinc-500 dark:text-zinc-400">R$</span>
                  <input
                    type="number"
                    value={novaMeta.limite}
                    onChange={(e) => setNovaMeta({ ...novaMeta, limite: e.target.value })}
                    placeholder="0,00"
                    className="w-full h-11 pl-10 pr-3 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-sm font-mono tabular-nums text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveMeta}
                data-tour="metas-btn-salvar"
                disabled={savingMeta || !novaMeta.categoria.trim() || !novaMeta.limite}
                className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {savingMeta ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : metaEmEdicao ? (
                  <Edit2 className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {metaEmEdicao ? "Atualizar meta" : "Salvar meta"}
              </button>
              {metaEmEdicao && (
                <button
                  onClick={handleCancelarEdicao}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </Card>

          {/* Card de atenção — só quando há metas em risco */}
          {emRisco.length > 0 && (
            <section className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-5">
              <Rotulo tom="alerta" className="mb-2">
                Atenção
              </Rotulo>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {emRisco.length === 1 ? (
                  <>A categoria <strong className="capitalize">{emRisco[0].categoria}</strong> está {emRisco[0].pct > 100 ? "com o limite estourado" : "perto do limite"}.</>
                ) : (
                  <>
                    As categorias{" "}
                    {emRisco.map((l, i) => (
                      <span key={l.id}>
                        <strong className="capitalize">{l.categoria}</strong>
                        {i < emRisco.length - 2 ? ", " : i === emRisco.length - 2 ? " e " : ""}
                      </span>
                    ))}{" "}
                    estão perto do limite ou estouradas.
                  </>
                )}
              </p>
              <Link
                to="/gastos/lancamentos"
                className="inline-block text-sm text-amber-700 dark:text-amber-400 font-semibold mt-3 hover:text-amber-800"
              >
                Ver lançamentos dessas categorias →
              </Link>
            </section>
          )}
        </div>
      </div>

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
