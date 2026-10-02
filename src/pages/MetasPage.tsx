import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, Gauge } from "lucide-react";
import { Link } from "react-router-dom";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { PageHeader } from "../components/ui/PageHeader";
import { SeletorMes } from "../components/ui/SeletorMes";
import { useAppContext } from "../context";
import { useGuidedTour, usePageTutorialHelpButton, useIsMobile } from "../hooks";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatCurrencyValue, formatMesAno, parseCurrency } from "../utils/calculations";
import { formatPercent } from "../utils/dinheiro";
import { categoriaDeGasto, comCategoriaAtual, corDaCategoria } from "../utils/categories";
import { valorDaMinhaParte } from "../utils/gastosDoMes";
import { useCategorias } from "../hooks/useCategorias";
import { toast } from "../components/ui/Toaster";
import { TUTORIAL_TITLES } from "../utils/tutorial";
import { PageErrorState, PageLoadingState } from "../components/ui/AsyncState";
import { toActionableErrorMessage } from "../utils/feedbackMessages";
import type { MetaGasto } from "../types";
import { Button } from "../components/ui/Button";
import { BalanceHero } from "../components/ui/BalanceHero";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Surface, SurfaceHeader } from "../components/ui/Surface";
import { ListGroup, ListRow } from "../components/ui/ListRow";
import { Pill } from "../components/ui/Pill";
import { PontoCategoria } from "../components/ui/PontoCategoria";
import { EmptyState } from "../components/ui/EmptyState";
import { MoneyInput } from "../components/ui/MoneyInput";
import { FormSheet, Campo, Chip, Chips } from "../components/ui/FormSheet";
import { useAcaoPrincipalDaPagina } from "../components/layout/AcaoPrincipalContext";

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
    titulo: "Limites de gasto",
    descricao:
      "Aqui você define quanto se permite gastar por mês em cada categoria. Não é dinheiro guardado: é um teto, e a conta recomeça todo mês.",
    placement: "below",
  },
  {
    target: "[data-tour='metas-form']",
    alvo: "Botão Novo limite",
    titulo: "Criar novo limite",
    descricao:
      "Escolha a categoria e quanto pode gastar nela por mês. Para mudar um limite, toque nele na lista.",
  },
  {
    target: "[data-tour='metas-lista']",
    alvo: "Lista de limites",
    titulo: "Limites cadastrados",
    descricao:
      "Aqui ficam todos os limites, do mais perto de estourar para o mais tranquilo, com o gasto do mês em cada barra.",
  },
  {
    target: "[data-tour='metas-item-remover']",
    alvo: "Remover limite",
    titulo: "Excluir limite",
    descricao:
      "Cada limite tem editar e excluir: no desktop ao passar o mouse, no celular no menu da linha.",
  },
  {
    target: "[data-tour='metas-help-button']",
    alvo: "Botão de ajuda",
    titulo: "Rever tutorial",
    descricao:
      "Toque no (?) para ver este guia de novo.",
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
  // O formulário agora é um painel (FormSheet), aberto por "Nova meta" ou
  // pela linha da meta; antes ficava fixo na lateral.
  const [formAberto, setFormAberto] = useState(false);
  const isMobile = useIsMobile();
  useAcaoPrincipalDaPagina(!isMobile);
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
      setLoadError(toActionableErrorMessage(err, "Não foi possível carregar os limites."));
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
    ready: !loading,
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial de Limites",
    ariaLabel: "Ver tutorial de Limites",
    dataTour: "metas-help-button",
  });

  const handleSaveMeta = async () => {
    if (!supabase || !novaMeta.categoria.trim() || !novaMeta.limite) return;
    setSavingMeta(true);
    try {
      const categoria = novaMeta.categoria.trim();
      const limite = parseCurrency(novaMeta.limite);

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
      setFormAberto(false);
      await fetchMetas(false);
      toast.success(
        metaEmEdicao ? "Limite atualizado." : "Limite criado."
      );
    } catch (err) {
      console.error("Erro ao salvar meta:", err);
      toast.error(toActionableErrorMessage(err, "Não foi possível salvar o limite."));
    } finally {
      setSavingMeta(false);
    }
  };

  const handleDeleteMeta = (meta: MetaGasto) => {
    setModalConfirm({
      show: true,
      titulo: "Excluir limite",
      mensagem: `Excluir o limite de "${meta.categoria}"?`,
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
          toast.error(toActionableErrorMessage(err, "Não foi possível excluir o limite."));
          throw err;
        }
      },
    });
  };

  const handleEditarMeta = (meta: MetaGasto) => {
    setMetaEmEdicao(meta);
    setNovaMeta({ categoria: meta.categoria, limite: formatCurrencyValue(meta.limite) });
    setFormAberto(true);
  };

  const handleCancelarEdicao = () => {
    setFormAberto(false);
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
          .reduce((soma, g) => soma + valorDaMinhaParte(g), 0);
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

  if (loading) {
    return <PageLoadingState title="Carregando limites" />;
  }

  if (loadError) {
    return (
      <PageErrorState
        title="Não foi possível abrir os limites"
        description={loadError}
        onAction={() => fetchMetas(true)}
        actionLabel="Tentar de novo"
      />
    );
  }

  const abrirNovaMeta = () => {
    setMetaEmEdicao(null);
    setNovaMeta({ categoria: "", limite: "" });
    setFormAberto(true);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="metas-header"
        title="Limites de gasto"
        description="Quanto você se permite gastar por mês em cada categoria. Não é dinheiro guardado: é um teto, e a conta recomeça todo mês."
        action={
          <>
            <SeletorMes />
            <Button
              variante={isMobile ? "secundario" : "principal"}
              onClick={abrirNovaMeta}
              data-tour="metas-form"
              icone={<Plus className="w-4 h-4" strokeWidth={1.75} />}
            >
              Novo limite
            </Button>
          </>
        }
      />

      {/* Orçado vs. usado */}
      {linhas.length > 0 && (
        <BalanceHero
          rotulo={<>Usado dos limites · {formatMesAno(mesVisualizacao)}</>}
          valor={totalGasto}
          complemento={`de ${formatCurrency(totalLimite)}`}
          perigoSeNegativo={false}
          perigo={totalGasto > totalLimite}
          contexto={
            disponivel >= 0 ? (
              <>
                Restam <span className="valor">{formatCurrency(disponivel)}</span> · {formatPercent(pctTotal / 100)} usado
              </>
            ) : (
              <>
                <span className="valor">{formatCurrency(-disponivel)}</span> acima do orçado
              </>
            )
          }
        >
          <div className="mt-6 max-w-2xl">
            <ProgressBar
              valor={totalGasto}
              maximo={totalLimite}
              rotulo={`Total dos limites: ${formatPercent(pctTotal / 100)} usado`}
              legenda={[
                {
                  rotulo: "Estouradas",
                  valor: estouradas.length,
                  tom: estouradas.length > 0 ? "perigo" : "normal",
                },
                { rotulo: "Quase no limite", valor: quaseNoLimite.length },
                { rotulo: "No controle", valor: noControle.length },
              ]}
            />
          </div>
        </BalanceHero>
      )}

      {/* Suas metas, da mais arriscada para a mais tranquila */}
      <Surface as="section" data-tour="metas-lista">
        <SurfaceHeader titulo="Seus limites" descricao="Da mais perto de estourar para a mais tranquila." className="mb-1" />
        {linhas.length > 0 ? (
          <ListGroup>
            {linhas.map((linha) => {
              const estourou = linha.pct > 100;
              const quase = linha.pct >= 80 && linha.pct <= 100;
              return (
                <ListRow
                  key={linha.id}
                  icone={<PontoCategoria cor={corDaCategoria(linha.categoria, categoriasGasto)} />}
                  titulo={linha.categoria.charAt(0).toUpperCase() + linha.categoria.slice(1)}
                  meta={
                    estourou ? (
                      <Pill tom="perigo">estourou {formatCurrency(linha.gasto - linha.limite)}</Pill>
                    ) : quase ? (
                      <Pill tom="atencao">quase no limite</Pill>
                    ) : (
                      <Pill>no controle</Pill>
                    )
                  }
                  valor={formatCurrency(linha.gasto)}
                  subvalor={`de ${formatCurrency(linha.limite)}`}
                  onAbrir={() => handleEditarMeta(linha)}
                  acoes={[
                    {
                      rotulo: "Editar",
                      icone: <Pencil className="w-4 h-4" strokeWidth={1.5} />,
                      onClick: () => handleEditarMeta(linha),
                    },
                    {
                      rotulo: "Excluir",
                      icone: <Trash2 className="w-4 h-4" strokeWidth={1.5} />,
                      onClick: () => handleDeleteMeta(linha),
                      tom: "perigo",
                    },
                  ]}
                  dataTour="metas-item-remover"
                  rodape={
                    <div className="pl-12">
                      <ProgressBar valor={linha.gasto} maximo={linha.limite} rotulo={`${linha.categoria}: ${formatPercent(linha.pct / 100)} do limite`} />
                      <div className="mt-1.5 flex items-baseline justify-between gap-3 text-xs">
                        <span className="text-fg-2">
                          <span className="valor">{formatPercent(linha.pct / 100)}</span>
                          {estourou ? "" : <> · restam <span className="valor">{formatCurrency(linha.limite - linha.gasto)}</span></>}
                        </span>
                        {(estourou || quase) && (
                          <Link
                            to="/gastos/lancamentos"
                            className="inline-flex items-center min-h-[44px] -my-3 md:min-h-0 md:my-0 text-fg-2 underline underline-offset-2 hover:text-fg transition-colors"
                          >
                            Ver lançamentos
                          </Link>
                        )}
                      </div>
                    </div>
                  }
                />
              );
            })}
          </ListGroup>
        ) : (
          <EmptyState
            Icone={Gauge}
            frase="Nenhum limite ainda."
            detalhe="Defina quanto pode gastar por mês em uma categoria, como Alimentação, e veja quanto já foi."
            acao={<Button onClick={abrirNovaMeta}>Novo limite</Button>}
          />
        )}
      </Surface>

      {/* Nova / editar meta */}
      <FormSheet
        aberto={formAberto}
        titulo={metaEmEdicao ? "Editar limite" : "Novo limite"}
        aviso={
          metaEmEdicao
            ? undefined
            : `${categoriasDisponiveis.length} ${categoriasDisponiveis.length === 1 ? "categoria ainda sem limite" : "categorias ainda sem limite"}.`
        }
        onFechar={handleCancelarEdicao}
        onEnviar={handleSaveMeta}
        rotuloEnviar={metaEmEdicao ? "Salvar alterações" : "Criar limite"}
        enviando={savingMeta}
        podeEnviar={!!novaMeta.categoria.trim() && !!novaMeta.limite}
        valor={
          <div>
            <MoneyInput
              tamanho="heroi"
              value={novaMeta.limite}
              onChange={(limite) => setNovaMeta({ ...novaMeta, limite })}
              aria-label="Limite mensal"
              data-autofocus
            />
            <p className="mt-2 text-center text-xs text-fg-3">Limite por mês</p>
          </div>
        }
      >
        <Campo rotulo="Categoria">
          {categoriasDisponiveis.length > 0 ? (
            <Chips>
              {categoriasDisponiveis.map((cat) => (
                <Chip key={cat} ativo={novaMeta.categoria === cat} onClick={() => setNovaMeta({ ...novaMeta, categoria: cat })}>
                  {cat}
                </Chip>
              ))}
            </Chips>
          ) : (
            <p className="text-sm text-fg-2">Todas as categorias já têm limite.</p>
          )}
        </Campo>
      </FormSheet>

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
