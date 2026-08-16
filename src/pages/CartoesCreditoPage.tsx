import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, Edit2, X, Calendar, CalendarDays, Check, Plus, History, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppContext } from "../context";
import { PageHeader } from "../components/ui/PageHeader";
import { SeletorMes } from "../components/ui/SeletorMes";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatCurrencyInput, formatCurrencyValue, parseCurrency, getMesFaturaCartao } from "../utils/calculations";
import { TUTORIAL_TITLES } from "../utils/tutorial";
import { normalizarCategoria } from "../utils/categories";
import { toast } from "../components/ui/Toaster";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../components/ui/AsyncState";
import { Valor } from "../components/ui/Valor";
import { toActionableErrorMessage } from "../utils/feedbackMessages";

import type { CartaoCredito, CartaoCreditoForm, TransacaoCartao, ContaBancaria, MeuGasto, Gasto } from "../types";
import { Rotulo } from "../components/ui/Rotulo";
import { Card } from "../components/ui/Card";
import { LinhaLista, LISTA_CLASSES } from "../components/ui/LinhaLista";

/**
 * Cor do cartão = identidade do banco (dado do usuário): vive no dot e na
 * espinha do tile, nunca em barra ou valor. Tons profundos que não colidem com
 * os semânticos — esmeralda/âmbar/vermelho ficam reservados para ESTADO.
 */
const CORES_CARTAO = [
  // Ficam fora da paleta de estado justamente para não competir com ela.
  // ds-ok: identidade do cartão escolhida pela pessoa — é dado, não cor de interface.
  "#5B21B6", "#1E3A8A", "#155E75", "#9D174D", "#7C2D12", "#4A044E", "#3F3F46",
];

export const COR_CARTAO_PADRAO = CORES_CARTAO[0];

/**
 * Barra de limite: a cor é estado, não decoração — esmeralda enquanto sobra
 * folga, âmbar a partir de 80%, vermelho ao estourar. Sem degradê.
 */
const corLimite = (pct: number) =>
  pct >= 100 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#10B981";

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
    titulo: "Visão de Cartões de Crédito",
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
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial da aba Cartões de Crédito",
    ariaLabel: "Ver tutorial da aba Cartões de Crédito",
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
      show: true, titulo: "Excluir Cartão", mensagem: `Excluir "${nome}"? Transações serão removidas.`,
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
      show: true, titulo: "Excluir Transação", mensagem: "Excluir esta transação?",
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
      
      // Descontar valor da conta bancária
      const novoSaldo = (conta.saldo_atual || conta.saldo_inicial) - valorPago;
      await supabase.from("contas_bancarias").update({ saldo_atual: novoSaldo }).eq("id", contaPagamento);
      
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
      show: true, titulo: "Desfazer Pagamento", mensagem: "Deseja desfazer o pagamento desta fatura? O valor será devolvido à conta.",
      onConfirm: async () => {
        if (!supabase) return;
        setSaving(true);
        try {
          // Buscar o pagamento para saber o valor e a conta
          const { data: pagamento } = await supabase.from("pagamentos_fatura")
            .select("*")
            .eq("cartao_id", cartaoSelecionado.id)
            .eq("mes", mesFatura)
            .single();
          
          if (pagamento && pagamento.conta_id && pagamento.valor_pago) {
            // Devolver valor à conta bancária
            const conta = contas.find(c => c.id === pagamento.conta_id);
            if (conta) {
              const novoSaldo = (conta.saldo_atual || conta.saldo_inicial) + pagamento.valor_pago;
              await supabase.from("contas_bancarias").update({ saldo_atual: novoSaldo }).eq("id", pagamento.conta_id);
            }
          }
          
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
  const percentUsado = consolidado.limiteTotal > 0 ? (consolidado.usado / consolidado.limiteTotal) * 100 : 0;

  if (loading) {
    return <PageLoadingState title="Carregando cartões" description="Estamos buscando cartões, transações e faturas." />;
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
        actionLabel="Tentar novamente"
      />
    );
  }

  const corDoCartao = (c: CartaoCredito) => c.cor || CORES_CARTAO[0];

  // Barra de limite: fill semântico + trilho vermelho claro quando estoura.
  const barraLimite = (pct: number) => (
    <div className={`h-2 rounded-full overflow-hidden ${pct > 100 ? "bg-red-50 dark:bg-red-950/30" : "bg-zinc-100 dark:bg-white/[0.04]"}`}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: corLimite(pct) }} />
    </div>
  );

  // Card "Limite consolidado" — aparece na vista "Todos" e na coluna do cartão.
  const renderLimiteConsolidado = () => (
    <Card className="min-w-0" data-tour="cartoes-consolidado">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Limite consolidado</h2>
        <Valor porte="medio" className="text-zinc-900 dark:text-zinc-50">{percentUsado.toFixed(0)}%</Valor>
      </div>
      {barraLimite(percentUsado)}
      <div className="grid grid-cols-3 gap-3 mt-4 mb-4">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Disponível</p>
          <p className="font-mono valor text-sm font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{formatCurrency(consolidado.disponivel)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Usado</p>
          <p className="font-mono valor text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatCurrency(consolidado.usado)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Limite total</p>
          <p className="font-mono valor text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatCurrency(consolidado.limiteTotal)}</p>
        </div>
      </div>
      <div className="space-y-3 border-t border-zinc-100 dark:border-white/[0.05] pt-4" data-tour="cartoes-limites-grid">
        {cartoesState.map((c) => {
          const usado = getLimiteUsado(c.id);
          const limite = c.limite || 0;
          const pct = limite > 0 ? (usado / limite) * 100 : 0;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCartaoSelecionado(c)}
              className="w-full text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: corDoCartao(c) }} />
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate flex-1">{c.nome}</span>
                <span className="font-mono valor text-[11px] text-zinc-500 dark:text-zinc-400">{pct.toFixed(0)}%</span>
              </div>
              {barraLimite(pct)}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4">
        dot = banco · barra = estado (verde ok · âmbar ≥80% · vermelho estourado)
      </p>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="cartoes-header"
        eyebrow="Carteira"
        title="Cartões de crédito"
        description="Faturas, limites e transações de cada cartão."
        action={
          <div className="flex items-center gap-3 flex-wrap">
            <SeletorMes />
            <button
              onClick={() => { resetFormCartao(); setShowFormCartao(true); }}
              className="inline-flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-[18px] h-[18px]" /> Novo cartão
            </button>
          </div>
        }
      />

      {/* Rail de tiles */}
      <div className="flex gap-3 overflow-x-auto pb-2" data-tour="cartoes-lista">
        {/* Tile Todos */}
        <button
          type="button"
          onClick={() => setCartaoSelecionado(null)}
          aria-pressed={cartaoSelecionado === null}
          className={`relative overflow-hidden flex-shrink-0 w-44 p-3.5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            cartaoSelecionado === null
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
              : "border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.08]"
          }`}
        >
          <Rotulo className="mb-1.5">Todos</Rotulo>
          <Valor porte="medio" className="block text-zinc-900 dark:text-zinc-50">
            {formatCurrency(cartoesState.reduce((sum, c) => sum + getFaturaCartao(c.id), 0))}
          </Valor>
          <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{cartoesState.length} {cartoesState.length === 1 ? "cartão" : "cartões"}</p>
        </button>
        {/* Tiles por cartão — espinha e dot = identidade do banco */}
        {cartoesState.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCartaoSelecionado(c)}
            aria-pressed={cartaoSelecionado?.id === c.id}
            className={`relative overflow-hidden flex-shrink-0 w-44 p-3.5 pl-4 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              cartaoSelecionado?.id === c.id
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                : "border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.08]"
            }`}
          >
            <span className="absolute left-0 inset-y-0 w-1" style={{ backgroundColor: corDoCartao(c) }} aria-hidden="true" />
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: corDoCartao(c) }} />
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{c.nome}</span>
            </div>
            <Valor porte="medio" className="block text-zinc-900 dark:text-zinc-50">{formatCurrency(getFaturaCartao(c.id))}</Valor>
            <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">vence dia {c.dia_vencimento}</p>
          </button>
        ))}
        {/* Tile Novo cartão */}
        <button
          type="button"
          onClick={() => { resetFormCartao(); setShowFormCartao(true); }}
          className="flex-shrink-0 w-44 p-3.5 rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-white/[0.02] hover:border-emerald-400 hover:text-emerald-700 text-zinc-500 dark:text-zinc-400 flex flex-col items-center justify-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Novo cartão</span>
        </button>
      </div>

      {/* Vista "Todos": limite consolidado */}
      {cartaoSelecionado === null && renderLimiteConsolidado()}

      {/* Cartão selecionado */}
      {cartaoSelecionado && (() => {
        const usado = getLimiteUsado(cartaoSelecionado.id);
        const limite = cartaoSelecionado.limite || 0;
        const pct = limite > 0 ? (usado / limite) * 100 : 0;
        const fatura = getFaturaCartao(cartaoSelecionado.id);
        const quitada = faturaQuitada(cartaoSelecionado.id);
        const itens = getTodasTransacoesDoMes(cartaoSelecionado.id);

        // Dias até o vencimento — só faz sentido olhando o mês corrente.
        const hoje = new Date();
        const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const ultimoDiaMes = new Date(mesVisualizacao.getFullYear(), mesVisualizacao.getMonth() + 1, 0).getDate();
        const dataVencimento = new Date(mesVisualizacao.getFullYear(), mesVisualizacao.getMonth(), Math.min(cartaoSelecionado.dia_vencimento, ultimoDiaMes));
        const diasAteVencimento = Math.round((dataVencimento.getTime() - hojeZero.getTime()) / 86400000);
        const mostraContagem = format(mesVisualizacao, "yyyy-MM") === format(hoje, "yyyy-MM") && diasAteVencimento >= 0;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4 min-w-0">
              {/* Card fatura (herói) */}
              <Card padding="resumo" data-tour="cartoes-detalhes-fatura">
                <div className="flex items-start justify-between gap-5 flex-wrap">
                  <div className="min-w-0">
                    <Rotulo className="flex items-center gap-2">
                      <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: corDoCartao(cartaoSelecionado) }} />
                      {cartaoSelecionado.nome} · fatura de {format(mesVisualizacao, "MMMM", { locale: ptBR })}
                    </Rotulo>
                    <div className="flex items-center gap-3 flex-wrap mt-2">
                      <Valor porte="heroi" className="text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(fatura)}
                      </Valor>
                      {quitada && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                          <Check className="w-[11px] h-[11px]" /> Quitada
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
                      vence dia {cartaoSelecionado.dia_vencimento}
                      {mostraContagem && (
                        <>
                          {" · "}
                          <span className={diasAteVencimento <= 5 ? "text-amber-600 dark:text-amber-400 font-semibold" : undefined}>
                            em {diasAteVencimento} {diasAteVencimento === 1 ? "dia" : "dias"}
                          </span>
                        </>
                      )}
                    </p>
                    {quitada && (
                      <button onClick={handleDesfazerPagamento} className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 underline">
                        Desfazer pagamento
                      </button>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Rotulo>Melhor dia p/ comprar</Rotulo>
                    <Valor porte="medio" className="block mt-1 text-emerald-700 dark:text-emerald-400">
                      {cartaoSelecionado.melhor_dia_compra || "—"}
                    </Valor>
                  </div>
                </div>
                <div className="border-t border-zinc-100 dark:border-white/[0.05] mt-5 pt-5">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <Rotulo>Limite usado</Rotulo>
                    <span className="font-mono valor text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {pct.toFixed(0)}% de {formatCurrency(limite)}
                    </span>
                  </div>
                  {barraLimite(pct)}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Disponível</p>
                      {/* Folga é sempre esmeralda; vermelho só quando estoura. */}
                      <p className={`font-mono valor text-sm font-semibold whitespace-nowrap ${limite - usado < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>{formatCurrency(limite - usado)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Usado</p>
                      <p className="font-mono valor text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatCurrency(usado)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Limite total</p>
                      <p className="font-mono valor text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatCurrency(limite)}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Transações da fatura */}
              <Card padding="nenhum" sangra className="min-w-0" data-tour="cartoes-detalhes-transacoes">
                <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 md:px-5 md:pt-5">
                  <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Transações da fatura</h2>
                  <span className="font-mono valor text-[13px] text-zinc-500 dark:text-zinc-400">{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
                </div>
                {cartaoSelecionado.divida_inicial && cartaoSelecionado.divida_inicial > 0 ? (
                  <div className="flex items-center justify-between gap-3 p-3 mb-2 mx-4 md:mx-5 bg-zinc-50 dark:bg-white/[0.04] rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                      <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate">Saldo anterior</span>
                    </div>
                    <span className="font-mono valor text-sm font-semibold text-zinc-900 dark:text-zinc-50 whitespace-nowrap">{formatCurrency(cartaoSelecionado.divida_inicial)}</span>
                  </div>
                ) : null}
                {itens.length === 0 ? (
                  <div className="px-4 pb-6 md:px-5">
                    <PageEmptyState
                      compact
                      title="Nenhuma transação neste mês"
                      description="Quando houver compras no período da fatura, elas aparecerão aqui."
                    />
                  </div>
                ) : (
                  <div className={`${LISTA_CLASSES} max-h-80 overflow-y-auto`}>
                    {itens.map((t: any) => {
                      const fixo = t.origem === "gasto" && isGastoFixo(t.id);
                      const dotClasse = t.pagoParcial ? "bg-amber-500" : fixo ? "bg-zinc-300 dark:bg-zinc-600" : "bg-emerald-500";
                      return (
                        <LinhaLista
                          key={`${t.origem}-${t.id}`}
                          icone={
                            /* Estado atenuado é um recurso só: zinc-500 + line-through, check no lugar do dot. */
                            t.pago ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <span className={`w-2 h-2 rounded-full ${dotClasse}`} />
                            )
                          }
                          titulo={t.descricao}
                          atenuado={t.pago}
                          meta={
                            <span className="flex items-center gap-1.5">
                              {t.pagoParcial && (
                                <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 whitespace-nowrap">
                                  Pago {formatCurrency(t.valorPago || 0)}
                                </span>
                              )}
                              {fixo && (
                                <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">Fixo</span>
                              )}
                              {t.origem === "compartilhado" && !t.pago && !t.pagoParcial && (
                                <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                  Emprestado · {t.pessoa}
                                </span>
                              )}
                              <span className="truncate">
                                {t.categoria} · {format(new Date(t.data + (t.data.length === 7 ? "-01" : "") + "T00:00:00"), "dd/MM")}
                              </span>
                            </span>
                          }
                          valor={
                            t.pagoParcial ? (
                              <span className="text-amber-700 dark:text-amber-400">Falta {formatCurrency(t.valorRestante || 0)}</span>
                            ) : (
                              formatCurrency(t.valor)
                            )
                          }
                          acoes={
                            t.origem === "transacao"
                              ? [
                                  {
                                    rotulo: "Excluir",
                                    icone: <Trash2 className="w-5 h-5" />,
                                    onClick: () => handleDeleteTransacao(t.id),
                                    tom: "perigo" as const,
                                  },
                                ]
                              : undefined
                          }
                          acoesDesktop={
                            t.origem === "transacao" ? (
                              <button
                                onClick={() => handleDeleteTransacao(t.id)}
                                aria-label={`Excluir ${t.descricao}`}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-[15px] h-[15px]" />
                              </button>
                            ) : undefined
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Coluna direita */}
            <div className="space-y-4 min-w-0">
              {/* Este cartão */}
              <Card className="h-fit" data-tour="cartoes-detalhes-limite">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Este cartão</h2>
                  <div className="flex gap-0.5">
                    <button onClick={() => handleEditCartao(cartaoSelecionado)} aria-label={`Editar cartão ${cartaoSelecionado.nome}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"><Edit2 className="w-[15px] h-[15px]" /></button>
                    <button onClick={() => handleDeleteCartao(cartaoSelecionado.id, cartaoSelecionado.nome)} aria-label={`Excluir cartão ${cartaoSelecionado.nome}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"><Trash2 className="w-[15px] h-[15px]" /></button>
                  </div>
                </div>
                <div className="space-y-2.5 text-sm mb-5">
                  <div className="flex justify-between gap-3">
                    <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 min-w-0"><Calendar className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />Vencimento</span>
                    <span className="font-mono valor text-zinc-900 dark:text-zinc-50 whitespace-nowrap">dia {cartaoSelecionado.dia_vencimento}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 min-w-0"><CalendarDays className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />Melhor dia de compra</span>
                    <span className="font-mono valor text-zinc-900 dark:text-zinc-50 whitespace-nowrap">{cartaoSelecionado.melhor_dia_compra ? `dia ${cartaoSelecionado.melhor_dia_compra}` : "—"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 min-w-0"><History className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />Dívida inicial</span>
                    <span className="font-mono valor text-zinc-900 dark:text-zinc-50 whitespace-nowrap">{formatCurrency(cartaoSelecionado.divida_inicial || 0)}</span>
                  </div>
                </div>
                {quitada ? (
                  <button disabled className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 bg-zinc-200 dark:bg-white/[0.07] text-zinc-500 dark:text-zinc-400 rounded-xl text-sm font-semibold cursor-not-allowed">
                    <Check className="w-4 h-4" /> Fatura quitada
                  </button>
                ) : (
                  <button
                    onClick={() => { setValorPagamento(formatCurrencyValue(fatura)); setShowPagarFatura(true); }}
                    className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    <Check className="w-4 h-4" /> Pagar fatura
                  </button>
                )}
              </Card>

              {/* Limite consolidado */}
              {renderLimiteConsolidado()}
            </div>
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

      {/* Modal Novo/Editar Cartão */}
      {showFormCartao && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-md p-5 border border-zinc-200 dark:border-white/[0.06] shadow-xl dark:shadow-black/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">{editandoCartao ? "Editar Cartão" : "Novo cartão de crédito"}</h3>
              <button onClick={resetFormCartao} className="p-1 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded"><X className="w-5 h-5 text-zinc-400 dark:text-zinc-500" /></button>
            </div>
            <form onSubmit={handleSubmitCartao} className="space-y-4">
              <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Nome</label><input type="text" value={formCartao.nome} onChange={e => setFormCartao({...formCartao, nome: e.target.value})} placeholder="Ex: Nubank, Inter..." className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" required /></div>
              <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Limite</label><input type="text" value={formCartao.limite} onChange={e => setFormCartao({...formCartao, limite: formatCurrencyInput(e.target.value)})} placeholder="R$ 0,00" className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Dia de Vencimento</label><input type="number" min="1" max="31" value={formCartao.dia_vencimento} onChange={e => setFormCartao({...formCartao, dia_vencimento: e.target.value})} className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" required /></div>
                <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Melhor dia compra</label><input type="number" min="1" max="31" value={formCartao.melhor_dia_compra} onChange={e => setFormCartao({...formCartao, melhor_dia_compra: e.target.value})} className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" /></div>
              </div>
              <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Dívida Inicial (se houver)</label><input type="text" value={formCartao.divida_inicial} onChange={e => setFormCartao({...formCartao, divida_inicial: formatCurrencyInput(e.target.value)})} placeholder="R$ 0,00" className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" /></div>
              <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Cor</label><div className="flex gap-2 flex-wrap">{CORES_CARTAO.map(cor => (<button key={cor} type="button" onClick={() => setFormCartao({...formCartao, cor})} className={`w-8 h-8 rounded-lg ${formCartao.cor === cor ? "ring-2 ring-emerald-500" : ""}`} style={{ backgroundColor: cor }} />))}</div></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetFormCartao} className="flex-1 py-2 bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.10] text-zinc-700 dark:text-zinc-300 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{editandoCartao ? "Salvar" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagar Fatura */}
      {showPagarFatura && cartaoSelecionado && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-md p-5 border border-zinc-200 dark:border-white/[0.06] shadow-xl dark:shadow-black/60">
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-2">Pagar Fatura</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Selecione a conta de onde sairá o dinheiro para pagar esta fatura de <strong className="font-mono valor text-emerald-600 dark:text-emerald-400">{formatCurrency(getFaturaCartao(cartaoSelecionado.id))}</strong>.</p>
            <div className="space-y-4">
              <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Conta de Origem</label><select value={contaPagamento} onChange={e => setContaPagamento(e.target.value)} className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"><option value="">Selecione...</option>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
              <div><label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Valor</label><input type="text" value={valorPagamento} onChange={e => setValorPagamento(formatCurrencyInput(e.target.value))} className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]" /><p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Insira o valor pago (deixe como está para pagamento total)</p></div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <button onClick={handlePagarFatura} disabled={saving} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Confirmar Pagamento</button>
              <button onClick={() => setShowPagarFatura(false)} className="w-full py-2 bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.10] text-zinc-700 dark:text-zinc-300 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
