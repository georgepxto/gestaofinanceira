import { useState, useEffect, useCallback } from "react";
import { Building2, Plus, Loader2, DollarSign, TrendingUp, Trash2, Edit2, X } from "lucide-react";
import { useAppContext } from "../context";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatCurrencyInput, parseCurrency } from "../utils/calculations";
import { CATEGORIAS_RECEITA, TIPOS_RECEITA, CATEGORIA_RECEITA_PADRAO } from "../utils/receitas";
import type { ContaBancaria, Receita, ContaBancariaForm, ReceitaForm } from "../types";

export const ContasBancariasPage = () => {
  const { user, setModalConfirm } = useAppContext();
  
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
    const diaAtual = new Date().getDate();
    const receitasDaConta = receitas.filter(r => r.conta_id === conta.id);
    // Apenas receitas fixas e recorrentes que já venceram (avulso já está no saldo_atual)
    const receitasRecebidas = receitasDaConta.filter(r => {
      if (r.tipo === "avulso") return false; // Avulso já foi adicionado diretamente ao saldo_atual
      if (r.tipo === "fixo" || r.tipo === "recorrente") return r.dia_recebimento <= diaAtual;
      return false;
    });
    // Usar saldo_atual como base (que inclui pagamentos de fatura e receitas avulsas)
    const saldoBase = conta.saldo_atual !== undefined && conta.saldo_atual !== null ? conta.saldo_atual : conta.saldo_inicial;
    return saldoBase + receitasRecebidas.reduce((sum, r) => sum + r.valor, 0);
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
      onConfirm: async () => { if (supabase) { await supabase.from("contas_bancarias").delete().eq("id", id); await fetchContas(); } },
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

  const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
  const saldoTotal = contas.reduce((sum, c) => sum + calcularSaldoConta(c), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="w-7 h-7 text-gray-400" />
        <h1 className="text-2xl font-bold text-white">Contas Bancárias</h1>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 mb-2"><Building2 className="w-4 h-4" /><span className="text-sm">Contas</span></div>
          <p className="text-2xl font-bold text-white">{contas.length}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-green-400 mb-2"><TrendingUp className="w-4 h-4" /><span className="text-sm">Total Receitas</span></div>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(totalReceitas)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-blue-400 mb-2"><DollarSign className="w-4 h-4" /><span className="text-sm">Saldo Total</span></div>
          <p className="text-2xl font-bold text-blue-400">{formatCurrency(saldoTotal)}</p>
        </div>
      </div>

      {/* Seção Contas */}
      <section className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Minhas Contas</h2>
          <button onClick={() => { resetFormConta(); setShowModalConta(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nova Conta
          </button>
        </div>
        {contas.length === 0 ? (
          <div className="text-center py-8"><Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" /><p className="text-gray-400">Nenhuma conta</p></div>
        ) : (
          <div className="space-y-2">
            {contas.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <div><p className="text-white font-medium">{c.nome}</p>{c.banco && <p className="text-gray-400 text-sm">{c.banco}</p>}</div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-blue-400 font-semibold">{formatCurrency(calcularSaldoConta(c))}</p>
                    <p className="text-gray-500 text-xs">Inicial: {formatCurrency(c.saldo_inicial)}</p>
                  </div>
                  <button onClick={() => handleEditConta(c)} className="p-1 hover:bg-gray-600 rounded"><Edit2 className="w-4 h-4 text-gray-400" /></button>
                  <button onClick={() => handleDeleteConta(c.id, c.nome)} className="p-1 hover:bg-gray-600 rounded"><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Seção Receitas Fixas/Recorrentes */}
      <section className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Receitas Programadas</h2>
          <button onClick={() => { resetFormReceita(); setShowModalReceita(true); }} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nova Receita
          </button>
        </div>
        {(() => {
          const receitasProgramadas = receitas.filter(r => r.tipo === "fixo" || r.tipo === "recorrente");
          return receitasProgramadas.length === 0 ? (
            <div className="text-center py-6"><TrendingUp className="w-10 h-10 text-gray-600 mx-auto mb-2" /><p className="text-gray-400 text-sm">Nenhuma receita programada</p></div>
          ) : (
            <div className="space-y-2">
              {receitasProgramadas.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{r.descricao}</p>
                    <p className="text-gray-400 text-sm">
                      {r.categoria} • Dia {r.dia_recebimento} • {r.tipo === "fixo" ? "Fixo (mensal)" : `${r.num_meses}x`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-green-400 font-semibold">{formatCurrency(r.valor)}</p>
                    <button onClick={() => handleEditReceita(r)} className="p-1 hover:bg-gray-600 rounded"><Edit2 className="w-4 h-4 text-gray-400" /></button>
                    <button onClick={() => handleDeleteReceita(r.id, r.descricao)} className="p-1 hover:bg-gray-600 rounded"><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </section>

      {/* Seção Histórico de Transações (Receitas recebidas) */}
      <section className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Histórico de Receitas</h2>
        {(() => {
          const diaAtual = new Date().getDate();
          // Receitas que já foram recebidas: avulsas OU fixas/recorrentes com dia <= hoje
          const receitasRecebidas = receitas.filter(r => {
            if (r.tipo === "avulso") return true;
            if (r.tipo === "fixo" || r.tipo === "recorrente") return r.dia_recebimento <= diaAtual;
            return false;
          });
          return receitasRecebidas.length === 0 ? (
            <div className="text-center py-6"><p className="text-gray-400 text-sm">Nenhuma receita recebida este mês</p></div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {receitasRecebidas.map(r => {
                const contaNome = contas.find(c => c.id === r.conta_id)?.nome || "Sem conta";
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{r.descricao}</p>
                      <p className="text-gray-400 text-sm">
                        {r.tipo === "avulso" ? "Recebido" : `Dia ${r.dia_recebimento}`} • {contaNome} • {r.categoria}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-green-600/30 text-green-300 px-2 py-1 rounded">+ {formatCurrency(r.valor)}</span>
                      <button onClick={() => handleEditReceita(r)} className="p-1 hover:bg-gray-600 rounded"><Edit2 className="w-4 h-4 text-gray-400" /></button>
                      <button onClick={() => handleDeleteReceita(r.id, r.descricao)} className="p-1 hover:bg-gray-600 rounded"><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>

      {/* Modal Nova/Editar Conta */}
      {showModalConta && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{editandoConta ? "Editar Conta" : "Nova Conta Bancária"}</h3>
              <button onClick={resetFormConta} className="p-1 hover:bg-gray-700 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmitConta} className="space-y-4">
              <div><label className="block text-sm text-gray-300 mb-1">Nome da conta</label><input type="text" value={formConta.nome} onChange={e => setFormConta({...formConta, nome: e.target.value})} placeholder="Ex: Conta Corrente, Poupança..." className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" required /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Banco (opcional)</label><input type="text" value={formConta.banco} onChange={e => setFormConta({...formConta, banco: e.target.value})} placeholder="Ex: Nubank, Inter..." className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Saldo inicial</label><input type="text" value={formConta.saldo_inicial} onChange={e => setFormConta({...formConta, saldo_inicial: formatCurrencyInput(e.target.value)})} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" /></div>
              {editandoConta && (
                <div><label className="block text-sm text-gray-300 mb-1">Saldo Atual</label><input type="text" value={formConta.saldo_atual} onChange={e => setFormConta({...formConta, saldo_atual: formatCurrencyInput(e.target.value)})} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" /><p className="text-xs text-gray-400 mt-1">Edite para corrigir manualmente o saldo</p></div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetFormConta} className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{editandoConta ? "Salvar" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova/Editar Receita */}
      {showModalReceita && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md p-5 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{editandoReceita ? "Editar Receita" : "Nova Receita"}</h3>
              <button onClick={resetFormReceita} className="p-1 hover:bg-gray-700 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmitReceita} className="space-y-4">
              <div><label className="block text-sm text-gray-300 mb-1">Descrição</label><input type="text" value={formReceita.descricao} onChange={e => setFormReceita({...formReceita, descricao: e.target.value})} placeholder="Ex: Salário, Freelance..." className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" required /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Valor</label><input type="text" value={formReceita.valor} onChange={e => setFormReceita({...formReceita, valor: formatCurrencyInput(e.target.value)})} placeholder="R$ 0,00" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-300 mb-1">Categoria</label><select value={formReceita.categoria} onChange={e => setFormReceita({...formReceita, categoria: e.target.value})} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">{CATEGORIAS_RECEITA.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-sm text-gray-300 mb-1">Tipo</label><select value={formReceita.tipo} onChange={e => setFormReceita({...formReceita, tipo: e.target.value as any})} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">{TIPOS_RECEITA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              </div>
              {formReceita.tipo !== "avulso" && (
                <div><label className="block text-sm text-gray-300 mb-1">Dia do recebimento (1-31)</label><input type="number" min="1" max="31" value={formReceita.dia_recebimento} onChange={e => setFormReceita({...formReceita, dia_recebimento: e.target.value})} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" /></div>
              )}
              {formReceita.tipo === "recorrente" && (
                <div><label className="block text-sm text-gray-300 mb-1">Quantos meses?</label><input type="number" min="1" max="60" value={formReceita.num_meses} onChange={e => setFormReceita({...formReceita, num_meses: e.target.value})} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" /></div>
              )}
              {contas.length > 0 && (
                <div><label className="block text-sm text-gray-300 mb-1">Conta (opcional)</label><select value={formReceita.conta_id} onChange={e => setFormReceita({...formReceita, conta_id: e.target.value})} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"><option value="">Sem conta vinculada</option>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetFormReceita} className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{editandoReceita ? "Salvar" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
