import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Building2, Plus, Loader2, DollarSign, TrendingUp, Trash2, Edit2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppContext } from "../context";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatCurrencyInput, parseCurrency, formatMonthYear } from "../utils/calculations";
import { CATEGORIAS_RECEITA, TIPOS_RECEITA, CATEGORIA_RECEITA_PADRAO } from "../utils/receitas";
import type { ContaBancaria, Receita, ContaBancariaForm, ReceitaForm } from "../types";

export const ContasBancariasPage = () => {
  const { user, setModalConfirm, setModalFeedback, mesVisualizacao, navegarMes, irParaHoje, gastosFixos } = useAppContext();
  
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);
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
      Promise.all([fetchContas(), fetchReceitas()]).finally(() => setLoading(false));
    }
  }, [user, fetchContas, fetchReceitas]);

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

    // Usar saldo_atual como base (que inclui pagamentos de fatura e receitas/gastos avulsos)
    const saldoBase = conta.saldo_atual !== undefined && conta.saldo_atual !== null ? conta.saldo_atual : conta.saldo_inicial;
    
    const totalReceitas = receitasRecebidas.reduce((sum, r) => sum + r.valor, 0);
    const totalGastos = gastosFixosDaConta.reduce((sum, g) => sum + g.valor, 0);

    return saldoBase + totalReceitas - totalGastos;
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
        saldo_atual: saldoAtual
      };
      if (editandoConta) {
        await supabase.from("contas_bancarias").update(dados).eq("id", editandoConta.id);
      } else {
        // Ao criar nova conta, saldo_atual começa igual ao saldo_inicial
        await supabase.from("contas_bancarias").insert({ 
          ...dados, 
          saldo_atual: saldoInicial,
          user_id: user.id 
        });
      }
      await fetchContas();
      resetFormConta();
    } finally { setSaving(false); }
  };

  const handleEditConta = (c: ContaBancaria) => {
    setFormConta({ 
      nome: c.nome, 
      banco: c.banco || "", 
      saldo_inicial: formatCurrency(c.saldo_inicial).replace("R$\u00a0", ""),
      saldo_atual: formatCurrency(c.saldo_atual || c.saldo_inicial).replace("R$\u00a0", "")
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
          if (error.code === '23503' || String(error.message).includes('foreign key') || String(error.message).includes('Conflict')) {
            setModalFeedback?.({
              show: true,
              titulo: "Não é possível excluir",
              mensagem: "Esta conta não pode ser apagada pois existem gastos ou receitas vinculadas a ela.",
              tipo: "info"
            });
          } else {
            setModalFeedback?.({ show: true, titulo: "Erro", mensagem: "Erro ao excluir conta.", tipo: "info" });
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
    } finally { setSaving(false); }
  };

  const handleEditReceita = (r: Receita) => {
    setFormReceita({
      conta_id: r.conta_id || "", descricao: r.descricao, valor: formatCurrency(r.valor).replace("R$\u00a0", ""),
      categoria: r.categoria, tipo: r.tipo, dia_recebimento: String(r.dia_recebimento || 1), num_meses: String(r.num_meses || 12),
    });
    setEditandoReceita(r);
    setShowModalReceita(true);
  };

  const handleDeleteReceita = (id: string, desc: string) => {
    setModalConfirm({
      show: true, titulo: "Excluir Receita", mensagem: `Excluir "${desc}"?`,
      onConfirm: async () => { if (supabase) { await supabase.from("receitas").delete().eq("id", id); await fetchReceitas(); } },
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

  const totalReceitasMes = receitasFiltradas.reduce((sum, r) => sum + r.valor, 0);
  const saldoTotal = contas.reduce((sum, c) => sum + calcularSaldoConta(c), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contas Bancárias</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie suas contas e receitas</p>
        </div>
      </div>

      {/* Seletor de Mês */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navegarMes("anterior")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {formatMonthYear(mesVisualizacao)}
            </h2>
            <button
              onClick={irParaHoje}
              className="text-sm text-blue-600 hover:text-blue-700 mt-1"
            >
              Ir para hoje
            </button>
          </div>
          <button
            onClick={() => navegarMes("proximo")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2"><Building2 className="w-4 h-4" /><span className="text-sm">Contas</span></div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{contas.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 mb-2"><TrendingUp className="w-4 h-4" /><span className="text-sm">Receitas do Mês</span></div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReceitasMes)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-2"><DollarSign className="w-4 h-4" /><span className="text-sm">Saldo Total</span></div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(saldoTotal)}</p>
        </div>
      </div>

      {/* Seção Contas */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Minhas Contas</h2>
          <button onClick={() => { resetFormConta(); setShowModalConta(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nova Conta
          </button>
        </div>
        {contas.length === 0 ? (
          <div className="text-center py-8"><Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 dark:text-gray-400">Nenhuma conta</p></div>
        ) : (
          <div className="space-y-2">
            {contas.map(c => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg gap-2 border border-gray-100 dark:border-gray-800">
                <div className="min-w-0">
                  <p className="text-gray-900 dark:text-gray-100 font-medium truncate">{c.nome}</p>
                  {c.banco && <p className="text-gray-500 dark:text-gray-400 text-sm">{c.banco}</p>}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                  <div className="text-left sm:text-right">
                    <p className="text-blue-600 font-semibold">{formatCurrency(calcularSaldoConta(c))}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">Inicial: {formatCurrency(c.saldo_inicial)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEditConta(c)} className="p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><Edit2 className="w-4 h-4 text-gray-400 dark:text-gray-500" /></button>
                    <button onClick={() => handleDeleteConta(c.id, c.nome)} className="p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><Trash2 className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-red-500" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Seção Receitas Fixas/Recorrentes */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Receitas Programadas</h2>
          <button onClick={() => { resetFormReceita(); setShowModalReceita(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nova Receita
          </button>
        </div>
        {(() => {
          const receitasProgramadas = receitas.filter(r => r.tipo === "fixo" || r.tipo === "recorrente");
          return receitasProgramadas.length === 0 ? (
            <div className="text-center py-6"><TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma receita programada</p></div>
          ) : (
            <div className="space-y-2">
              {receitasProgramadas.map(r => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg gap-2 border border-gray-100 dark:border-gray-800">
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-gray-100 font-medium truncate">{r.descricao}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                      {r.categoria} • Dia {r.dia_recebimento} • {r.tipo === "fixo" ? "Fixo" : `${r.num_meses}x`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                    <p className="text-emerald-600 font-semibold">{formatCurrency(r.valor)}</p>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditReceita(r)} className="p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><Edit2 className="w-4 h-4 text-gray-400 dark:text-gray-500" /></button>
                      <button onClick={() => handleDeleteReceita(r.id, r.descricao)} className="p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><Trash2 className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-red-500" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </section>

      {/* Seção Histórico de Transações (Receitas recebidas no mês) */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Receitas do Mês</h2>
        {receitasFiltradas.length === 0 ? (
          <div className="text-center py-6"><p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma receita registrada neste mês</p></div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {receitasFiltradas.map(r => {
              const contaNome = contas.find(c => c.id === r.conta_id)?.nome || "Sem conta";
              return (
                <div key={r.id} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg">
                  <div>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{r.descricao}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {r.tipo === "avulso" ? "Avulso" : r.tipo === "fixo" ? "Fixo" : "Recorrente"} • {contaNome} • {r.categoria}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-2 py-1 rounded font-medium">+ {formatCurrency(r.valor)}</span>
                    <button onClick={() => handleEditReceita(r)} className="p-1 transition-colors hover:bg-emerald-200 dark:hover:bg-emerald-800/50 rounded"><Edit2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /></button>
                    <button onClick={() => handleDeleteReceita(r.id, r.descricao)} className="p-1 transition-colors hover:bg-emerald-200 dark:hover:bg-emerald-800/50 rounded"><Trash2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 hover:text-red-600 dark:hover:text-red-400" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Nova/Editar Conta */}
      {showModalConta && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md p-5 border border-gray-200 dark:border-gray-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editandoConta ? "Editar Conta" : "Nova Conta Bancária"}</h3>
              <button onClick={resetFormConta} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400 dark:text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmitConta} className="space-y-4">
              <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nome da conta</label><input type="text" value={formConta.nome} onChange={e => setFormConta({...formConta, nome: e.target.value})} placeholder="Ex: Conta Corrente, Poupança..." className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" required /></div>
              <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Banco (opcional)</label><input type="text" value={formConta.banco} onChange={e => setFormConta({...formConta, banco: e.target.value})} placeholder="Ex: Nubank, Inter..." className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" /></div>
              <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Saldo inicial</label><input type="text" value={formConta.saldo_inicial} onChange={e => setFormConta({...formConta, saldo_inicial: formatCurrencyInput(e.target.value)})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" /></div>
              {editandoConta && (
                <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Saldo Atual</label><input type="text" value={formConta.saldo_atual} onChange={e => setFormConta({...formConta, saldo_atual: formatCurrencyInput(e.target.value)})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" /><p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Edite para corrigir manualmente o saldo</p></div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetFormConta} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{editandoConta ? "Salvar" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova/Editar Receita */}
      {showModalReceita && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md p-5 border border-gray-200 dark:border-gray-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editandoReceita ? "Editar Receita" : "Nova Receita"}</h3>
              <button onClick={resetFormReceita} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400 dark:text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmitReceita} className="space-y-4">
              <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Descrição</label><input type="text" value={formReceita.descricao} onChange={e => setFormReceita({...formReceita, descricao: e.target.value})} placeholder="Ex: Salário, Freelance..." className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" required /></div>
              <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Valor</label><input type="text" value={formReceita.valor} onChange={e => setFormReceita({...formReceita, valor: formatCurrencyInput(e.target.value)})} placeholder="R$ 0,00" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Categoria</label><select value={formReceita.categoria} onChange={e => setFormReceita({...formReceita, categoria: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100">{CATEGORIAS_RECEITA.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Tipo</label><select value={formReceita.tipo} onChange={e => setFormReceita({...formReceita, tipo: e.target.value as any})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100">{TIPOS_RECEITA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              </div>
              {formReceita.tipo !== "avulso" && (
                <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Dia do recebimento (1-31)</label><input type="number" min="1" max="31" value={formReceita.dia_recebimento} onChange={e => setFormReceita({...formReceita, dia_recebimento: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" /></div>
              )}
              {formReceita.tipo === "recorrente" && (
                <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Quantos meses?</label><input type="number" min="1" max="60" value={formReceita.num_meses} onChange={e => setFormReceita({...formReceita, num_meses: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100" /></div>
              )}
              {contas.length > 0 && (
                <div><label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Conta (opcional)</label><select value={formReceita.conta_id} onChange={e => setFormReceita({...formReceita, conta_id: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100"><option value="">Sem conta vinculada</option>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetFormReceita} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{editandoReceita ? "Salvar" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
