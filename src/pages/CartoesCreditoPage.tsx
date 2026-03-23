import { useState, useEffect, useCallback } from "react";
import { CreditCard, Loader2, Trash2, Edit2, X, Calendar, ChevronLeft, ChevronRight, Check, Plus } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppContext } from "../context";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatCurrencyInput, parseCurrency, getMesFaturaCartao } from "../utils/calculations";

import type { CartaoCredito, CartaoCreditoForm, TransacaoCartao, ContaBancaria, MeuGasto, Gasto } from "../types";

const CORES_CARTAO = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#6366F1"
];

export const CartoesCreditoPage = () => {
  const { user, setModalConfirm, getTotalPagoParcial, resumoMensal } = useAppContext();
  
  // Usar os cartões do context que já carregam ou buscar locais para este componente? O componente já usa um estado local `cartoes` que não precisa se o AppContext fornece, mas vamos manter o fetchCartoes que existe aqui.
  
  const [cartoesState, setCartoesState] = useState<CartaoCredito[]>([]);
  const [transacoes, setTransacoes] = useState<TransacaoCartao[]>([]);
  const [meusGastos, setMeusGastos] = useState<MeuGasto[]>([]);
  const [gastosCompartilhados, setGastosCompartilhados] = useState<Gasto[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [cartaoSelecionado, setCartaoSelecionado] = useState<CartaoCredito | null>(null);
  const [mesVisualizacao, setMesVisualizacao] = useState(new Date());
  
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
      Promise.all([fetchCartoes(), fetchTransacoes(), fetchContas(), fetchMeusGastos(), fetchGastosCompartilhados(), fetchPagamentosFatura()]).finally(() => setLoading(false));
    }
  }, [user, fetchCartoes, fetchTransacoes, fetchContas, fetchMeusGastos, fetchGastosCompartilhados, fetchPagamentosFatura]);

  // Calculações
  const getMesAno = () => format(mesVisualizacao, "MMMM yyyy", { locale: ptBR });
  
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
      // Gastos fixos ativos aparecem sempre
      if (g.categoria === "fixo" && g.ativo) return true;
      // Outros gastos filtram pelo período da fatura
      return estaNoPeríodoFatura(g.data, cartaoId);
    });
  };

  // Combinar transações + meus_gastos + gastos compartilhados para exibir
  const getTodasTransacoesDoMes = (cartaoId: string) => {
    const trans = getTransacoesDoMes(cartaoId).map(t => ({ ...t, origem: "transacao" as const }));
    const gastos = getGastosDoMes(cartaoId).map(g => ({
      id: g.id, descricao: g.descricao, valor: g.minha_parte || g.valor, 
      categoria: g.categoria_gasto || g.categoria || "Gasto",
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
        categoria: g.categoria || "Gasto",
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
    const dividaInicial = cartao?.divida_inicial || 0;
    // Transações não pagas
    const transNaoPagas = transacoes.filter(t => t.cartao_id === cartaoId && !t.pago);
    const totalTrans = transNaoPagas.reduce((sum, t) => sum + t.valor, 0);
    // Gastos (meus_gastos) não pagos vinculados ao cartão
    const gastosNaoPagos = meusGastos.filter(g => g.cartao_id === cartaoId && !g.pago);
    const totalGastos = gastosNaoPagos.reduce((sum, g) => sum + (g.minha_parte || g.valor), 0);
    // Gastos compartilhados vinculados ao cartão (calculando valor RESTANTE)
    const compartilhadosCartao = gastosCompartilhados.filter(g => g.cartao_id === cartaoId);
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
    } finally { setSaving(false); }
  };

  const handleEditCartao = (c: CartaoCredito) => {
    setFormCartao({
      nome: c.nome, conta_id: c.conta_id || "", dia_vencimento: String(c.dia_vencimento),
      melhor_dia_compra: String(c.melhor_dia_compra || ""), limite: formatCurrency(c.limite).replace("R$\u00a0", ""),
      divida_inicial: c.divida_inicial ? formatCurrency(c.divida_inicial).replace("R$\u00a0", "") : "",
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
        await supabase.from("transacoes_cartao").delete().eq("cartao_id", id);
        await supabase.from("cartoes_credito").delete().eq("id", id);
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
        await supabase.from("transacoes_cartao").delete().eq("id", id);
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
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CreditCard className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cartões de Crédito</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie seus cartões, limites e faturas</p>
        </div>
      </div>

      {/* Lista de Cartões */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {/* Botão Tudo */}
        <div
          onClick={() => setCartaoSelecionado(null)}
          className={`flex-shrink-0 w-40 p-3 rounded-xl border cursor-pointer transition-all ${cartaoSelecionado === null ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <span className="text-gray-900 dark:text-gray-100 text-sm font-medium">Tudo</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(cartoesState.reduce((sum, c) => sum + getFaturaCartao(c.id), 0))}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total {format(mesVisualizacao, "MMM", { locale: ptBR })}</p>
        </div>
        {cartoesState.map(c => (
          <div
            key={c.id}
            onClick={() => setCartaoSelecionado(c)}
            className={`flex-shrink-0 w-40 p-3 rounded-xl border cursor-pointer transition-all ${cartaoSelecionado?.id === c.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
            style={{ borderTopColor: c.cor || "#3B82F6", borderTopWidth: 3 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5" style={{ color: c.cor || "#3B82F6" }} />
              <span className="text-gray-900 dark:text-gray-100 text-sm font-medium truncate">{c.nome}</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(getFaturaCartao(c.id))}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Fatura {format(mesVisualizacao, "MMM", { locale: ptBR })}</p>
          </div>
        ))}
        <div
          onClick={() => { resetFormCartao(); setShowFormCartao(true); }}
          className="flex-shrink-0 w-40 p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 flex flex-col items-center justify-center gap-2"
        >
          <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Novo cartão</span>
        </div>
      </div>

      {/* Total Consolidado - só aparece quando "Tudo" está selecionado */}
      {cartaoSelecionado === null && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-900 dark:text-gray-100 font-medium">Total Consolidado</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Limite Usado</p>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
            <div className="h-full rounded-full" style={{ width: `${Math.min(percentUsado, 100)}%`, background: `linear-gradient(90deg, #F59E0B 0%, ${percentUsado > 80 ? "#EF4444" : "#10B981"} 100%)` }} />
          </div>
          <div className="flex justify-between text-sm">
            <div><p className="text-gray-500 dark:text-gray-400">Limite Total</p><p className="text-gray-900 dark:text-gray-100 font-semibold">{formatCurrency(consolidado.limiteTotal)}</p></div>
            <div className="text-center"><p className="text-gray-500 dark:text-gray-400">Usado</p><p className="text-amber-600 font-semibold">{formatCurrency(consolidado.usado)}</p></div>
            <div className="text-right"><p className="text-gray-500 dark:text-gray-400">Limite Disponível</p><p className="text-emerald-600 font-semibold">{formatCurrency(consolidado.disponivel)}</p></div>
          </div>
          <p className="text-right text-xs text-gray-400 dark:text-gray-500 mt-2">{percentUsado.toFixed(1)}%</p>
        </div>
      )}

      {/* Vista "Tudo" - todos os cartões com limites individuais */}
      {cartaoSelecionado === null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Limites por Cartão</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setMesVisualizacao(subMonths(mesVisualizacao, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
              <span className="text-gray-900 dark:text-gray-100 capitalize">{getMesAno()}</span>
              <button onClick={() => setMesVisualizacao(addMonths(mesVisualizacao, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cartoesState.map(c => {
              const usado = getLimiteUsado(c.id);
              const limite = c.limite || 0;
              const pct = limite > 0 ? (usado / limite) * 100 : 0;
              const fatura = getFaturaCartao(c.id);
              return (
                <div key={c.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4" style={{ borderTopColor: c.cor || "#3B82F6", borderTopWidth: 3 }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" style={{ color: c.cor || "#3B82F6" }} />
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{c.nome}</span>
                    </div>
                    <button onClick={() => setCartaoSelecionado(c)} className="text-xs text-blue-600 hover:underline">Ver detalhes</button>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fatura {format(mesVisualizacao, "MMM", { locale: ptBR })}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(fatura)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Venc. dia {c.dia_vencimento}</p>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Limite Usado</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 80 ? "#EF4444" : c.cor || "#3B82F6" }} />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-gray-500 dark:text-gray-400 text-xs">Disponível</p><p className="text-emerald-600 font-medium">{formatCurrency(limite - usado)}</p></div>
                    <div><p className="text-gray-500 dark:text-gray-400 text-xs">Limite</p><p className="text-gray-900 dark:text-gray-100 font-medium">{formatCurrency(limite)}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detalhes do Cartão Selecionado */}
      {cartaoSelecionado && (
        <>
        {/* Barra de limite do cartão selecionado */}
        {(() => {
          const usado = getLimiteUsado(cartaoSelecionado.id);
          const limite = cartaoSelecionado.limite || 0;
          const pct = limite > 0 ? (usado / limite) * 100 : 0;
          return (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4" style={{ borderTopColor: cartaoSelecionado.cor || "#3B82F6", borderTopWidth: 3 }}>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5" style={{ color: cartaoSelecionado.cor || "#3B82F6" }} />
                <span className="text-gray-900 dark:text-gray-100 font-medium">{cartaoSelecionado.nome}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Limite Usado</p>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, ${cartaoSelecionado.cor || "#3B82F6"} 0%, ${pct > 80 ? "#EF4444" : "#10B981"} 100%)` }} />
              </div>
              <div className="flex justify-between text-sm">
                <div><p className="text-gray-500 dark:text-gray-400">Limite Total</p><p className="text-gray-900 dark:text-gray-100 font-semibold">{formatCurrency(limite)}</p></div>
                <div className="text-center"><p className="text-gray-500 dark:text-gray-400">Usado</p><p className="text-amber-600 font-semibold">{formatCurrency(usado)}</p></div>
                <div className="text-right"><p className="text-gray-500 dark:text-gray-400">Disponível</p><p className="text-emerald-600 font-semibold">{formatCurrency(limite - usado)}</p></div>
              </div>
              <p className="text-right text-xs text-gray-400 dark:text-gray-500 mt-2">{pct.toFixed(1)}%</p>
            </div>
          );
        })()}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Coluna esquerda */}
          <div className="lg:col-span-2 space-y-4">
            {/* Navegação de mês */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-gray-100 font-medium capitalize">{getMesAno()}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setMesVisualizacao(subMonths(mesVisualizacao, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                    <button onClick={() => setMesVisualizacao(addMonths(mesVisualizacao, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Melhor dia para compra: {cartaoSelecionado.melhor_dia_compra || "-"}</p>
              </div>
              <div className="text-center py-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fatura ({format(mesVisualizacao, "MMMM", { locale: ptBR })})</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(getFaturaCartao(cartaoSelecionado.id))}</p>
                  {faturaQuitada(cartaoSelecionado.id) && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-semibold">✓ QUITADO</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">DIA DE VENCIMENTO {cartaoSelecionado.dia_vencimento}/{format(mesVisualizacao, "MM")}</p>
                {faturaQuitada(cartaoSelecionado.id) && (
                  <button onClick={handleDesfazerPagamento} className="mt-2 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 underline">Desfazer pagamento</button>
                )}
              </div>
            </div>

            {/* Transações */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-900 dark:text-gray-100 font-medium">Transações do Cartão</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{getTodasTransacoesDoMes(cartaoSelecionado.id).length} itens</span>
              </div>
              {cartaoSelecionado.divida_inicial && cartaoSelecionado.divida_inicial > 0 && (
                <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-800 text-sm">
                  <div className="flex items-center gap-2"><span className="text-gray-400 dark:text-gray-500">⏱</span><span className="text-gray-600 dark:text-gray-400">Saldo Anterior / Dívida Inicial</span></div>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{formatCurrency(cartaoSelecionado.divida_inicial)}</span>
                </div>
              )}
              {getTodasTransacoesDoMes(cartaoSelecionado.id).length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma transação neste mês</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {getTodasTransacoesDoMes(cartaoSelecionado.id).map((t: any) => (
                    <div key={t.id} className={`flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded ${t.pago ? "opacity-60" : ""}`}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm ${t.pago ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-900 dark:text-gray-100"}`}>{t.descricao}</p>
                          {t.pago && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Pago</span>}
                          {t.pagoParcial && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Pago: {formatCurrency(t.valorPago || 0)}</span>}
                          {t.origem === "gasto" && !t.pago && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Gasto</span>}
                          {t.origem === "gasto" && isGastoFixo(t.id) && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Fixo</span>}
                          {t.origem === "compartilhado" && !t.pago && !t.pagoParcial && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Emprestado</span>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t.categoria} • {format(new Date(t.data + "T00:00:00"), "dd/MM")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.pagoParcial ? (
                          <span className="font-medium text-amber-600">Falta: {formatCurrency(t.valorRestante || 0)}</span>
                        ) : (
                          <span className={`font-medium ${t.pago ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-900 dark:text-gray-100"}`}>{formatCurrency(t.valor)}</span>
                        )}
                        {t.origem === "transacao" && <button onClick={() => handleDeleteTransacao(t.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><Trash2 className="w-3 h-3 text-gray-400 dark:text-gray-500" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna direita - Uso do limite */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 h-fit">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-900 dark:text-gray-100 font-medium">Uso do Limite</span>
              <div className="flex gap-1">
                <button onClick={() => handleEditCartao(cartaoSelecionado)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><Edit2 className="w-4 h-4 text-gray-400 dark:text-gray-500" /></button>
                <button onClick={() => handleDeleteCartao(cartaoSelecionado.id, cartaoSelecionado.nome)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><Trash2 className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-red-500" /></button>
              </div>
            </div>
            {(() => {
              const usado = getLimiteUsado(cartaoSelecionado.id);
              const limite = cartaoSelecionado.limite || 0;
              const pct = limite > 0 ? (usado / limite) * 100 : 0;
              return (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Limite Usado</p>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Limite Disponível</p>
                      <p className="text-lg font-bold text-red-500">{formatCurrency(limite - usado)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Limite Total</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(limite)}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">⏱ Dia de Vencimento</span><span className="text-gray-900 dark:text-gray-100">{cartaoSelecionado.dia_vencimento}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">📅 Melhor dia para compra</span><span className="text-gray-900 dark:text-gray-100">{cartaoSelecionado.melhor_dia_compra || "-"}</span></div>
                  </div>
                  {faturaQuitada(cartaoSelecionado.id) ? (
                    <button disabled className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
                      <Check className="w-4 h-4" /> Fatura Quitada
                    </button>
                  ) : (
                    <button onClick={() => { setValorPagamento(formatCurrency(getFaturaCartao(cartaoSelecionado.id)).replace("R$\u00a0", "")); setShowPagarFatura(true); }} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" /> Pagar Fatura
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
        </>
      )}

      {/* Modal Novo/Editar Cartão */}
      {showFormCartao && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md p-5 border border-gray-200 dark:border-gray-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editandoCartao ? "Editar Cartão" : "Novo cartão de crédito"}</h3>
              <button onClick={resetFormCartao} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400 dark:text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmitCartao} className="space-y-4">
              <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nome</label><input type="text" value={formCartao.nome} onChange={e => setFormCartao({...formCartao, nome: e.target.value})} placeholder="Ex: Nubank, Inter..." className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" required /></div>
              <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Limite</label><input type="text" value={formCartao.limite} onChange={e => setFormCartao({...formCartao, limite: formatCurrencyInput(e.target.value)})} placeholder="R$ 0,00" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Dia de Vencimento</label><input type="number" min="1" max="31" value={formCartao.dia_vencimento} onChange={e => setFormCartao({...formCartao, dia_vencimento: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" required /></div>
                <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Melhor dia compra</label><input type="number" min="1" max="31" value={formCartao.melhor_dia_compra} onChange={e => setFormCartao({...formCartao, melhor_dia_compra: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" /></div>
              </div>
              <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Dívida Inicial (se houver)</label><input type="text" value={formCartao.divida_inicial} onChange={e => setFormCartao({...formCartao, divida_inicial: formatCurrencyInput(e.target.value)})} placeholder="R$ 0,00" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" /></div>
              <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Cor</label><div className="flex gap-2">{CORES_CARTAO.map(cor => (<button key={cor} type="button" onClick={() => setFormCartao({...formCartao, cor})} className={`w-8 h-8 rounded-lg ${formCartao.cor === cor ? "ring-2 ring-blue-500" : ""}`} style={{ backgroundColor: cor }} />))}</div></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetFormCartao} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{editandoCartao ? "Salvar" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagar Fatura */}
      {showPagarFatura && cartaoSelecionado && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md p-5 border border-gray-200 dark:border-gray-800 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Pagar Fatura</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Selecione a conta de onde sairá o dinheiro para pagar esta fatura de <strong className="text-blue-600">{formatCurrency(getFaturaCartao(cartaoSelecionado.id))}</strong>.</p>
            <div className="space-y-4">
              <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Conta de Origem</label><select value={contaPagamento} onChange={e => setContaPagamento(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100"><option value="">Selecione...</option>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
              <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Valor</label><input type="text" value={valorPagamento} onChange={e => setValorPagamento(formatCurrencyInput(e.target.value))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" /><p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Insira o valor pago (deixe como está para pagamento total)</p></div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <button onClick={handlePagarFatura} disabled={saving} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Confirmar Pagamento</button>
              <button onClick={() => setShowPagarFatura(false)} className="w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
