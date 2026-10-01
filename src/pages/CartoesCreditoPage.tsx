import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Trash2, Pencil, Check, Plus, CreditCard, Receipt, Users, Repeat } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppContext } from "../context";
import { PageHeader } from "../components/ui/PageHeader";
import { SeletorMes } from "../components/ui/SeletorMes";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useGuidedTour, usePageTutorialHelpButton, useIsMobile } from "../hooks";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatCurrencyValue, parseCurrency, getMesFaturaCartao } from "../utils/calculations";
import { formatDinheiro, formatPercent, rotuloDia } from "../utils/dinheiro";
import { CORES_CARTAO, corDoCartao } from "../utils/cores";
import { TUTORIAL_TITLES } from "../utils/tutorial";
import { normalizarCategoria } from "../utils/categories";
import { toast } from "../components/ui/Toaster";
import { PageErrorState, PageLoadingState } from "../components/ui/AsyncState";
import { toActionableErrorMessage } from "../utils/feedbackMessages";
import type { CartaoCredito, CartaoCreditoForm, TransacaoCartao, ContaBancaria, MeuGasto, Gasto } from "../types";
import { Button } from "../components/ui/Button";
import { BalanceHero } from "../components/ui/BalanceHero";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Surface, SurfaceHeader } from "../components/ui/Surface";
import { ListGroup, ListRow } from "../components/ui/ListRow";
import { Pill } from "../components/ui/Pill";
import { PontoCategoria } from "../components/ui/PontoCategoria";
import { EmptyState } from "../components/ui/EmptyState";
import { MenuAcoes } from "../components/ui/MenuAcoes";
import { MoneyInput } from "../components/ui/MoneyInput";
import { FormSheet, Campo, Chip, Chips, MaisOpcoes, campoClasse } from "../components/ui/FormSheet";
import { useAcaoPrincipalDaPagina } from "../components/layout/AcaoPrincipalContext";

/** "2026-09-29" como data local — `new Date(string)` leria em UTC e voltaria um dia. */
const dataLocal = (iso: string) => {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia || 1);
};

interface CartoesTutorialStep {
  target: string;
  alvo: string;
  titulo: string;
  descricao: string;
  placement?: "above" | "below";
}

const CARTOES_TUTORIAL_KEY = "cartoes_credito_tutorial_seen_v1";

const CARTOES_TUTORIAL_STEPS: CartoesTutorialStep[] = [
  {
    target: "[data-tour='cartoes-header']",
    alvo: "Cabeçalho da aba",
    titulo: "Seus cartões",
    descricao:
      "Aqui você acompanha limites, faturas e transações dos cartões em uma visão consolidada ou individual.",
    placement: "below",
  },
  {
    target: "[data-tour='cartoes-lista']",
    alvo: "Lista de cartões",
    titulo: "Seleção de cartão",
    descricao:
      "Escolha entre visão geral (Tudo) ou um cartão específico para entrar em detalhes da fatura.",
  },
  {
    target: "[data-tour='cartoes-consolidado']",
    alvo: "Total consolidado",
    titulo: "Resumo geral",
    descricao:
      "No modo Tudo você vê limite total, usado e disponível com barra de consumo consolidada.",
  },
  {
    target: "[data-tour='cartoes-limites-grid']",
    alvo: "Limites por cartão",
    titulo: "Comparativo de cartões",
    descricao:
      "Use este bloco para comparar rapidamente fatura, limite usado e disponibilidade de cada cartão.",
  },
  {
    target: "[data-tour='cartoes-detalhes-fatura']",
    alvo: "Fatura do cartão",
    titulo: "Fatura mensal",
    descricao:
      "Ao selecionar um cartão, aqui você navega mês a mês e acompanha valor da fatura e status de quitação.",
  },
  {
    target: "[data-tour='cartoes-detalhes-transacoes']",
    alvo: "Transações do cartão",
    titulo: "Itens da fatura",
    descricao:
      "Veja todas as transações e gastos vinculados ao período da fatura, com status e categorias.",
  },
  {
    target: "[data-tour='cartoes-detalhes-limite']",
    alvo: "Uso do limite",
    titulo: "Ações do cartão",
    descricao:
      "Nesta área você monitora consumo do limite e pode editar, excluir cartão ou pagar a fatura.",
  },
  {
    target: "[data-tour='cartoes-help-button']",
    alvo: "Botão de ajuda",
    titulo: "Rever tutorial",
    descricao:
      "Clique no (?) para abrir novamente este guia da aba Cartões de Crédito.",
  },
];

export const CartoesCreditoPage = () => {
  const { user, setModalConfirm, getTotalPagoParcial, resumoMensal, mesVisualizacao } = useAppContext();
  
  // Usar os cartões do context que já carregam ou buscar locais para este componente? O componente já usa um estado local `cartoes` que não precisa se o AppContext fornece, mas vamos manter o fetchCartoes que existe aqui.
  
  const [cartoesState, setCartoesState] = useState<CartaoCredito[]>([]);
  const [transacoes, setTransacoes] = useState<TransacaoCartao[]>([]);
  const [meusGastos, setMeusGastos] = useState<MeuGasto[]>([]);
  const [gastosCompartilhados, setGastosCompartilhados] = useState<Gasto[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [cartaoSelecionado, setCartaoSelecionado] = useState<CartaoCredito | null>(null);

  // Modal cartão
  const [showFormCartao, setShowFormCartao] = useState(false);
  const [editandoCartao, setEditandoCartao] = useState<CartaoCredito | null>(null);
  const [formCartao, setFormCartao] = useState<CartaoCreditoForm>({
    nome: "", conta_id: "", dia_vencimento: "10", melhor_dia_compra: "10",
    limite: "", divida_inicial: "", cor: CORES_CARTAO[0],
  });

  // Modal pagar fatura
  const [showPagarFatura, setShowPagarFatura] = useState(false);
  const [valorPagamento, setValorPagamento] = useState("");
  const [contaPagamento, setContaPagamento] = useState("");
  const [pagamentosFatura, setPagamentosFatura] = useState<{cartao_id: string; mes: string; valor_pago: number; data_pagamento: string}[]>([]);

  // Fetches
  const fetchCartoes = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from("cartoes_credito").select("*").order("nome");
    setCartoesState(data || []);
  }, [user]);

  const fetchTransacoes = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from("transacoes_cartao").select("*").order("data", { ascending: false });
    setTransacoes(data || []);
  }, [user]);

  const fetchContas = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from("contas_bancarias").select("*").order("nome");
    setContas(data || []);
  }, [user]);

  const fetchMeusGastos = useCallback(async () => {
    if (!supabase || !user) return;
    try {
      const { data } = await supabase.from("meus_gastos").select("*");
      setMeusGastos((data || []).filter(g => g.cartao_id));
    } catch (err) {
      console.error("Erro ao buscar gastos:", err);
      setMeusGastos([]);
    }
  }, [user]);

  const fetchGastosCompartilhados = useCallback(async () => {
    if (!supabase || !user) return;
    try {
      const { data } = await supabase.from("gastos").select("*");
      setGastosCompartilhados((data || []).filter(g => g.cartao_id));
    } catch (err) {
      console.error("Erro ao buscar gastos compartilhados:", err);
      setGastosCompartilhados([]);
    }
  }, [user]);

  const fetchPagamentosFatura = useCallback(async () => {
    if (!supabase || !user) return;
    try {
      const { data } = await supabase.from("pagamentos_fatura").select("*");
      setPagamentosFatura((data || []).map(p => ({
        cartao_id: p.cartao_id,
        mes: p.mes,
        valor_pago: p.valor_pago,
        data_pagamento: p.created_at || "",
      })));
    } catch (err) {
      console.error("Erro ao buscar pagamentos:", err);
      setPagamentosFatura([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      setLoadError(null);
      Promise.all([fetchCartoes(), fetchTransacoes(), fetchContas(), fetchMeusGastos(), fetchGastosCompartilhados(), fetchPagamentosFatura()])
        .catch((err) => {
          setLoadError(toActionableErrorMessage(err, "Não foi possível carregar dados dos cartões."));
        })
        .finally(() => setLoading(false));
    }
  }, [user, fetchCartoes, fetchTransacoes, fetchContas, fetchMeusGastos, fetchGastosCompartilhados, fetchPagamentosFatura]);
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
  } = useGuidedTour<CartoesTutorialStep>({
    steps: CARTOES_TUTORIAL_STEPS,
    storageKey: CARTOES_TUTORIAL_KEY,
    ready: !loading,
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial de Cartões",
    ariaLabel: "Ver tutorial de Cartões",
    dataTour: "cartoes-help-button",
  });

  // Calculações
  // Verifica se uma data está dentro do período da fatura
  const estaNoPeríodoFatura = (dataStr: string, cartaoId: string) => {
    const cartao = cartoesState.find((c) => c.id === cartaoId);
    if (!cartao) return false;
    
    const melhorDia = cartao.melhor_dia_compra || cartao.dia_vencimento;
    
    const mesFatura = getMesFaturaCartao(dataStr, melhorDia, cartao.dia_vencimento);
    const mesFaturaStr = format(mesFatura, "yyyy-MM");
    const mesVisualizacaoStr = format(mesVisualizacao, "yyyy-MM");
    
    return mesFaturaStr === mesVisualizacaoStr;
  };

  const getTransacoesDoMes = (cartaoId: string) => {
    return transacoes.filter(t => t.cartao_id === cartaoId && estaNoPeríodoFatura(t.data, cartaoId));
  };

  // Pegar gastos do mês vinculados ao cartão (de meus_gastos)
  const getGastosDoMes = (cartaoId: string) => {
    return meusGastos.filter(g => {
      if (g.cartao_id !== cartaoId) return false;
      // Gastos fixos ativos aparecem sempre, desde que a fatura atual seja >= fatura de início
      if (g.categoria === "fixo" && g.ativo) {
        const cartao = cartoesState.find((c) => c.id === cartaoId);
        if (!cartao) return false;
        
        const melhorDia = cartao.melhor_dia_compra || cartao.dia_vencimento;
        const dataInicioFatura = getMesFaturaCartao(g.data, melhorDia, cartao.dia_vencimento);
        const dataInicioStr = format(dataInicioFatura, "yyyy-MM");
        const mesVisualizacaoStr = format(mesVisualizacao, "yyyy-MM");
        
        if (mesVisualizacaoStr >= dataInicioStr) {
          const isSuspenso = g.meses_suspensos?.includes(mesVisualizacaoStr);
          return !isSuspenso;
        }
        return false;
      }
      // Outros gastos filtram pelo período da fatura
      return estaNoPeríodoFatura(g.data, cartaoId);
    });
  };

  // Combinar transações + meus_gastos + gastos compartilhados para exibir
  const getTodasTransacoesDoMes = (cartaoId: string) => {
    const trans = getTransacoesDoMes(cartaoId).map(t => ({ ...t, origem: "transacao" as const }));
    const gastos = getGastosDoMes(cartaoId).map(g => ({
      id: g.id, descricao: g.descricao, valor: g.minha_parte || g.valor, 
      categoria: normalizarCategoria(g.categoria_gasto) || "Gasto",
      data: g.categoria === "fixo" ? format(mesVisualizacao, "yyyy-MM") + `-${String(Math.min(g.dia_vencimento || 1, new Date(mesVisualizacao.getFullYear(), mesVisualizacao.getMonth() + 1, 0).getDate())).padStart(2, "0")}` : g.data, 
      pago: g.pago, origem: "gasto" as const, pessoa: "",
    }));
    // Adicionar gastos compartilhados vinculados ao cartão (usando período de fatura)
    const mes = format(mesVisualizacao, "yyyy-MM");
    const faturaFoiPaga = pagamentosFatura.some(p => p.cartao_id === cartaoId && p.mes === mes);
    
    const compartilhados = gastosCompartilhados.filter(g => g.cartao_id === cartaoId && estaNoPeríodoFatura(g.data_inicio, cartaoId)).map(g => {
      // Verificar status de pagamento da pessoa
      const resumoPessoa = resumoMensal.find(r => r.pessoa === g.pessoa);
      const totalDevido = resumoPessoa?.total || 0;
      const totalPago = getTotalPagoParcial(g.pessoa);
      const percentualPago = totalDevido > 0 ? Math.min(totalPago / totalDevido, 1) : 0;
      const valorItem = g.valor_total / g.num_parcelas;
      const valorPagoItem = valorItem * percentualPago;
      const valorRestante = valorItem - valorPagoItem;
      const pessoaQuitada = totalDevido > 0 && totalPago >= totalDevido;
      
      // Se a fatura foi paga, todos os itens são considerados pagos (você pagou o banco)
      const itemPago = faturaFoiPaga || pessoaQuitada;
      const itemPagoParcial = !faturaFoiPaga && percentualPago > 0 && percentualPago < 1;
      
      return {
        id: g.id, 
        descricao: `${g.descricao} (${g.pessoa})`, 
        valor: valorItem,
        valorPago: valorPagoItem,
        valorRestante: valorRestante,
        percentualPago: percentualPago,
        categoria: normalizarCategoria(g.categoria) || "Gasto",
        data: g.data_inicio, 
        pago: itemPago, 
        pagoParcial: itemPagoParcial,
        origem: "compartilhado" as const, 
        pessoa: g.pessoa,
      };
    });
    return [...trans, ...gastos, ...compartilhados].sort((a, b) => b.data.localeCompare(a.data));
  };

  // Verificar se gasto original é fixo
  const isGastoFixo = (gastoId: string) => {
    const gasto = meusGastos.find(g => g.id === gastoId);
    return gasto?.categoria === "fixo";
  };

  // Verificar quanto foi pago da fatura deste mês
  const getPagamentoFaturaMes = (cartaoId: string) => {
    const mes = format(mesVisualizacao, "yyyy-MM");
    const pagamento = pagamentosFatura.find(p => p.cartao_id === cartaoId && p.mes === mes);
    return pagamento?.valor_pago || 0;
  };

  const getFaturaCartao = (cartaoId: string) => {
    const trans = getTransacoesDoMes(cartaoId);
    const gastos = getGastosDoMes(cartaoId);
    const compartilhados = gastosCompartilhados.filter(g => g.cartao_id === cartaoId && estaNoPeríodoFatura(g.data_inicio, cartaoId));
    // Só somar transações e gastos NÃO pagos na fatura pendente
    const totalTrans = trans.filter(t => !t.pago).reduce((sum, t) => sum + t.valor, 0);
    const totalGastos = gastos.filter(g => !g.pago).reduce((sum, g) => sum + (g.minha_parte || g.valor), 0);
    // Calcular valor RESTANTE de gastos compartilhados (descontando proporção já paga pela pessoa)
    const totalCompartilhados = compartilhados.reduce((sum, g) => {
      const resumoPessoa = resumoMensal.find(r => r.pessoa === g.pessoa);
      const totalDevido = resumoPessoa?.total || 0;
      const totalPago = getTotalPagoParcial(g.pessoa);
      const percentualPago = totalDevido > 0 ? Math.min(totalPago / totalDevido, 1) : 0;
      const valorItem = g.valor_total / g.num_parcelas;
      const valorRestante = valorItem * (1 - percentualPago);
      return sum + valorRestante;
    }, 0);
    
    const totalBruto = totalTrans + totalGastos + totalCompartilhados;
    // Descontar valor já pago da fatura
    const valorPagoFatura = getPagamentoFaturaMes(cartaoId);
    return Math.max(0, totalBruto - valorPagoFatura);
  };

  const getLimiteUsado = (cartaoId: string) => {
    const cartao = cartoesState.find(c => c.id === cartaoId);
    if (!cartao) return 0;
    const dividaInicial = cartao.divida_inicial || 0;
    // Transações não pagas
    const transNaoPagas = transacoes.filter(t => t.cartao_id === cartaoId && !t.pago);
    const totalTrans = transNaoPagas.reduce((sum, t) => sum + t.valor, 0);
    // Gastos (meus_gastos) não pagos vinculados ao cartão
    const gastosNaoPagos = meusGastos.filter(g => {
      if (g.cartao_id !== cartaoId || g.pago) return false;
      
      // Para gasto fixo, só consome limite se a data da fatura atual >= data da fatura de início
      if (g.categoria === "fixo") {
        const melhorDia = cartao.melhor_dia_compra || cartao.dia_vencimento;
        const dataInicioFatura = getMesFaturaCartao(g.data, melhorDia, cartao.dia_vencimento);
        const dataHojeFatura = getMesFaturaCartao(format(new Date(), "yyyy-MM-dd"), melhorDia, cartao.dia_vencimento);
        
        const dataInicioStr = format(dataInicioFatura, "yyyy-MM");
        const dataHojeStr = format(dataHojeFatura, "yyyy-MM");
        
        if (dataHojeStr < dataInicioStr) return false;
      }
      return true;
    });
    const totalGastos = gastosNaoPagos.reduce((sum, g) => sum + (g.minha_parte || g.valor), 0);
    // Gastos compartilhados vinculados ao cartão (calculando valor RESTANTE)
    const compartilhadosCartao = gastosCompartilhados.filter(g => {
      if (g.cartao_id !== cartaoId) return false;
      
      if (g.recorrente) {
        const melhorDia = cartao.melhor_dia_compra || cartao.dia_vencimento;
        const dataInicioFatura = getMesFaturaCartao(g.data_inicio, melhorDia, cartao.dia_vencimento);
        const dataHojeFatura = getMesFaturaCartao(format(new Date(), "yyyy-MM-dd"), melhorDia, cartao.dia_vencimento);
        
        const dataInicioStr = format(dataInicioFatura, "yyyy-MM");
        const dataHojeStr = format(dataHojeFatura, "yyyy-MM");
        
        if (dataHojeStr < dataInicioStr) return false;
      }
      return true;
    });
    const totalCompartilhados = compartilhadosCartao.reduce((sum, g) => {
      const resumoPessoa = resumoMensal.find(r => r.pessoa === g.pessoa);
      const totalDevido = resumoPessoa?.total || 0;
      const totalPago = getTotalPagoParcial(g.pessoa);
      const percentualPago = totalDevido > 0 ? Math.min(totalPago / totalDevido, 1) : 0;
      const valorRestante = g.valor_total * (1 - percentualPago);
      return sum + valorRestante;
    }, 0);
    
    const totalBruto = dividaInicial + totalTrans + totalGastos + totalCompartilhados;
    // Descontar pagamentos de fatura
    const totalPagoFatura = pagamentosFatura.filter(p => p.cartao_id === cartaoId).reduce((sum, p) => sum + p.valor_pago, 0);
    return Math.max(0, totalBruto - totalPagoFatura);
  };

  const getTotalConsolidado = () => {
    const limiteTotal = cartoesState.reduce((sum, c) => sum + (c.limite || 0), 0);
    const usado = cartoesState.reduce((sum, c) => sum + getLimiteUsado(c.id), 0);
    return { limiteTotal, usado, disponivel: limiteTotal - usado };
  };

  // CRUD Cartão
  const handleSubmitCartao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;
    setSaving(true);
    try {
      const dados = {
        nome: formCartao.nome.trim(),
        conta_id: formCartao.conta_id || null,
        dia_vencimento: parseInt(formCartao.dia_vencimento),
        melhor_dia_compra: parseInt(formCartao.melhor_dia_compra) || null,
        limite: parseCurrency(formCartao.limite),
        divida_inicial: formCartao.divida_inicial ? parseCurrency(formCartao.divida_inicial) : 0,
        cor: formCartao.cor,
      };
      if (editandoCartao) {
        await supabase.from("cartoes_credito").update(dados).eq("id", editandoCartao.id);
      } else {
        await supabase.from("cartoes_credito").insert({ ...dados, user_id: user.id });
      }
      await fetchCartoes();
      resetFormCartao();
      toast.success(editandoCartao ? "Cartão atualizado com sucesso!" : "Cartão adicionado com sucesso!");
    } catch (err) {
      toast.error(toActionableErrorMessage(err, "Não foi possível salvar o cartão."));
    } finally { setSaving(false); }
  };

  const handleEditCartao = (c: CartaoCredito) => {
    setFormCartao({
      nome: c.nome, conta_id: c.conta_id || "", dia_vencimento: String(c.dia_vencimento),
      melhor_dia_compra: String(c.melhor_dia_compra || ""), limite: formatCurrencyValue(c.limite),
      divida_inicial: c.divida_inicial ? formatCurrencyValue(c.divida_inicial) : "",
      cor: c.cor || CORES_CARTAO[0],
    });
    setEditandoCartao(c);
    setShowFormCartao(true);
  };

  const handleDeleteCartao = (id: string, nome: string) => {
    setModalConfirm({
      show: true, titulo: "Excluir cartão", mensagem: `Excluir "${nome}"? Transações serão removidas.`,
      onConfirm: async () => {
        if (!supabase) return;
        const { error: transErr } = await supabase.from("transacoes_cartao").delete().eq("cartao_id", id);
        if (transErr) {
          toast.error(toActionableErrorMessage(transErr, "Não foi possível excluir as transações do cartão."));
          throw transErr;
        }
        const { error: cardErr } = await supabase.from("cartoes_credito").delete().eq("id", id);
        if (cardErr) {
          toast.error(toActionableErrorMessage(cardErr, "Não foi possível excluir o cartão."));
          throw cardErr;
        }
        await fetchCartoes();
        await fetchTransacoes();
        if (cartaoSelecionado?.id === id) setCartaoSelecionado(null);
      },
    });
  };

  const resetFormCartao = () => {
    setFormCartao({ nome: "", conta_id: "", dia_vencimento: "10", melhor_dia_compra: "10", limite: "", divida_inicial: "", cor: CORES_CARTAO[0] });
    setShowFormCartao(false);
    setEditandoCartao(null);
  };

  const handleDeleteTransacao = (id: string) => {
    setModalConfirm({
      show: true, titulo: "Excluir transação", mensagem: "Excluir esta transação?",
      onConfirm: async () => {
        if (!supabase) return;
        const { error } = await supabase.from("transacoes_cartao").delete().eq("id", id);
        if (error) {
          toast.error(toActionableErrorMessage(error, "Não foi possível excluir a transação."));
          throw error;
        }
        await fetchTransacoes();
      },
    });
  };

  // Pagar fatura (total ou parcial)
  const handlePagarFatura = async () => {
    if (!supabase || !cartaoSelecionado || !contaPagamento) return;
    setSaving(true);
    try {
      const valorPago = parseCurrency(valorPagamento);
      const mesFatura = format(mesVisualizacao, "yyyy-MM");
      
      // Buscar conta e verificar saldo
      const conta = contas.find(c => c.id === contaPagamento);
      if (!conta) return;
      
      // O registro do pagamento é o que tira o valor da conta (utils/saldo).
      // Registrar pagamento de fatura
      await supabase.from("pagamentos_fatura").insert({
        cartao_id: cartaoSelecionado.id,
        mes: mesFatura,
        valor_pago: valorPago,
        conta_id: contaPagamento,
        user_id: user?.id,
      });
      
      // Atualizar estado local de pagamentos
      setPagamentosFatura([...pagamentosFatura, {
        cartao_id: cartaoSelecionado.id,
        mes: mesFatura,
        valor_pago: valorPago,
        data_pagamento: new Date().toISOString(),
      }]);
      
      await fetchContas();
      setShowPagarFatura(false);
      setValorPagamento("");
      setContaPagamento("");
      toast.success("Pagamento da fatura registrado com sucesso!");
    } catch (err) {
      toast.error(toActionableErrorMessage(err, "Não foi possível registrar o pagamento da fatura."));
    } finally { setSaving(false); }
  };

  // Desfazer pagamento de fatura
  const handleDesfazerPagamento = async () => {
    if (!supabase || !cartaoSelecionado) return;
    const mesFatura = format(mesVisualizacao, "yyyy-MM");
    setModalConfirm({
      show: true, titulo: "Desfazer pagamento", confirmLabel: "Desfazer", mensagem: "Deseja desfazer o pagamento desta fatura? O valor volta para a conta.",
      onConfirm: async () => {
        if (!supabase) return;
        setSaving(true);
        try {
          // Apagar o registro devolve o valor à conta (utils/saldo).
          // Remover registro de pagamento
          await supabase.from("pagamentos_fatura")
            .delete()
            .eq("cartao_id", cartaoSelecionado.id)
            .eq("mes", mesFatura);
          
          // Atualizar estados
          setPagamentosFatura(pagamentosFatura.filter(p => 
            !(p.cartao_id === cartaoSelecionado.id && p.mes === mesFatura)
          ));
          await fetchContas();
          toast.success("Pagamento da fatura desfeito com sucesso!");
        } catch (err) {
          toast.error(toActionableErrorMessage(err, "Não foi possível desfazer o pagamento da fatura."));
          throw err;
        } finally { setSaving(false); }
      },
    });
  };

  // Verificar se a fatura do mês está quitada (verificando na tabela de pagamentos)
  const faturaQuitada = (cartaoId: string) => {
    const mesFatura = format(mesVisualizacao, "yyyy-MM");
    const faturaTotalVal = getFaturaCartao(cartaoId);
    const pagamentoDoMes = pagamentosFatura.find(p => p.cartao_id === cartaoId && p.mes === mesFatura);
    return pagamentoDoMes ? pagamentoDoMes.valor_pago >= faturaTotalVal : false;
  };

  const consolidado = getTotalConsolidado();

  const isMobile = useIsMobile();
  // "Pagar fatura" ou "Novo cartão": o botão laranja desta tela no desktop.
  useAcaoPrincipalDaPagina(!isMobile);

  // O atalho "Pagar fatura" do Início chega com `?pagar=1`: abre o primeiro
  // cartão com fatura em aberto já no formulário de pagamento.
  // A conta do pagamento já vem marcada quando dá para saber: a vinculada ao
  // cartão ou a única cadastrada. Sem isso o botão ficava cinza sem dizer o que faltava.
  const contaSugerida = (cartao: CartaoCredito) =>
    contas.find((c) => c.id === cartao.conta_id)?.id || (contas.length === 1 ? contas[0].id : "");
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (loading || searchParams.get("pagar") !== "1") return;
    const comFatura = cartoesState.find((c) => getFaturaCartao(c.id) > 0 && !faturaQuitada(c.id));
    if (comFatura) {
      setCartaoSelecionado(comFatura);
      setValorPagamento(formatCurrencyValue(getFaturaCartao(comFatura.id)));
      setContaPagamento(contaSugerida(comFatura));
      setShowPagarFatura(true);
    }
    setSearchParams({}, { replace: true });
    // Só reage ao parâmetro e ao fim do carregamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams]);

  if (loading) {
    return <PageLoadingState title="Carregando cartões" />;
  }

  if (loadError) {
    return (
      <PageErrorState
        title="Não foi possível carregar cartões"
        description={loadError}
        onAction={() => {
          setLoading(true);
          setLoadError(null);
          Promise.all([fetchCartoes(), fetchTransacoes(), fetchContas(), fetchMeusGastos(), fetchGastosCompartilhados(), fetchPagamentosFatura()])
            .catch((err) => setLoadError(toActionableErrorMessage(err, "Não foi possível carregar dados dos cartões.")))
            .finally(() => setLoading(false));
        }}
        actionLabel="Tentar de novo"
      />
    );
  }

  const nomeDoMes = format(mesVisualizacao, "MMMM", { locale: ptBR });
  const faturaAberta =
    !!cartaoSelecionado && getFaturaCartao(cartaoSelecionado.id) > 0 && !faturaQuitada(cartaoSelecionado.id);

  const abrirNovoCartao = () => {
    resetFormCartao();
    setShowFormCartao(true);
  };
  const abrirPagarFatura = () => {
    if (!cartaoSelecionado) return;
    setValorPagamento(formatCurrencyValue(getFaturaCartao(cartaoSelecionado.id)));
    setContaPagamento(contaSugerida(cartaoSelecionado));
    setShowPagarFatura(true);
  };

  const legendaLimite = (usado: number, limite: number) => [
    { rotulo: "Usado", valor: formatCurrency(usado) },
    {
      rotulo: "Disponível",
      valor: formatDinheiro(limite - usado),
      tom: limite - usado < 0 ? ("perigo" as const) : ("normal" as const),
    },
    { rotulo: "Limite", valor: formatCurrency(limite) },
  ];

  const faturasEmAberto = cartoesState.reduce((sum, c) => sum + getFaturaCartao(c.id), 0);
  // Estourar o limite é o número perigoso da tela: sobe para junto do destaque.
  const acimaDoLimite = cartoesState.filter((c) => (c.limite || 0) > 0 && getLimiteUsado(c.id) > (c.limite || 0)).length;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="cartoes-header"
        title="Cartões"
        description="Faturas, limites e transações de cada cartão."
        action={
          <>
            <SeletorMes />
            {/* Um botão laranja: "Pagar fatura" quando o cartão aberto tem
                fatura em aberto; senão, "Novo cartão". No celular o laranja é
                o "+" da barra, e estes ficam neutros. */}
            <Button
              variante={faturaAberta || isMobile ? "secundario" : "principal"}
              onClick={abrirNovoCartao}
              icone={<Plus className="w-4 h-4" strokeWidth={1.75} />}
            >
              Novo cartão
            </Button>
            {faturaAberta && (
              <Button
                variante={isMobile ? "secundario" : "principal"}
                onClick={abrirPagarFatura}
                icone={<Check className="w-4 h-4" strokeWidth={1.75} />}
              >
                Pagar fatura
              </Button>
            )}
          </>
        }
      />

      {/* Seletor de cartões: retângulos com o ponto do banco. No celular rola
          na horizontal com snap, e o próximo cartão aparece pela metade. */}
      <div
        className="sem-barra -mx-4 px-4 md:mx-0 md:px-0 scroll-px-4 flex gap-2 overflow-x-auto snap-x snap-mandatory"
        data-tour="cartoes-lista"
        role="group"
        aria-label="Cartões"
      >
        <button
          type="button"
          onClick={() => setCartaoSelecionado(null)}
          aria-pressed={cartaoSelecionado === null}
          className={`snap-start shrink-0 w-[168px] min-h-[104px] p-4 rounded text-left transition-colors ${
            cartaoSelecionado === null ? "bg-surface-1 ring-1 ring-inset ring-fg-3" : "bg-surface-1 hover:bg-surface-2"
          }`}
        >
          <span className="block text-sm text-fg">Todos</span>
          <span className="block valor text-lg text-fg mt-1.5">{formatCurrency(faturasEmAberto)}</span>
          <span className="block text-xs text-fg-2 mt-1">
            {cartoesState.length} {cartoesState.length === 1 ? "cartão" : "cartões"}
          </span>
        </button>
        {cartoesState.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCartaoSelecionado(c)}
            aria-pressed={cartaoSelecionado?.id === c.id}
            className={`snap-start shrink-0 w-[168px] min-h-[104px] p-4 rounded text-left transition-colors ${
              cartaoSelecionado?.id === c.id ? "bg-surface-1 ring-1 ring-inset ring-fg-3" : "bg-surface-1 hover:bg-surface-2"
            }`}
          >
            <span className="flex items-baseline gap-2 text-sm text-fg break-words leading-snug">
              <PontoCategoria cor={corDoCartao(c.cor)} className="shrink-0 -translate-y-px" />
              <span className="min-w-0">{c.nome}</span>
            </span>
            <span className="block valor text-lg text-fg mt-1.5">{formatCurrency(getFaturaCartao(c.id))}</span>
            <span className="block text-xs text-fg-2 mt-1">vence dia {c.dia_vencimento}</span>
          </button>
        ))}
      </div>

      {/* Todos: faturas em aberto e o limite somado de todos os cartões */}
      {cartaoSelecionado === null && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
          <div className="space-y-6">
            <BalanceHero
              rotulo="Faturas em aberto"
              aoLado={
                acimaDoLimite > 0 ? (
                  <Pill tom="perigo">
                    {acimaDoLimite === 1 ? "1 cartão acima do limite" : `${acimaDoLimite} cartões acima do limite`}
                  </Pill>
                ) : undefined
              }
              valor={faturasEmAberto}
              perigoSeNegativo={false}
              contexto={
                <>
                  Soma das faturas de <span>{nomeDoMes}</span> em {cartoesState.length}{" "}
                  {cartoesState.length === 1 ? "cartão" : "cartões"}.
                </>
              }
            />
            <div data-tour="cartoes-consolidado">
              <p className="text-sm text-fg-2 mb-3">Limite somado</p>
              <ProgressBar
                valor={consolidado.usado}
                maximo={consolidado.limiteTotal}
                rotulo={`Limite somado: ${formatPercent(consolidado.limiteTotal > 0 ? consolidado.usado / consolidado.limiteTotal : 0)} usado`}
                legenda={legendaLimite(consolidado.usado, consolidado.limiteTotal)}
              />
            </div>
          </div>

          <Surface as="section" data-tour="cartoes-limites-grid">
            <SurfaceHeader titulo="Por cartão" className="mb-1" />
            {cartoesState.length === 0 ? (
              <EmptyState
                Icone={CreditCard}
                frase="Nenhum cartão cadastrado."
                acao={<Button onClick={abrirNovoCartao}>Novo cartão</Button>}
                compacto
              />
            ) : (
              <ListGroup>
                {cartoesState.map((c) => {
                  const usado = getLimiteUsado(c.id);
                  const limite = c.limite || 0;
                  return (
                    <ListRow
                      key={c.id}
                      icone={<PontoCategoria cor={corDoCartao(c.cor)} />}
                      titulo={c.nome}
                      meta={`vence dia ${c.dia_vencimento} · ${formatPercent(limite > 0 ? usado / limite : 0)} do limite`}
                      valor={formatCurrency(getFaturaCartao(c.id))}
                      onAbrir={() => setCartaoSelecionado(c)}
                      rodape={
                        <div className="pl-12">
                          <ProgressBar valor={usado} maximo={limite} rotulo={`${c.nome}: uso do limite`} />
                        </div>
                      }
                    />
                  );
                })}
              </ListGroup>
            )}
          </Surface>
        </div>
      )}

      {/* Cartão selecionado */}
      {cartaoSelecionado &&
        (() => {
          const usado = getLimiteUsado(cartaoSelecionado.id);
          const limite = cartaoSelecionado.limite || 0;
          const fatura = getFaturaCartao(cartaoSelecionado.id);
          const quitada = faturaQuitada(cartaoSelecionado.id);
          const itens = getTodasTransacoesDoMes(cartaoSelecionado.id);

          // Dias até o vencimento — só faz sentido olhando o mês corrente.
          const hoje = new Date();
          const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
          const ultimoDiaMes = new Date(mesVisualizacao.getFullYear(), mesVisualizacao.getMonth() + 1, 0).getDate();
          const dataVencimento = new Date(
            mesVisualizacao.getFullYear(),
            mesVisualizacao.getMonth(),
            Math.min(cartaoSelecionado.dia_vencimento, ultimoDiaMes),
          );
          const diasAteVencimento = Math.round((dataVencimento.getTime() - hojeZero.getTime()) / 86400000);
          const mostraContagem = format(mesVisualizacao, "yyyy-MM") === format(hoje, "yyyy-MM") && diasAteVencimento >= 0;

          // Itens agrupados por dia, do mais recente para o mais antigo.
          const porDia: { data: string; itens: typeof itens }[] = [];
          itens.forEach((t) => {
            const dia = t.data.length === 7 ? `${t.data}-01` : t.data;
            const grupo = porDia.find((g) => g.data === dia);
            if (grupo) grupo.itens.push(t);
            else porDia.push({ data: dia, itens: [t] });
          });

          return (
            <div className="grid grid-cols-1 lg:[grid-template-columns:minmax(0,1fr)_340px] gap-6 items-start">
              <div className="space-y-6 min-w-0">
                {/* Fatura em destaque */}
                <div data-tour="cartoes-detalhes-fatura">
                  <BalanceHero
                    rotulo={
                      <span className="inline-flex items-center gap-2">
                        <PontoCategoria cor={corDoCartao(cartaoSelecionado.cor)} />
                        {cartaoSelecionado.nome} · fatura de {nomeDoMes}
                      </span>
                    }
                    aoLado={
                      <span className="inline-flex flex-wrap gap-1.5">
                        {limite > 0 && usado > limite && <Pill tom="perigo">acima do limite</Pill>}
                        {quitada ? (
                          <Pill>quitada</Pill>
                        ) : mostraContagem && diasAteVencimento <= 5 ? (
                          <Pill tom="atencao">
                            {diasAteVencimento === 0 ? "vence hoje" : `vence em ${diasAteVencimento} ${diasAteVencimento === 1 ? "dia" : "dias"}`}
                          </Pill>
                        ) : null}
                      </span>
                    }
                    valor={fatura}
                    perigoSeNegativo={false}
                    contexto={
                      <>
                        Vence dia {cartaoSelecionado.dia_vencimento}
                        {cartaoSelecionado.melhor_dia_compra
                          ? ` · melhor dia para comprar: ${cartaoSelecionado.melhor_dia_compra}`
                          : ""}
                        {quitada && (
                          <>
                            {" · "}
                            <button
                              type="button"
                              onClick={handleDesfazerPagamento}
                              className="inline-flex items-center min-h-[44px] -my-3 md:min-h-0 md:my-0 underline underline-offset-2 hover:text-fg transition-colors"
                            >
                              Desfazer pagamento
                            </button>
                          </>
                        )}
                      </>
                    }
                  />
                </div>

                {/* Limite */}
                <div data-tour="cartoes-detalhes-limite">
                  <p className="text-sm text-fg-2 mb-3">Limite</p>
                  <ProgressBar
                    valor={usado}
                    maximo={limite}
                    rotulo={`Limite de ${cartaoSelecionado.nome}: ${formatPercent(limite > 0 ? usado / limite : 0)} usado`}
                    legenda={legendaLimite(usado, limite)}
                  />
                </div>

                {/* Transações da fatura */}
                <Surface as="section" data-tour="cartoes-detalhes-transacoes">
                  <SurfaceHeader
                    titulo="Transações da fatura"
                    className="mb-0"
                    acao={
                      <span className="tabular-nums text-xs text-fg-3">
                        {itens.length} {itens.length === 1 ? "item" : "itens"}
                      </span>
                    }
                  />
                  {cartaoSelecionado.divida_inicial && cartaoSelecionado.divida_inicial > 0 ? (
                    <div className="flex items-center justify-between gap-3 mt-3 px-3 py-2.5 bg-surface-2 rounded-sm text-sm">
                      <span className="text-fg-2">Saldo anterior</span>
                      <span className="valor text-fg">{formatCurrency(cartaoSelecionado.divida_inicial)}</span>
                    </div>
                  ) : null}
                  {itens.length === 0 ? (
                    <EmptyState Icone={Receipt} frase="Nenhuma transação nesta fatura." compacto />
                  ) : (
                    porDia.map(({ data, itens: doDia }) => (
                      <ListGroup key={data} titulo={rotuloDia(dataLocal(data))}>
                        {doDia.map((t) => {
                          const fixo = t.origem === "gasto" && isGastoFixo(t.id);
                          const compartilhado = t.origem === "compartilhado";
                          const parcial = compartilhado && t.pagoParcial;
                          return (
                            <ListRow
                              key={`${t.origem}-${t.id}`}
                              icone={
                                compartilhado ? (
                                  <Users className="w-4 h-4" strokeWidth={1.5} />
                                ) : fixo ? (
                                  <Repeat className="w-4 h-4" strokeWidth={1.5} />
                                ) : (
                                  <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                                )
                              }
                              titulo={t.descricao}
                              meta={
                                <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                                  <span>{t.categoria}</span>
                                  {fixo && <Pill>fixo</Pill>}
                                  {compartilhado && !t.pago && !parcial && <Pill>emprestado · {t.pessoa}</Pill>}
                                  {parcial && <Pill tom="atencao">pagou {formatCurrency(t.valorPago || 0)}</Pill>}
                                </span>
                              }
                              valor={formatDinheiro(-t.valor)}
                              subvalor={parcial ? `falta ${formatCurrency(t.valorRestante || 0)}` : undefined}
                              pago={t.pago}
                              acoes={
                                t.origem === "transacao"
                                  ? [
                                      {
                                        rotulo: "Excluir",
                                        icone: <Trash2 className="w-4 h-4" strokeWidth={1.5} />,
                                        onClick: () => handleDeleteTransacao(t.id),
                                        tom: "perigo",
                                      },
                                    ]
                                  : undefined
                              }
                            />
                          );
                        })}
                      </ListGroup>
                    ))
                  )}
                </Surface>
              </div>

              {/* Este cartão */}
              <Surface as="section">
                <SurfaceHeader
                  titulo="Este cartão"
                  acao={
                    <MenuAcoes
                      titulo={cartaoSelecionado.nome}
                      acoes={[
                        {
                          rotulo: "Editar",
                          icone: <Pencil className="w-4 h-4" strokeWidth={1.5} />,
                          onClick: () => handleEditCartao(cartaoSelecionado),
                        },
                        {
                          rotulo: "Excluir",
                          icone: <Trash2 className="w-4 h-4" strokeWidth={1.5} />,
                          onClick: () => handleDeleteCartao(cartaoSelecionado.id, cartaoSelecionado.nome),
                          tom: "perigo",
                        },
                      ]}
                    />
                  }
                />
                <dl className="text-sm">
                  {[
                    { rotulo: "Vencimento", valor: `dia ${cartaoSelecionado.dia_vencimento}` },
                    {
                      rotulo: "Melhor dia para comprar",
                      valor: cartaoSelecionado.melhor_dia_compra ? `dia ${cartaoSelecionado.melhor_dia_compra}` : "não definido",
                    },
                    { rotulo: "Dívida inicial", valor: formatCurrency(cartaoSelecionado.divida_inicial || 0) },
                    { rotulo: "Limite", valor: formatCurrency(limite) },
                  ].map((l) => (
                    <div key={l.rotulo} className="flex items-baseline justify-between gap-4 py-2 border-b border-line last:border-b-0">
                      <dt className="text-fg-2">{l.rotulo}</dt>
                      <dd className="valor text-fg">{l.valor}</dd>
                    </div>
                  ))}
                </dl>
              </Surface>
            </div>
          );
        })()}

      <GuidedTourOverlay
        show={showTutorial}
        tutorialTitle={TUTORIAL_TITLES.cartoes}
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

      {/* Novo / editar cartão */}
      <FormSheet
        aberto={showFormCartao}
        titulo={editandoCartao ? "Editar cartão" : "Novo cartão"}
        onFechar={resetFormCartao}
        onEnviar={() => handleSubmitCartao({ preventDefault() {} } as React.FormEvent)}
        rotuloEnviar={editandoCartao ? "Salvar alterações" : "Criar cartão"}
        enviando={saving}
        podeEnviar={!!formCartao.nome.trim() && !!formCartao.limite && !!formCartao.dia_vencimento}
        valor={
          <div>
            <MoneyInput
              tamanho="heroi"
              value={formCartao.limite}
              onChange={(limite) => setFormCartao({ ...formCartao, limite })}
              aria-label="Limite"
            />
            <p className="mt-2 text-center text-xs text-fg-3">Limite</p>
          </div>
        }
      >
        <Campo rotulo="Nome" htmlFor="cartao-nome">
          <input
            id="cartao-nome"
            data-autofocus
            type="text"
            value={formCartao.nome}
            onChange={(e) => setFormCartao({ ...formCartao, nome: e.target.value })}
            placeholder="Ex: Nubank, Inter"
            className={campoClasse}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Dia do vencimento" htmlFor="cartao-vencimento">
            <input
              id="cartao-vencimento"
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              value={formCartao.dia_vencimento}
              onChange={(e) => setFormCartao({ ...formCartao, dia_vencimento: e.target.value })}
              className={`${campoClasse} valor`}
            />
          </Campo>
          <Campo rotulo="Melhor dia de compra" htmlFor="cartao-melhor-dia">
            <input
              id="cartao-melhor-dia"
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              value={formCartao.melhor_dia_compra}
              onChange={(e) => setFormCartao({ ...formCartao, melhor_dia_compra: e.target.value })}
              className={`${campoClasse} valor`}
            />
          </Campo>
        </div>
        <Campo rotulo="Cor">
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Cor do cartão">
            {CORES_CARTAO.map((cor) => {
              const ativa = corDoCartao(formCartao.cor) === cor;
              return (
                <button
                  key={cor}
                  type="button"
                  role="radio"
                  aria-checked={ativa}
                  aria-label={`Cor ${CORES_CARTAO.indexOf(cor) + 1}`}
                  onClick={() => setFormCartao({ ...formCartao, cor })}
                  className={`w-11 h-11 md:w-9 md:h-9 rounded-sm transition-shadow ${ativa ? "ring-2 ring-fg ring-offset-2 ring-offset-surface-1" : ""}`}
                  style={{ backgroundColor: cor }}
                />
              );
            })}
          </div>
        </Campo>
        <MaisOpcoes abertoInicial={!!formCartao.divida_inicial}>
          <Campo rotulo="Dívida inicial" htmlFor="cartao-divida" dica="O que já estava na fatura antes de você começar a usar o Hedge.">
            <MoneyInput
              id="cartao-divida"
              value={formCartao.divida_inicial}
              onChange={(divida_inicial) => setFormCartao({ ...formCartao, divida_inicial })}
            />
          </Campo>
        </MaisOpcoes>
      </FormSheet>

      {/* Pagar fatura */}
      <FormSheet
        aberto={showPagarFatura && !!cartaoSelecionado}
        titulo="Pagar fatura"
        aviso={
          cartaoSelecionado ? (
            <>
              {cartaoSelecionado.nome} · fatura de {nomeDoMes}:{" "}
              <span className="valor">{formatCurrency(getFaturaCartao(cartaoSelecionado.id))}</span>
            </>
          ) : undefined
        }
        onFechar={() => setShowPagarFatura(false)}
        onEnviar={handlePagarFatura}
        rotuloEnviar="Confirmar pagamento"
        enviando={saving}
        podeEnviar={!!contaPagamento && !!valorPagamento}
        valor={
          <MoneyInput
            tamanho="heroi"
            value={valorPagamento}
            onChange={setValorPagamento}
            aria-label="Valor pago"
            data-autofocus
          />
        }
      >
        {cartaoSelecionado && (
          <Chips>
            <Chip
              ativo={false}
              onClick={() => setValorPagamento(formatCurrencyValue(getFaturaCartao(cartaoSelecionado.id)))}
            >
              Fatura inteira · <span className="valor">{formatCurrency(getFaturaCartao(cartaoSelecionado.id))}</span>
            </Chip>
          </Chips>
        )}
        <Campo rotulo="Sai de qual conta">
          {contas.length > 0 ? (
            <Chips>
              {contas.map((c) => (
                <Chip key={c.id} ativo={contaPagamento === c.id} onClick={() => setContaPagamento(c.id)}>
                  {c.nome}
                </Chip>
              ))}
            </Chips>
          ) : (
            <p className="text-sm text-fg-2">Cadastre uma conta em Contas e receitas para pagar a fatura.</p>
          )}
        </Campo>
      </FormSheet>
    </div>
  );
};
