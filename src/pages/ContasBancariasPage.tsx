import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, Pencil, Landmark, ArrowDownLeft, Check, Clock, Coins, Undo2 } from "lucide-react";
import {
  corrigirSaldo,
  inicioParaNovoRecorrente,
  manterSaldoAoMudar,
  receitaNoMes,
  estadoDaEntrada,
  saldoDaConta,
  type EstadoEntrada,
  timestampDoDia,
  type Livro,
} from "../utils/saldo";
import { useAppContext } from "../context";
import { PageHeader } from "../components/ui/PageHeader";
import { SeletorMes } from "../components/ui/SeletorMes";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useGuidedTour, usePageTutorialHelpButton, useIsMobile } from "../hooks";
import { supabase } from "../lib/supabase";
import { formatCurrencyValue, parseCurrency } from "../utils/calculations";
import { formatDinheiro, formatPercent } from "../utils/dinheiro";
import { TIPOS_RECEITA, CATEGORIA_RECEITA_PADRAO } from "../utils/receitas";
import { chaveCategoria, comCategoriaAtual } from "../utils/categories";
import { useCategorias } from "../hooks/useCategorias";
import { TUTORIAL_TITLES } from "../utils/tutorial";
import { toast } from "../components/ui/Toaster";
import { PageErrorState, PageLoadingState } from "../components/ui/AsyncState";
import { toActionableErrorMessage } from "../utils/feedbackMessages";
import type { ContaBancaria, Receita, ContaBancariaForm, ReceitaForm } from "../types";
import { Button } from "../components/ui/Button";
import { KpiStrip, Kpi } from "../components/ui/KpiStrip";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { Surface, SurfaceHeader } from "../components/ui/Surface";
import { ListGroup, ListRow } from "../components/ui/ListRow";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Pill } from "../components/ui/Pill";
import { EmptyState } from "../components/ui/EmptyState";
import { MoneyInput } from "../components/ui/MoneyInput";
import { CampoInteiro, FormSheet, Campo, Chip, Chips, campoClasse } from "../components/ui/FormSheet";
import { useAcaoPrincipalDaPagina } from "../components/layout/AcaoPrincipalContext";
import { confirmarEntrada, desfazerEntrada } from "../utils/entradas";
import { ouvirDadosMudaram } from "../utils/onboarding";
import { RespostaEntrada, type PedidoResposta } from "../components/entradas/RespostaEntrada";
import { carregarPrevisao, type Previsao } from "../utils/previsao";
import { ExtratoPrevisao } from "../components/ui/ExtratoPrevisao";

interface ContasTutorialStep {
  target: string;
  alvo: string;
  titulo: string;
  descricao: string;
  placement?: "above" | "below";
}

const CONTAS_TUTORIAL_KEY = "contas_bancarias_tutorial_seen_v1";

const CONTAS_TUTORIAL_STEPS: ContasTutorialStep[] = [
  {
    target: "[data-tour='contas-header']",
    alvo: "Cabeçalho da aba",
    titulo: "Contas e receitas",
    descricao:
      "Suas contas e o que entra nelas. O saldo de cada conta é o valor que você informou ao criar, mais o que entrou e menos o que saiu dela desde então.",
    placement: "below",
  },
  {
    target: "[data-tour='contas-mes']",
    alvo: "Navegação mensal",
    titulo: "Troca de período",
    descricao:
      "Mude o mês para ver as entradas e a previsão de outro mês. O saldo é sempre o de hoje.",
  },
  {
    target: "[data-tour='contas-cards']",
    alvo: "Cards de resumo",
    titulo: "Resumo rápido",
    descricao:
      "O saldo de hoje somando todas as contas, o que já entrou neste mês e o que ainda vai entrar.",
  },
  {
    target: "[data-tour='contas-section-contas']",
    alvo: "Seção Minhas Contas",
    titulo: "Gestão de contas",
    descricao:
      "O saldo de cada conta. Se não bater com o banco, edite a conta e digite o saldo de hoje: o app corrige.",
  },
  {
    target: "[data-tour='contas-btn-nova-conta']",
    alvo: "Botão Nova Conta",
    titulo: "Adicionar conta",
    descricao:
      "Cadastre outra conta informando quanto tem nela hoje.",
  },
  {
    target: "[data-tour='contas-section-receitas']",
    alvo: "Entradas do mês",
    titulo: "Entradas do mês",
    descricao:
      "Recebidas e previstas, na ordem do dia. Só entra no saldo a receita com conta escolhida, no dia em que cai.",
  },
  {
    target: "[data-tour='contas-help-button']",
    alvo: "Botão de ajuda",
    titulo: "Rever tutorial",
    descricao:
      "Toque no (?) para ver este guia de novo.",
  },
];

export const ContasBancariasPage = () => {
  const { user, setModalConfirm, setModalFeedback, mesVisualizacao } = useAppContext();
  const { categorias: categoriasReceita } = useCategorias("receita");

  // Categoria pré-selecionada numa receita nova: "Outras Receitas" enquanto ela
  // existir, senão a primeira da lista personalizada.
  const categoriaReceitaInicial =
    categoriasReceita.find((c) => chaveCategoria(c) === chaveCategoria(CATEGORIA_RECEITA_PADRAO)) ??
    categoriasReceita[0] ??
    CATEGORIA_RECEITA_PADRAO;


  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  // Tudo que mexe no saldo (utils/saldo): o saldo é o histórico somado.
  const [livro, setLivro] = useState<Livro>({ receitas: [], meusGastos: [], emprestimos: [], pagamentosFatura: [] });
  const [previsao, setPrevisao] = useState<Previsao | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Modal conta
  const [showModalConta, setShowModalConta] = useState(false);
  const [editandoConta, setEditandoConta] = useState<ContaBancaria | null>(null);
  const [formConta, setFormConta] = useState<ContaBancariaForm>({ nome: "", banco: "", saldo_inicial: "0,00", saldo_atual: "0,00" });

  // Modal receita
  const [showModalReceita, setShowModalReceita] = useState(false);
  const [editandoReceita, setEditandoReceita] = useState<Receita | null>(null);
  const [formReceita, setFormReceita] = useState<ReceitaForm>({
    conta_id: "", descricao: "", valor: "", categoria: CATEGORIA_RECEITA_PADRAO,
    tipo: "fixo", dia_recebimento: "1", num_meses: "12",
  });

  // Fetches
  // Contas, livro e previsão numa ida só — a mesma conta do Início
  // (utils/previsao, que também migra contas do modelo antigo).
  const fetchContas = useCallback(async () => {
    if (!supabase || !user) return;
    const r = await carregarPrevisao();
    if (!r) return;
    setLivro(r.livro);
    setContas(r.contas);
    setPrevisao(r.previsao);
  }, [user]);

  const fetchReceitas = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from("receitas").select("*").order("created_at", { ascending: false });
    setReceitas(data || []);
  }, [user]);

  // Resposta a "caiu?" (daqui ou do Início): recarrega saldo e entradas.
  useEffect(() => ouvirDadosMudaram((origem) => { if (origem === "entradas") fetchContas(); }), [fetchContas]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      setLoadError(null);
      Promise.all([fetchContas(), fetchReceitas()])
        .catch((err) => {
          setLoadError(toActionableErrorMessage(err, "Não foi possível carregar contas e receitas."));
        })
        .finally(() => setLoading(false));
    }
  }, [user, fetchContas, fetchReceitas]);
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
  } = useGuidedTour<ContasTutorialStep>({
    steps: CONTAS_TUTORIAL_STEPS,
    storageKey: CONTAS_TUTORIAL_KEY,
    ready: !loading,
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial de Contas e receitas",
    ariaLabel: "Ver tutorial de Contas e receitas",
    dataTour: "contas-help-button",
  });

  const isMobile = useIsMobile();
  // "Nova conta" é o botão laranja desta tela no desktop.
  useAcaoPrincipalDaPagina(!isMobile);

  // O atalho "Nova receita" do Início chega aqui com `?receita=1`: abre o
  // formulário uma vez e limpa o parâmetro, para não reabrir ao voltar.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("receita") !== "1") return;
    setShowModalReceita(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Saldo de hoje, do histórico — a mesma conta que o Início usa (utils/saldo).
  const calcularSaldoConta = (conta: ContaBancaria) => saldoDaConta(conta, livro);

  // CRUD Conta
  const handleSubmitConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;
    setSaving(true);
    try {
      const dados = { nome: formConta.nome.trim(), banco: formConta.banco.trim() };
      if (editandoConta) {
        await supabase.from("contas_bancarias").update(dados).eq("id", editandoConta.id);
        // Corrigir o saldo à mão: a diferença vai para o saldo inicial, e o
        // histórico continua somando por cima.
        const desejado = parseCurrency(formConta.saldo_atual);
        if (Math.abs(desejado - calcularSaldoConta(editandoConta)) > 0.004) {
          await corrigirSaldo(editandoConta, livro, desejado);
        }
      } else {
        // O saldo informado é o de hoje: o que aconteceu antes já está nele.
        await supabase.from("contas_bancarias").insert({
          ...dados,
          saldo_inicial: parseCurrency(formConta.saldo_inicial),
          saldo_atual: null,
          user_id: user.id,
        });
      }
      await fetchContas();
      resetFormConta();
      toast.success(editandoConta ? "Conta atualizada com sucesso!" : "Conta adicionada com sucesso!");
    } catch (err) {
      toast.error(toActionableErrorMessage(err, "Não foi possível salvar a conta."));
    } finally { setSaving(false); }
  };

  const handleEditConta = (c: ContaBancaria) => {
    setFormConta({
      nome: c.nome,
      banco: c.banco || "",
      saldo_inicial: formatCurrencyValue(c.saldo_inicial),
      saldo_atual: formatCurrencyValue(calcularSaldoConta(c)),
    });
    setEditandoConta(c);
    setShowModalConta(true);
  };

  const handleDeleteConta = (id: string, nome: string) => {
    setModalConfirm({
      show: true, titulo: "Excluir conta", mensagem: `Excluir "${nome}"?`,
      onConfirm: async () => {
        if (!supabase) return;
        const { error } = await supabase.from("contas_bancarias").delete().eq("id", id);

        if (error) {
          console.error("Erro ao excluir conta:", error);
          if (error.code === "23503" || String(error.message).includes("foreign key") || String(error.message).includes("Conflict")) {
            setModalFeedback?.({
              show: true,
              titulo: "Não é possível excluir",
              mensagem: "Esta conta possui vínculos. Remova receitas/gastos associados e tente novamente.",
              tipo: "info",
            });
          } else {
            setModalFeedback?.({ show: true, titulo: "Erro ao excluir conta", mensagem: toActionableErrorMessage(error, "Não foi possível excluir a conta."), tipo: "info" });
          }
        } else {
          await fetchContas();
        }
      },
    });
  };

  const resetFormConta = () => {
    setFormConta({ nome: "", banco: "", saldo_inicial: "0,00", saldo_atual: "0,00" });
    setShowModalConta(false);
    setEditandoConta(null);
  };

  // CRUD Receita
  const handleSubmitReceita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;
    setSaving(true);
    try {
      const valorReceita = parseCurrency(formReceita.valor);
      const dados = {
        descricao: formReceita.descricao.trim(),
        valor: valorReceita,
        categoria: formReceita.categoria,
        tipo: formReceita.tipo,
        dia_recebimento: formReceita.tipo === "avulso" ? new Date().getDate() : parseInt(formReceita.dia_recebimento) || 1,
        num_meses: formReceita.tipo === "recorrente" ? parseInt(formReceita.num_meses) : null,
        conta_id: formReceita.conta_id || null,
        data: new Date().toISOString().split("T")[0], // formato yyyy-MM-dd
      };
      const recorrente = formReceita.tipo !== "avulso";
      if (editandoReceita) {
        const antiga = editandoReceita;
        const extra: Partial<Receita> = {};
        if (antiga.tipo === "avulso" && recorrente) {
          // Virou fixa/recorrente: conta do começo do mês.
          extra.created_at = timestampDoDia(inicioParaNovoRecorrente());
        } else if (antiga.tipo !== "avulso" && !recorrente) {
          // Virou avulsa: é uma entrada de hoje.
          extra.created_at = new Date().toISOString();
        }
        // O que a receita já pôs na conta não muda com a edição (utils/saldo).
        if (antiga.tipo !== "avulso") {
          await manterSaldoAoMudar(antiga, {
            ...antiga,
            ...dados,
            ...extra,
            conta_id: dados.conta_id || "",
            num_meses: dados.num_meses ?? undefined,
          } as Receita);
        }
        const { error } = await supabase.from("receitas").update({ ...dados, ...extra }).eq("id", antiga.id);
        if (error) throw error;
      } else {
        // Fixa/recorrente conta do começo do mês; avulsa, de hoje.
        const { error } = await supabase.from("receitas").insert({
          ...dados,
          ...(recorrente ? { created_at: timestampDoDia(inicioParaNovoRecorrente()) } : {}),
          user_id: user.id,
        });
        if (error) throw error;
      }
      await fetchContas();
      await fetchReceitas();
      resetFormReceita();
      toast.success(editandoReceita ? "Receita atualizada com sucesso!" : "Receita adicionada com sucesso!");
    } catch (err) {
      toast.error(toActionableErrorMessage(err, "Não foi possível salvar a receita."));
    } finally { setSaving(false); }
  };

  const handleEditReceita = (r: Receita) => {
    setFormReceita({
      conta_id: r.conta_id || "", descricao: r.descricao, valor: formatCurrencyValue(r.valor),
      categoria: r.categoria, tipo: r.tipo, dia_recebimento: String(r.dia_recebimento || 1), num_meses: String(r.num_meses || 12),
    });
    setEditandoReceita(r);
    setShowModalReceita(true);
  };

  const handleDeleteReceita = (r: Receita) => {
    setModalConfirm({
      show: true,
      titulo: "Excluir receita",
      mensagem:
        r.tipo === "avulso"
          ? `Excluir "${r.descricao}"? Se ela tinha conta, o valor sai do saldo.`
          : `Excluir "${r.descricao}"? Os meses que já entraram continuam no saldo.`,
      onConfirm: async () => {
        if (!supabase) return;
        // Fixa/recorrente: o que já entrou fica na conta (utils/saldo).
        if (r.tipo !== "avulso") await manterSaldoAoMudar(r, null);
        const { error } = await supabase.from("receitas").delete().eq("id", r.id);
        if (error) {
          toast.error(toActionableErrorMessage(error, "Não foi possível excluir a receita."));
          throw error;
        }
        await Promise.all([fetchContas(), fetchReceitas()]);
      },
    });
  };

  // Com uma conta só, a receita nova já vem nela: sem conta, ela não entra no saldo.
  useEffect(() => {
    if (showModalReceita && !editandoReceita && !formReceita.conta_id && contas.length === 1) {
      setFormReceita((f) => ({ ...f, conta_id: contas[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModalReceita, editandoReceita, contas]);

  const resetFormReceita = () => {
    setFormReceita({ conta_id: "", descricao: "", valor: "", categoria: categoriaReceitaInicial, tipo: "fixo", dia_recebimento: "1", num_meses: "12" });
    setShowModalReceita(false);
    setEditandoReceita(null);
  };

  // Filtrar receitas pelo mês selecionado
  const receitasFiltradas = useMemo(() => {
    return receitas.filter(r => {
      if (!r.created_at) return false;
      const dataReceita = new Date(r.created_at);
      return (
        dataReceita.getMonth() === mesVisualizacao.getMonth() &&
        dataReceita.getFullYear() === mesVisualizacao.getFullYear()
      );
    });
  }, [receitas, mesVisualizacao]);

  const saldoTotal = contas.reduce((sum, c) => sum + calcularSaldoConta(c), 0);

  // Entradas do mês: funde receitas programadas (fixo/recorrente) e avulsas do
  // mês numa lista única ordenada por dia, marcando cada uma como recebida ou
  // prevista — mesmos dados que as duas seções antigas mostravam separadas.
  const entradasDoMes = useMemo(() => {
    const hoje = new Date();
    const mesSel = format(mesVisualizacao, "yyyy-MM");
    const ultimoDiaMesSel = new Date(mesVisualizacao.getFullYear(), mesVisualizacao.getMonth() + 1, 0).getDate();

    // Só os meses em que a receita vale: depois do início e, na recorrente,
    // dentro dos N meses (antes ela aparecia em todo mês, até nos passados).
    // Fixa/recorrente: recebida só depois de confirmada (ou, antes de as
    // confirmações existirem, no dia). O valor é o que caiu de fato.
    const programadas = receitas
      .filter((r) => receitaNoMes(r, mesSel))
      .map((r) => {
        const estado = estadoDaEntrada(r, mesSel, livro, hoje);
        const dia = Math.min(r.dia_recebimento || 1, ultimoDiaMesSel);
        return { receita: r, dia, recebida: estado.status === "recebida", valor: estado.valor, estado };
      });

    const avulsas = receitasFiltradas
      .filter((r) => r.tipo === "avulso")
      .map((r) => {
        const dia = r.created_at ? new Date(r.created_at).getDate() : r.dia_recebimento || 1;
        return { receita: r, dia: dia || 1, recebida: true, valor: r.valor, estado: undefined as EstadoEntrada | undefined };
      });

    return [...programadas, ...avulsas].sort((a, b) => a.dia - b.dia);
  }, [receitas, receitasFiltradas, mesVisualizacao, livro]);

  const entradasRecebidas = entradasDoMes.filter((e) => e.recebida);
  const entradasPrevistas = entradasDoMes.filter((e) => !e.recebida);
  const totalRecebidoMes = entradasRecebidas.reduce((sum, e) => sum + e.valor, 0);
  const totalPrevistoMes = entradasPrevistas.reduce((sum, e) => sum + e.valor, 0);

  // Respostas a "caiu?" feitas daqui: adiantar, outro valor, ainda não, desfazer.
  const [pedidoResposta, setPedidoResposta] = useState<PedidoResposta | null>(null);
  const mesSelecionado = format(mesVisualizacao, "yyyy-MM");
  const acoesDaEntrada = (r: Receita, estado: EstadoEntrada | undefined) => {
    if (!estado || estado.automatica) return [];
    const pedido = (modo: "valor" | "adiar") => setPedidoResposta({ receita: r, mes: mesSelecionado, dataPrevista: estado.dataPrevista, modo });
    const hojeIso = format(new Date(), "yyyy-MM-dd");
    if (estado.status === "recebida") {
      return [{ rotulo: "Desfazer confirmação", icone: <Undo2 className="w-4 h-4" strokeWidth={1.5} />, onClick: () => desfazerEntrada(r, mesSelecionado) }];
    }
    const caiu = {
      rotulo: estado.status === "confirmar" ? "Caiu" : "Já caiu",
      icone: <Check className="w-4 h-4" strokeWidth={1.5} />,
      // Prevista ou adiada: caiu hoje (adiantou). No dia: caiu no dia previsto.
      onClick: () => confirmarEntrada(r, mesSelecionado, estado.status === "confirmar" && !estado.perguntarEm ? estado.dataPrevista : hojeIso),
    };
    const outro = { rotulo: "Caiu outro valor", icone: <Coins className="w-4 h-4" strokeWidth={1.5} />, onClick: () => pedido("valor") };
    const depois = { rotulo: "Ainda não caiu", icone: <Clock className="w-4 h-4" strokeWidth={1.5} />, onClick: () => pedido("adiar") };
    return estado.status === "prevista" ? [caiu, outro] : [caiu, outro, depois];
  };
  const pillDaEntrada = (estado: EstadoEntrada | undefined, recebida: boolean) => {
    const dia = (iso?: string) => (iso ? Number(iso.substring(8, 10)) : 0);
    if (!estado || estado.automatica) return recebida ? null : <Pill>prevista</Pill>;
    if (estado.status === "recebida") {
      return estado.dataRecebida && estado.dataRecebida !== estado.dataPrevista ? <Pill>caiu dia {dia(estado.dataRecebida)}</Pill> : null;
    }
    if (estado.status === "confirmar") return <Pill tom="atencao">confirmar</Pill>;
    if (estado.status === "adiada") {
      return <Pill>{estado.perguntarAte ? `entre dia ${dia(estado.perguntarEm)} e ${dia(estado.perguntarAte)}` : `pergunto dia ${dia(estado.perguntarEm)}`}</Pill>;
    }
    return <Pill>prevista</Pill>;
  };

  if (loading) return <PageLoadingState title="Carregando contas" />;

  if (loadError) {
    return (
      <PageErrorState
        title="Não foi possível carregar contas"
        description={loadError}
        onAction={() => {
          setLoading(true);
          setLoadError(null);
          Promise.all([fetchContas(), fetchReceitas()])
            .catch((err) => setLoadError(toActionableErrorMessage(err, "Não foi possível carregar contas e receitas.")))
            .finally(() => setLoading(false));
        }}
        actionLabel="Tentar de novo"
      />
    );
  }

  const nomeDoMes = format(mesVisualizacao, "MMMM", { locale: ptBR });
  const acoesDaConta = (c: ContaBancaria) => [
    { rotulo: "Editar", icone: <Pencil className="w-4 h-4" strokeWidth={1.5} />, onClick: () => handleEditConta(c) },
    {
      rotulo: "Excluir",
      icone: <Trash2 className="w-4 h-4" strokeWidth={1.5} />,
      onClick: () => handleDeleteConta(c.id, c.nome),
      tom: "perigo" as const,
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="contas-header"
        title="Contas e receitas"
        description="Onde o dinheiro está e quando ele entra."
        action={
          <>
            <SeletorMes data-tour="contas-mes" />
            <Button
              onClick={() => {
                resetFormReceita();
                setShowModalReceita(true);
              }}
              icone={<Plus className="w-4 h-4" strokeWidth={1.75} />}
            >
              Nova receita
            </Button>
            <Button
              variante={isMobile ? "secundario" : "principal"}
              onClick={() => {
                resetFormConta();
                setShowModalConta(true);
              }}
              data-tour="contas-btn-nova-conta"
              icone={<Plus className="w-4 h-4" strokeWidth={1.75} />}
            >
              Nova conta
            </Button>
          </>
        }
      />

      {/* FAIXA_RESUMO */}
      <KpiStrip data-tour="contas-cards">
        <Kpi
          rotulo="Saldo total"
          valor={<AnimatedNumber valor={saldoTotal} className={`text-[20px] ${saldoTotal < 0 ? "text-danger-ink" : ""}`} />}
          meta={`em ${contas.length} ${contas.length === 1 ? "conta" : "contas"}`}
        />
        <Kpi
          rotulo="Recebido no mês"
          valor={<AnimatedNumber valor={totalRecebidoMes} className="text-[20px]" />}
          meta={`${entradasRecebidas.length} ${entradasRecebidas.length === 1 ? "entrada" : "entradas"}`}
        />
        <Kpi
          rotulo="Ainda a receber"
          valor={<AnimatedNumber valor={totalPrevistoMes} className="text-[20px]" />}
          meta={`${entradasPrevistas.length} ${entradasPrevistas.length === 1 ? "prevista" : "previstas"}`}
        />
      </KpiStrip>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
        {/* Minhas contas */}
        <Surface as="section" className="lg:col-start-1" data-tour="contas-section-contas">
          <SurfaceHeader
            titulo="Minhas contas"
            className="mb-1"
            descricao="A barra é a parte de cada conta no saldo total."
            acao={<span className="tabular-nums text-xs text-fg-3">{contas.length} {contas.length === 1 ? "conta" : "contas"}</span>}
          />
          {contas.length === 0 ? (
            <EmptyState
              Icone={Landmark}
              frase="Nenhuma conta cadastrada."
              detalhe="Cadastre uma conta para acompanhar o saldo total."
              compacto
            />
          ) : (
            <ListGroup>
              {contas.map((c) => {
                const saldoConta = calcularSaldoConta(c);
                const participacao = saldoTotal > 0 ? Math.max(saldoConta / saldoTotal, 0) : 0;
                return (
                  <ListRow
                    key={c.id}
                    icone={<Landmark className="w-4 h-4" strokeWidth={1.5} />}
                    titulo={c.nome}
                    meta={
                      <>
                        {c.banco || "Sem banco"}
                      </>
                    }
                    valor={<span className={saldoConta < 0 ? "text-danger-ink" : ""}>{formatDinheiro(saldoConta)}</span>}
                    subvalor={formatPercent(Math.min(participacao, 1))}
                    rodape={
                      <div className="pl-12">
                        <ProgressBar
                          neutra
                          valor={Math.min(participacao, 1)}
                          maximo={1}
                          rotulo={`${c.nome}: ${formatPercent(participacao)} do saldo total`}
                        />
                      </div>
                    }
                    onAbrir={() => handleEditConta(c)}
                    acoes={acoesDaConta(c)}
                  />
                );
              })}
            </ListGroup>
          )}
        </Surface>

        {/* Entradas do mês — recebidas e previstas na mesma lista */}
        <Surface
          as="section"
          className="lg:col-start-2 lg:row-start-1 lg:row-span-2"
          data-tour="contas-section-receitas"
        >
          <SurfaceHeader
            titulo={`Entradas de ${nomeDoMes}`}
            className="mb-1"
            descricao="Recebidas e previstas, na ordem do dia."
          />
          {entradasDoMes.length === 0 ? (
            <EmptyState
              Icone={ArrowDownLeft}
              frase="Nenhuma entrada neste mês."
              detalhe="Cadastre receitas fixas, recorrentes ou avulsas."
              compacto
            />
          ) : (
            <ListGroup>
              {entradasDoMes.map(({ receita: r, dia, recebida, valor, estado }) => {
                const contaNome = contas.find((c) => c.id === r.conta_id)?.nome || "Sem conta";
                const tipoLabel = r.tipo === "avulso" ? "avulsa" : r.tipo === "fixo" ? "fixa" : `recorrente ${r.num_meses}x`;
                return (
                  <ListRow
                    key={r.id}
                    icone={<ArrowDownLeft className="w-4 h-4" strokeWidth={1.5} />}
                    titulo={r.descricao}
                    meta={
                      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span>
                          dia {String(dia).padStart(2, "0")} · {contaNome} · {tipoLabel}
                        </span>
                        {pillDaEntrada(estado, recebida)}
                      </span>
                    }
                    valor={formatDinheiro(valor, { positivo: true })}
                    recebido={recebida}
                    onAbrir={() => handleEditReceita(r)}
                    acoes={[
                      ...acoesDaEntrada(r, estado),
                      { rotulo: "Editar", icone: <Pencil className="w-4 h-4" strokeWidth={1.5} />, onClick: () => handleEditReceita(r) },
                      {
                        rotulo: "Excluir",
                        icone: <Trash2 className="w-4 h-4" strokeWidth={1.5} />,
                        onClick: () => handleDeleteReceita(r),
                        tom: "perigo",
                      },
                    ]}
                  />
                );
              })}
            </ListGroup>
          )}
        </Surface>

        {/* Até o fim do mês: o mesmo extrato do Início — saldo de hoje + o que
            entra − o que sai. Sempre do mês atual. */}
        {previsao && contas.length > 0 && <ExtratoPrevisao previsao={previsao} className="lg:col-start-1" />}
      </div>

      {/* Conta */}
      <FormSheet
        aberto={showModalConta}
        titulo={editandoConta ? "Editar conta" : "Nova conta"}
        onFechar={resetFormConta}
        onEnviar={() => handleSubmitConta({ preventDefault() {} } as React.FormEvent)}
        rotuloEnviar={editandoConta ? "Salvar alterações" : "Criar conta"}
        enviando={saving}
        podeEnviar={!!formConta.nome.trim()}
        valor={
          <div>
            {/* Um campo só: o saldo de hoje. Ao criar, é o ponto de partida; ao
                editar, corrige o saldo (a diferença vai para o ponto de partida). */}
            <MoneyInput
              tamanho="heroi"
              value={editandoConta ? formConta.saldo_atual : formConta.saldo_inicial}
              onChange={(v) =>
                setFormConta(editandoConta ? { ...formConta, saldo_atual: v } : { ...formConta, saldo_inicial: v })
              }
              aria-label="Saldo de hoje"
            />
            <p className="mt-2 text-center text-xs text-fg-3">
              {editandoConta ? "Saldo de hoje. Mude para corrigir." : "Quanto tem na conta hoje"}
            </p>
          </div>
        }
      >
        <Campo rotulo="Nome da conta" htmlFor="conta-nome">
          <input
            id="conta-nome"
            data-autofocus
            type="text"
            value={formConta.nome}
            onChange={(e) => setFormConta({ ...formConta, nome: e.target.value })}
            placeholder="Ex: conta corrente, poupança"
            className={campoClasse}
          />
        </Campo>
        <Campo rotulo="Banco (opcional)" htmlFor="conta-banco">
          <input
            id="conta-banco"
            type="text"
            value={formConta.banco}
            onChange={(e) => setFormConta({ ...formConta, banco: e.target.value })}
            placeholder="Ex: Nubank, Inter"
            className={campoClasse}
          />
        </Campo>
      </FormSheet>

      {/* Receita */}
      <FormSheet
        aberto={showModalReceita}
        titulo={editandoReceita ? "Editar receita" : "Nova receita"}
        onFechar={resetFormReceita}
        onEnviar={() => handleSubmitReceita({ preventDefault() {} } as React.FormEvent)}
        rotuloEnviar={editandoReceita ? "Salvar alterações" : "Adicionar receita"}
        enviando={saving}
        podeEnviar={!!formReceita.descricao.trim() && !!formReceita.valor}
        valor={
          <MoneyInput
            tamanho="heroi"
            value={formReceita.valor}
            onChange={(valor) => setFormReceita({ ...formReceita, valor })}
            aria-label="Valor"
            data-autofocus
          />
        }
      >
        <Campo rotulo="Descrição" htmlFor="receita-descricao">
          <input
            id="receita-descricao"
            type="text"
            value={formReceita.descricao}
            onChange={(e) => setFormReceita({ ...formReceita, descricao: e.target.value })}
            placeholder="Ex: salário, freelance"
            className={campoClasse}
          />
        </Campo>
        <Campo rotulo="Categoria">
          <Chips>
            {comCategoriaAtual(categoriasReceita, formReceita.categoria).map((c) => (
              <Chip key={c} ativo={formReceita.categoria === c} onClick={() => setFormReceita({ ...formReceita, categoria: c })}>
                {c}
              </Chip>
            ))}
          </Chips>
        </Campo>
        <Campo rotulo="Tipo">
          <Chips>
            {TIPOS_RECEITA.map((t) => (
              <Chip
                key={t.value}
                ativo={formReceita.tipo === t.value}
                onClick={() => setFormReceita({ ...formReceita, tipo: t.value as ReceitaForm["tipo"] })}
              >
                {t.label}
              </Chip>
            ))}
          </Chips>
        </Campo>
        {formReceita.tipo !== "avulso" && (
          <Campo rotulo="Dia do recebimento" htmlFor="receita-dia" dica="De 1 a 31.">
            <CampoInteiro
              id="receita-dia"
              max={31}
              value={formReceita.dia_recebimento}
              onChange={(v) => setFormReceita({ ...formReceita, dia_recebimento: v })}
            />
          </Campo>
        )}
        {formReceita.tipo === "recorrente" && (
          <Campo rotulo="Quantos meses" htmlFor="receita-meses" dica="De 1 a 60.">
            <CampoInteiro
              id="receita-meses"
              max={60}
              value={formReceita.num_meses}
              onChange={(v) => setFormReceita({ ...formReceita, num_meses: v })}
            />
          </Campo>
        )}
        {/* A conta é o que faz a receita entrar no saldo: fica à vista. */}
        {contas.length > 0 && (
          <Campo rotulo="Entra em qual conta" dica="Sem conta, a receita não mexe no saldo.">
            <Chips>
              {contas.map((c) => (
                <Chip key={c.id} ativo={formReceita.conta_id === c.id} onClick={() => setFormReceita({ ...formReceita, conta_id: c.id })}>
                  {c.nome}
                </Chip>
              ))}
              <Chip ativo={!formReceita.conta_id} onClick={() => setFormReceita({ ...formReceita, conta_id: "" })}>
                Nenhuma
              </Chip>
            </Chips>
          </Campo>
        )}
      </FormSheet>

      <RespostaEntrada pedido={pedidoResposta} onFechar={() => setPedidoResposta(null)} />

      <GuidedTourOverlay
        show={showTutorial}
        tutorialTitle={TUTORIAL_TITLES.contas}
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
