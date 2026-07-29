import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Loader2, Trash2, Edit2, X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppContext } from "../context";
import { PageHeader } from "../components/ui/PageHeader";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatCurrencyInput, formatCurrencyValue, parseCurrency, formatMonthYear } from "../utils/calculations";
import { CATEGORIAS_RECEITA, TIPOS_RECEITA, CATEGORIA_RECEITA_PADRAO } from "../utils/receitas";
import { TUTORIAL_TITLES } from "../utils/tutorial";
import { toast } from "../components/ui/Toaster";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../components/ui/AsyncState";
import { Valor } from "../components/ui/Valor";
import { toActionableErrorMessage } from "../utils/feedbackMessages";
import type { ContaBancaria, Receita, ContaBancariaForm, ReceitaForm } from "../types";
import { Rotulo } from "../components/ui/Rotulo";
import { Card } from "../components/ui/Card";

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
  const { user, setModalConfirm, setModalFeedback, mesVisualizacao, navegarMes, irParaHoje, gastosFixos, meusGastosDoMes } = useAppContext();
  
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
    setFormReceita({ conta_id: "", descricao: "", valor: "", categoria: CATEGORIA_RECEITA_PADRAO, tipo: "fixo", dia_recebimento: "1", num_meses: "12" });
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

  const isMesCorrente = format(mesVisualizacao, "yyyy-MM") === format(new Date(), "yyyy-MM");

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

  if (loading) return <PageLoadingState title="Carregando contas" description="Estamos atualizando contas bancárias e receitas." />;

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
        actionLabel="Tentar novamente"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="contas-header"
        eyebrow="Carteira"
        title="Contas bancárias"
        description="Onde o dinheiro está e quando ele entra."
        action={
          <div className="flex items-center gap-3 flex-wrap">
            {/* MES_PILL */}
            <div className="inline-flex items-center bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] rounded-xl p-1 shadow-sm" data-tour="contas-mes">
              <button
                onClick={() => navegarMes("anterior")}
                aria-label="Mês anterior"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"
              >
                <ChevronLeft className="w-[18px] h-[18px]" />
              </button>
              <span className="min-w-[128px] text-center text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-100">
                {formatMonthYear(mesVisualizacao)}
              </span>
              {!isMesCorrente && (
                <button
                  onClick={irParaHoje}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 px-1.5"
                >
                  hoje
                </button>
              )}
              <button
                onClick={() => navegarMes("proximo")}
                aria-label="Próximo mês"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"
              >
                <ChevronRight className="w-[18px] h-[18px]" />
              </button>
            </div>
            {/* CTA */}
            <button
              onClick={() => { resetFormConta(); setShowModalConta(true); }}
              data-tour="contas-btn-nova-conta"
              className="inline-flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-[18px] h-[18px]" /> Nova conta
            </button>
          </div>
        }
      />

      {/* FAIXA_RESUMO */}
      <Card
        padding="resumo"
        className="grid gap-x-7 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]"
        data-tour="contas-cards"
      >
        <div className="min-w-0">
          <Rotulo tom="acento">Saldo total</Rotulo>
          <Valor porte="destaque" className={`block mt-1 ${saldoTotal < 0 ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50"}`}>
            {formatCurrency(saldoTotal)}
          </Valor>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">em {contas.length} {contas.length === 1 ? "conta" : "contas"}</p>
        </div>
        <div className="min-w-0">
          <Rotulo>Recebido no mês</Rotulo>
          <p className="font-mono valor text-2xl font-semibold text-emerald-700 dark:text-emerald-400 mt-1.5">{formatCurrency(totalRecebidoMes)}</p>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{entradasRecebidas.length} {entradasRecebidas.length === 1 ? "entrada" : "entradas"}</p>
        </div>
        <div className="min-w-0">
          <Rotulo>Ainda a receber</Rotulo>
          <p className="font-mono valor text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1.5">{formatCurrency(totalPrevistoMes)}</p>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{entradasPrevistas.length} {entradasPrevistas.length === 1 ? "entrada prevista" : "entradas previstas"}</p>
        </div>
      </Card>

      {/* Grid de cards */}
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">

      {/* Card Minhas contas */}
      <Card as="section" className="min-w-0" data-tour="contas-section-contas">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Minhas contas</h2>
          <span className="font-mono valor text-[13px] text-zinc-500 dark:text-zinc-400">{contas.length} {contas.length === 1 ? "conta" : "contas"}</span>
        </div>
        <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 mb-4">barra = participação no saldo total</p>
        {contas.length === 0 ? (
          <PageEmptyState compact title="Nenhuma conta cadastrada" description="Clique em Nova conta para começar e acompanhar seu saldo total." />
        ) : (
          <div className="space-y-4">
            {contas.map((c, i) => {
              const saldoConta = calcularSaldoConta(c);
              const participacao = saldoTotal > 0 ? Math.max((saldoConta / saldoTotal) * 100, 0) : 0;
              const tomBarra = i === 0 ? "bg-emerald-600" : i === 1 ? "bg-emerald-500" : "bg-emerald-400";
              return (
                <div key={c.id} className="grid [grid-template-columns:minmax(150px,1fr)_132px_68px] gap-3.5 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{c.nome}</p>
                      <span className="font-mono valor text-[11px] text-zinc-500 dark:text-zinc-400">{participacao.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 dark:bg-white/[0.04] overflow-hidden mt-1.5">
                      <div className={`h-full rounded-full ${tomBarra}`} style={{ width: `${Math.min(participacao, 100)}%` }} />
                    </div>
                    {/* O nome do banco trunca; o valor nunca — cortar centavos é perder dado sem avisar. */}
                    <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-baseline gap-1 min-w-0">
                      <span className="truncate">{c.banco || "sem banco"}</span>
                      <span className="shrink-0">· inicial</span>
                      <span className="valor shrink-0">{formatCurrency(c.saldo_inicial)}</span>
                    </p>
                  </div>
                  <p className={`font-mono valor font-semibold whitespace-nowrap text-right ${saldoConta < 0 ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                    {formatCurrency(saldoConta)}
                  </p>
                  <div className="flex gap-0.5 justify-end">
                    <button onClick={() => handleEditConta(c)} aria-label={`Editar conta ${c.nome}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"><Edit2 className="w-[15px] h-[15px]" /></button>
                    <button onClick={() => handleDeleteConta(c.id, c.nome)} aria-label={`Excluir conta ${c.nome}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"><Trash2 className="w-[15px] h-[15px]" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Card Entradas do mês — recebidas e previstas na mesma lista */}
      <Card as="section" className="min-w-0" data-tour="contas-section-receitas">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 capitalize">
            Entradas de {format(mesVisualizacao, "MMMM", { locale: ptBR })}
          </h2>
          <button
            onClick={() => { resetFormReceita(); setShowModalReceita(true); }}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova receita
          </button>
        </div>
        <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 mb-4">recebidas e previstas na mesma lista, ordenadas por dia</p>
        {entradasDoMes.length === 0 ? (
          <PageEmptyState compact title="Sem entradas neste mês" description="Cadastre receitas fixas, recorrentes ou avulsas para acompanhar o que entra." />
        ) : (
          <div className="space-y-1">
            {entradasDoMes.map(({ receita: r, dia, recebida }) => {
              const contaNome = contas.find(c => c.id === r.conta_id)?.nome || "sem conta";
              const tipoLabel = r.tipo === "avulso" ? "avulso" : r.tipo === "fixo" ? "fixo" : `recorrente ${r.num_meses}x`;
              return (
                <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
                  {recebida ? (
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </span>
                  ) : (
                    <span className="w-6 h-6 rounded-lg border-[1.5px] border-dashed border-zinc-300 dark:border-zinc-600 flex-shrink-0" />
                  )}
                  <span className={`font-mono valor text-xs font-semibold w-7 flex-shrink-0 ${recebida ? "text-zinc-600 dark:text-zinc-300" : "text-amber-600 dark:text-amber-400"}`}>
                    {String(dia).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{r.descricao}</p>
                    <p className={`font-mono text-[11px] truncate ${recebida ? "text-zinc-500 dark:text-zinc-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {recebida ? `${contaNome} · ${tipoLabel}` : "prevista · ainda não caiu"}
                    </p>
                  </div>
                  <span className={`font-mono valor text-sm font-semibold whitespace-nowrap ${recebida ? "text-emerald-700 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {recebida ? "+" : ""}{formatCurrency(r.valor)}
                  </span>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button onClick={() => handleEditReceita(r)} aria-label={`Editar receita ${r.descricao}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"><Edit2 className="w-[15px] h-[15px]" /></button>
                    <button onClick={() => handleDeleteReceita(r.id, r.descricao)} aria-label={`Excluir receita ${r.descricao}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"><Trash2 className="w-[15px] h-[15px]" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Card Previsão do mês */}
      <Card as="section" className="min-w-0">
        <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Previsão do mês</h2>
        <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 mb-4">se tudo entrar e sair como previsto</p>
        {(() => {
          const maxPrevisao = Math.max(totalRecebidoMes, totalPrevistoMes, totalGastosFixosMes, 1);
          return (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-500 dark:text-zinc-400">Recebido</span>
                  <span className="font-mono valor text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatCurrency(totalRecebidoMes)}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-white/[0.04] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(totalRecebidoMes / maxPrevisao) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-500 dark:text-zinc-400">A receber</span>
                  <span className="font-mono valor text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatCurrency(totalPrevistoMes)}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-white/[0.04] overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${(totalPrevistoMes / maxPrevisao) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-500 dark:text-zinc-400">Gastos fixos</span>
                  <span className="font-mono valor text-zinc-900 dark:text-zinc-100 whitespace-nowrap">−{formatCurrency(totalGastosFixosMes)}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-white/[0.04] overflow-hidden">
                  <div className="h-full rounded-full bg-zinc-300 dark:bg-white/25" style={{ width: `${(totalGastosFixosMes / maxPrevisao) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })()}
        <div className="border-t border-zinc-100 dark:border-zinc-800 mt-4 pt-4">
          <Rotulo>Sobra prevista</Rotulo>
          <p className={`font-mono valor text-2xl font-semibold mt-1 ${sobraPrevista >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {formatCurrency(sobraPrevista)}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
            receitas do mês menos os fixos — não inclui gastos variáveis.
          </p>
        </div>
      </Card>

      </div>{/* /grid de cards */}

      {/* Modal Nova/Editar Conta */}
      {showModalConta && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-md p-5 border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{editandoConta ? "Editar Conta" : "Nova Conta Bancária"}</h3>
              <button onClick={resetFormConta} className="p-1 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded"><X className="w-5 h-5 text-zinc-400 dark:text-zinc-500" /></button>
            </div>
            <form onSubmit={handleSubmitConta} className="space-y-4">
              <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Nome da conta</label><input type="text" value={formConta.nome} onChange={e => setFormConta({...formConta, nome: e.target.value})} placeholder="Ex: Conta Corrente, Poupança..." className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" required /></div>
              <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Banco (opcional)</label><input type="text" value={formConta.banco} onChange={e => setFormConta({...formConta, banco: e.target.value})} placeholder="Ex: Nubank, Inter..." className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" /></div>
              <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Saldo inicial</label><input type="text" value={formConta.saldo_inicial} onChange={e => setFormConta({...formConta, saldo_inicial: formatCurrencyInput(e.target.value)})} className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" /></div>
              {editandoConta && (
                <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Saldo Atual</label><input type="text" value={formConta.saldo_atual} onChange={e => setFormConta({...formConta, saldo_atual: formatCurrencyInput(e.target.value)})} className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" /><p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Edite para corrigir manualmente o saldo</p></div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetFormConta} className="flex-1 py-2 bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:bg-white/[0.07] dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{editandoConta ? "Salvar" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova/Editar Receita */}
      {showModalReceita && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-md p-5 border border-zinc-200 dark:border-zinc-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{editandoReceita ? "Editar Receita" : "Nova Receita"}</h3>
              <button onClick={resetFormReceita} className="p-1 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded"><X className="w-5 h-5 text-zinc-400 dark:text-zinc-500" /></button>
            </div>
            <form onSubmit={handleSubmitReceita} className="space-y-4">
              <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Descrição</label><input type="text" value={formReceita.descricao} onChange={e => setFormReceita({...formReceita, descricao: e.target.value})} placeholder="Ex: Salário, Freelance..." className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" required /></div>
              <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Valor</label><input type="text" value={formReceita.valor} onChange={e => setFormReceita({...formReceita, valor: formatCurrencyInput(e.target.value)})} placeholder="R$ 0,00" className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Categoria</label><select value={formReceita.categoria} onChange={e => setFormReceita({...formReceita, categoria: e.target.value})} className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]">{CATEGORIAS_RECEITA.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Tipo</label><select value={formReceita.tipo} onChange={e => setFormReceita({...formReceita, tipo: e.target.value as any})} className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]">{TIPOS_RECEITA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              </div>
              {formReceita.tipo !== "avulso" && (
                <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Dia do recebimento (1-31)</label><input type="number" min="1" max="31" value={formReceita.dia_recebimento} onChange={e => setFormReceita({...formReceita, dia_recebimento: e.target.value})} className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" /></div>
              )}
              {formReceita.tipo === "recorrente" && (
                <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Quantos meses?</label><input type="number" min="1" max="60" value={formReceita.num_meses} onChange={e => setFormReceita({...formReceita, num_meses: e.target.value})} className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" /></div>
              )}
              {contas.length > 0 && (
                <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Conta (opcional)</label><select value={formReceita.conta_id} onChange={e => setFormReceita({...formReceita, conta_id: e.target.value})} className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"><option value="">Sem conta vinculada</option>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetFormReceita} className="flex-1 py-2 bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:bg-white/[0.07] dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{editandoReceita ? "Salvar" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
