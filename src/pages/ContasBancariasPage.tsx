import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, Pencil, Landmark, ArrowDownLeft } from "lucide-react";
import { useAppContext } from "../context";
import { PageHeader } from "../components/ui/PageHeader";
import { SeletorMes } from "../components/ui/SeletorMes";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useGuidedTour, usePageTutorialHelpButton, useIsMobile } from "../hooks";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatCurrencyValue, parseCurrency } from "../utils/calculations";
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
import { FormSheet, Campo, Chip, Chips, MaisOpcoes, campoClasse } from "../components/ui/FormSheet";
import { useAcaoPrincipalDaPagina } from "../components/layout/AcaoPrincipalContext";

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
    titulo: "Visão de Contas Bancárias",
    descricao:
      "Nesta tela você centraliza contas, receitas programadas e entradas do mês para controlar saldo com mais precisão.",
    placement: "below",
  },
  {
    target: "[data-tour='contas-mes']",
    alvo: "Navegação mensal",
    titulo: "Troca de período",
    descricao:
      "Mude o mês para comparar receitas e evolução dos saldos entre períodos diferentes.",
  },
  {
    target: "[data-tour='contas-cards']",
    alvo: "Cards de resumo",
    titulo: "Resumo rápido",
    descricao:
      "Aqui você vê quantidade de contas, receitas do mês e saldo total consolidado.",
  },
  {
    target: "[data-tour='contas-section-contas']",
    alvo: "Seção Minhas Contas",
    titulo: "Gestão de contas",
    descricao:
      "Cadastre contas, ajuste dados e acompanhe saldo atual de cada uma com ações de editar e excluir.",
  },
  {
    target: "[data-tour='contas-btn-nova-conta']",
    alvo: "Botão Nova Conta",
    titulo: "Adicionar conta",
    descricao:
      "Use este botão para registrar novas contas bancárias no seu controle financeiro.",
  },
  {
    target: "[data-tour='contas-section-receitas']",
    alvo: "Entradas do mês",
    titulo: "Entradas do mês",
    descricao:
      "Recebidas e previstas na mesma lista, ordenadas por dia — com receitas fixas, recorrentes e avulsas.",
  },
  {
    target: "[data-tour='contas-help-button']",
    alvo: "Botão de ajuda",
    titulo: "Rever tutorial",
    descricao:
      "Clique no (?) para abrir novamente este guia da aba Contas Bancárias.",
  },
];

export const ContasBancariasPage = () => {
  const { user, setModalConfirm, setModalFeedback, mesVisualizacao, gastosFixos, meusGastosDoMes } = useAppContext();
  const { categorias: categoriasReceita } = useCategorias("receita");

  // Categoria pré-selecionada numa receita nova: "Outras Receitas" enquanto ela
  // existir, senão a primeira da lista personalizada.
  const categoriaReceitaInicial =
    categoriasReceita.find((c) => chaveCategoria(c) === chaveCategoria(CATEGORIA_RECEITA_PADRAO)) ??
    categoriasReceita[0] ??
    CATEGORIA_RECEITA_PADRAO;


  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
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
  const fetchContas = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from("contas_bancarias").select("*").order("nome");
    setContas(data || []);
  }, [user]);

  const fetchReceitas = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from("receitas").select("*").order("created_at", { ascending: false });
    setReceitas(data || []);
  }, [user]);

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
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial da aba Contas Bancárias",
    ariaLabel: "Ver tutorial da aba Contas Bancárias",
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

  // Calcular saldo
  const calcularSaldoConta = (conta: ContaBancaria) => {
    const hoje = new Date();
    const diaAtual = hoje.getDate();
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const receitasDaConta = receitas.filter(r => r.conta_id === conta.id);
    // Apenas receitas fixas e recorrentes que já venceram (avulso já está no saldo_atual)
    // Se dia_recebimento > último dia do mês (ex: 31 em fev), considera o último dia
    const receitasRecebidas = receitasDaConta.filter(r => {
      if (r.tipo === "avulso") return false; // Avulso já foi adicionado diretamente ao saldo_atual
      if (r.tipo === "fixo" || r.tipo === "recorrente") {
        const diaEfetivo = Math.min(r.dia_recebimento, ultimoDiaMes);
        return diaEfetivo <= diaAtual;
      }
      return false;
    });
    // Gastos fixos vinculados a esta conta que já venceram no mês atual (e não estão suspensos)
    const mesAtualStr = format(mesVisualizacao, "yyyy-MM");
    const gastosFixosDaConta = (gastosFixos || []).filter(g => {
      if (g.conta_id !== conta.id) return false;
      if (g.ativo === false) return false;
      if (g.meses_suspensos?.includes(mesAtualStr)) return false;

      const diaVencimento = g.dia_vencimento || 1;
      const diaEfetivo = Math.min(diaVencimento, ultimoDiaMes);
      return diaEfetivo <= diaAtual;
    });

    // Gastos tipo "divida" (conta a pagar) vinculados a esta conta cuja data já chegou
    const hojeStr = format(hoje, "yyyy-MM-dd");
    const gastosDividaDaConta = (meusGastosDoMes || []).filter(g => {
      if (g.categoria !== "divida") return false;
      if (g.conta_id !== conta.id) return false;
      if (g.tipo !== "debito") return false;
      return g.data <= hojeStr;
    });

    // Usar saldo_atual como base (que inclui pagamentos de fatura e receitas/gastos avulsos)
    const saldoBase = conta.saldo_atual !== undefined && conta.saldo_atual !== null ? conta.saldo_atual : conta.saldo_inicial;

    const totalReceitas = receitasRecebidas.reduce((sum, r) => sum + r.valor, 0);
    const totalGastosFixos = gastosFixosDaConta.reduce((sum, g) => sum + g.valor, 0);
    const totalGastosDivida = gastosDividaDaConta.reduce((sum, g) => sum + g.valor, 0);

    return saldoBase + totalReceitas - totalGastosFixos - totalGastosDivida;
  };

  // CRUD Conta
  const handleSubmitConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;
    setSaving(true);
    try {
      const saldoInicial = parseCurrency(formConta.saldo_inicial);
      const saldoAtual = parseCurrency(formConta.saldo_atual);
      const dados = {
        nome: formConta.nome.trim(),
        banco: formConta.banco.trim(),
        saldo_inicial: saldoInicial,
        saldo_atual: saldoAtual,
      };
      if (editandoConta) {
        await supabase.from("contas_bancarias").update(dados).eq("id", editandoConta.id);
      } else {
        // Ao criar nova conta, saldo_atual começa igual ao saldo_inicial
        await supabase.from("contas_bancarias").insert({
          ...dados,
          saldo_atual: saldoInicial,
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
      saldo_atual: formatCurrencyValue(c.saldo_atual || c.saldo_inicial),
    });
    setEditandoConta(c);
    setShowModalConta(true);
  };

  const handleDeleteConta = (id: string, nome: string) => {
    setModalConfirm({
      show: true, titulo: "Excluir Conta", mensagem: `Excluir "${nome}"?`,
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
      console.log("Salvando receita:", dados);
      if (editandoReceita) {
        const { error } = await supabase.from("receitas").update(dados).eq("id", editandoReceita.id);
        if (error) console.error("Erro update:", error);

        // Se for avulso e a conta mudou, transferir o valor
        if (editandoReceita.tipo === "avulso") {
          const contaAntiga = editandoReceita.conta_id;
          const contaNova = formReceita.conta_id;
          const valorAntigo = editandoReceita.valor;

          // Remover da conta antiga
          if (contaAntiga) {
            const conta = contas.find(c => c.id === contaAntiga);
            if (conta) {
              const novoSaldo = (conta.saldo_atual ?? conta.saldo_inicial) - valorAntigo;
              await supabase.from("contas_bancarias").update({ saldo_atual: novoSaldo }).eq("id", contaAntiga);
            }
          }
          // Adicionar na conta nova
          if (contaNova) {
            const conta = contas.find(c => c.id === contaNova);
            if (conta) {
              const novoSaldo = (conta.saldo_atual ?? conta.saldo_inicial) + valorReceita;
              await supabase.from("contas_bancarias").update({ saldo_atual: novoSaldo }).eq("id", contaNova);
            }
          }
          await fetchContas();
        }
      } else {
        const { error } = await supabase.from("receitas").insert({ ...dados, user_id: user.id });
        if (error) console.error("Erro insert:", error);

        // Se for receita avulsa, adicionar imediatamente ao saldo_atual da conta
        if (formReceita.tipo === "avulso" && formReceita.conta_id) {
          const conta = contas.find(c => c.id === formReceita.conta_id);
          if (conta) {
            const novoSaldo = (conta.saldo_atual ?? conta.saldo_inicial) + valorReceita;
            await supabase.from("contas_bancarias").update({ saldo_atual: novoSaldo }).eq("id", formReceita.conta_id);
            await fetchContas();
          }
        }
      }
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

  const handleDeleteReceita = (id: string, desc: string) => {
    setModalConfirm({
      show: true, titulo: "Excluir Receita", mensagem: `Excluir "${desc}"?`,
      onConfirm: async () => {
        if (!supabase) return;
        const { error } = await supabase.from("receitas").delete().eq("id", id);
        if (error) {
          toast.error(toActionableErrorMessage(error, "Não foi possível excluir a receita."));
          throw error;
        }
        await fetchReceitas();
      },
    });
  };

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
    const mesHoje = format(hoje, "yyyy-MM");
    const ultimoDiaMesSel = new Date(mesVisualizacao.getFullYear(), mesVisualizacao.getMonth() + 1, 0).getDate();

    const programadas = receitas
      .filter((r) => r.tipo === "fixo" || r.tipo === "recorrente")
      .map((r) => {
        const dia = Math.min(r.dia_recebimento || 1, ultimoDiaMesSel);
        const recebida = mesSel < mesHoje ? true : mesSel > mesHoje ? false : dia <= hoje.getDate();
        return { receita: r, dia, recebida };
      });

    const avulsas = receitasFiltradas
      .filter((r) => r.tipo === "avulso")
      .map((r) => {
        const dia = r.created_at ? new Date(r.created_at).getDate() : r.dia_recebimento || 1;
        return { receita: r, dia: dia || 1, recebida: true };
      });

    return [...programadas, ...avulsas].sort((a, b) => a.dia - b.dia);
  }, [receitas, receitasFiltradas, mesVisualizacao]);

  const entradasRecebidas = entradasDoMes.filter((e) => e.recebida);
  const entradasPrevistas = entradasDoMes.filter((e) => !e.recebida);
  const totalRecebidoMes = entradasRecebidas.reduce((sum, e) => sum + e.receita.valor, 0);
  const totalPrevistoMes = entradasPrevistas.reduce((sum, e) => sum + e.receita.valor, 0);

  // Gastos fixos ativos (não suspensos) do mês selecionado — para a previsão.
  const mesSelStr = format(mesVisualizacao, "yyyy-MM");
  const totalGastosFixosMes = (gastosFixos || [])
    .filter((g) => g.ativo !== false && !g.meses_suspensos?.includes(mesSelStr))
    .reduce((sum, g) => sum + g.valor, 0);
  const sobraPrevista = totalRecebidoMes + totalPrevistoMes - totalGastosFixosMes;

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
            acao={<span className="valor text-xs text-fg-3">{contas.length} {contas.length === 1 ? "conta" : "contas"}</span>}
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
                        {c.banco || "Sem banco"} · inicial <span className="valor">{formatCurrency(c.saldo_inicial)}</span>
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
              {entradasDoMes.map(({ receita: r, dia, recebida }) => {
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
                        {!recebida && <Pill>prevista</Pill>}
                      </span>
                    }
                    valor={formatDinheiro(r.valor, { positivo: true })}
                    recebido={recebida}
                    onAbrir={() => handleEditReceita(r)}
                    acoes={[
                      { rotulo: "Editar", icone: <Pencil className="w-4 h-4" strokeWidth={1.5} />, onClick: () => handleEditReceita(r) },
                      {
                        rotulo: "Excluir",
                        icone: <Trash2 className="w-4 h-4" strokeWidth={1.5} />,
                        onClick: () => handleDeleteReceita(r.id, r.descricao),
                        tom: "perigo",
                      },
                    ]}
                  />
                );
              })}
            </ListGroup>
          )}
        </Surface>

        {/* Previsão do mês: um extrato de cima para baixo. */}
        <Surface as="section" className="lg:col-start-1">
          <SurfaceHeader titulo="Previsão do mês" descricao="Se tudo entrar e sair como previsto." />
          <dl className="text-[15px] md:text-sm">
            {[
              { rotulo: "Recebido", valor: formatDinheiro(totalRecebidoMes, { positivo: true }) },
              { rotulo: "A receber", valor: formatDinheiro(totalPrevistoMes, { positivo: true }) },
              { rotulo: "Gastos fixos", valor: formatDinheiro(-totalGastosFixosMes) },
            ].map((l) => (
              <div key={l.rotulo} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-fg-2">{l.rotulo}</dt>
                <dd className="valor text-fg">{l.valor}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 pt-4 mt-2 border-t border-line">
              <dt className="text-fg">Sobra prevista</dt>
              <dd>
                <AnimatedNumber
                  valor={sobraPrevista}
                  positivo
                  className={`text-[20px] ${sobraPrevista < 0 ? "text-danger-ink" : "text-fg"}`}
                />
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-fg-3">Receitas do mês menos os fixos. Não inclui gastos variáveis.</p>
        </Surface>
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
            <MoneyInput
              tamanho="heroi"
              value={formConta.saldo_inicial}
              onChange={(saldo_inicial) => setFormConta({ ...formConta, saldo_inicial })}
              aria-label="Saldo inicial"
            />
            <p className="mt-2 text-center text-xs text-fg-3">Saldo inicial</p>
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
        {editandoConta && (
          <Campo rotulo="Saldo atual" htmlFor="conta-saldo-atual" dica="Edite para corrigir o saldo à mão.">
            <MoneyInput
              id="conta-saldo-atual"
              value={formConta.saldo_atual}
              onChange={(saldo_atual) => setFormConta({ ...formConta, saldo_atual })}
            />
          </Campo>
        )}
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
            <input
              id="receita-dia"
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              value={formReceita.dia_recebimento}
              onChange={(e) => setFormReceita({ ...formReceita, dia_recebimento: e.target.value })}
              className={`${campoClasse} valor`}
            />
          </Campo>
        )}
        {formReceita.tipo === "recorrente" && (
          <Campo rotulo="Quantos meses" htmlFor="receita-meses" dica="De 1 a 60.">
            <input
              id="receita-meses"
              type="number"
              inputMode="numeric"
              min="1"
              max="60"
              value={formReceita.num_meses}
              onChange={(e) => setFormReceita({ ...formReceita, num_meses: e.target.value })}
              className={`${campoClasse} valor`}
            />
          </Campo>
        )}
        {contas.length > 0 && (
          <MaisOpcoes abertoInicial={!!formReceita.conta_id}>
            <Campo rotulo="Conta" htmlFor="receita-conta">
              <select
                id="receita-conta"
                value={formReceita.conta_id}
                onChange={(e) => setFormReceita({ ...formReceita, conta_id: e.target.value })}
                className={campoClasse}
              >
                <option value="">Sem conta vinculada</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </MaisOpcoes>
        )}
      </FormSheet>

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
