import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import type { ContaBancaria, ContaBancariaForm, Receita, ReceitaForm } from "../types";
import { parseCurrency } from "../utils/calculations";
import { CATEGORIA_RECEITA_PADRAO } from "../utils/receitas";

interface UseContasBancariasProps {
  user: { id: string } | null;
}

export function useContasBancarias({ user }: UseContasBancariasProps) {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forms
  const [showFormConta, setShowFormConta] = useState(false);
  const [editandoConta, setEditandoConta] = useState<ContaBancaria | null>(null);
  const [formConta, setFormConta] = useState<ContaBancariaForm>({
    nome: "",
    banco: "",
    saldo_inicial: "0,00",
  });

  const [showFormReceita, setShowFormReceita] = useState(false);
  const [editandoReceita, setEditandoReceita] = useState<Receita | null>(null);
  const [formReceita, setFormReceita] = useState<ReceitaForm>({
    conta_id: "",
    descricao: "",
    valor: "",
    categoria: CATEGORIA_RECEITA_PADRAO,
    tipo: "avulso",
    data: format(new Date(), "yyyy-MM-dd"),
    num_meses: "1",
  });

  // Fetch contas
  const fetchContas = useCallback(async () => {
    if (!supabase || !user) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("contas_bancarias")
        .select("*")
        .order("nome");

      if (fetchError) throw fetchError;
      setContas(data || []);
    } catch (err) {
      console.error("Erro ao buscar contas:", err);
      setError("Erro ao carregar contas bancárias.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch receitas
  const fetchReceitas = useCallback(async () => {
    if (!supabase || !user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("receitas")
        .select("*")
        .order("data", { ascending: false });

      if (fetchError) throw fetchError;
      setReceitas(data || []);
    } catch (err) {
      console.error("Erro ao buscar receitas:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchContas();
      fetchReceitas();
    }
  }, [user, fetchContas, fetchReceitas]);

  // Adicionar/Editar conta
  const handleSubmitConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;

    setSaving(true);
    setError(null);

    try {
      const saldoNumerico = parseCurrency(formConta.saldo_inicial);

      if (editandoConta) {
        const { error: updateError } = await supabase
          .from("contas_bancarias")
          .update({
            nome: formConta.nome.trim(),
            banco: formConta.banco.trim(),
            saldo_inicial: saldoNumerico,
          })
          .eq("id", editandoConta.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("contas_bancarias")
          .insert({
            nome: formConta.nome.trim(),
            banco: formConta.banco.trim(),
            saldo_inicial: saldoNumerico,
            user_id: user.id,
          });

        if (insertError) throw insertError;
      }

      await fetchContas();
      resetFormConta();
    } catch (err) {
      console.error("Erro ao salvar conta:", err);
      setError("Erro ao salvar conta bancária.");
    } finally {
      setSaving(false);
    }
  };

  // Excluir conta
  const handleDeleteConta = async (id: string) => {
    if (!supabase) return;

    try {
      const { error: deleteError } = await supabase
        .from("contas_bancarias")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
      await fetchContas();
    } catch (err) {
      console.error("Erro ao excluir conta:", err);
      setError("Erro ao excluir conta bancária.");
    }
  };

  // Adicionar/Editar receita
  const handleSubmitReceita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;

    setSaving(true);
    setError(null);

    try {
      const valorNumerico = parseCurrency(formReceita.valor);

      if (editandoReceita) {
        const { error: updateError } = await supabase
          .from("receitas")
          .update({
            conta_id: formReceita.conta_id || null,
            descricao: formReceita.descricao.trim(),
            valor: valorNumerico,
            categoria: formReceita.categoria,
            tipo: formReceita.tipo,
            data: formReceita.data,
            num_meses: formReceita.tipo === "recorrente" ? parseInt(formReceita.num_meses) : 1,
          })
          .eq("id", editandoReceita.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("receitas")
          .insert({
            conta_id: formReceita.conta_id || null,
            descricao: formReceita.descricao.trim(),
            valor: valorNumerico,
            categoria: formReceita.categoria,
            tipo: formReceita.tipo,
            data: formReceita.data,
            num_meses: formReceita.tipo === "recorrente" ? parseInt(formReceita.num_meses) : 1,
            user_id: user.id,
          });

        if (insertError) throw insertError;
      }

      await fetchReceitas();
      resetFormReceita();
    } catch (err) {
      console.error("Erro ao salvar receita:", err);
      setError("Erro ao salvar receita.");
    } finally {
      setSaving(false);
    }
  };

  // Excluir receita
  const handleDeleteReceita = async (id: string) => {
    if (!supabase) return;

    try {
      const { error: deleteError } = await supabase
        .from("receitas")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
      await fetchReceitas();
    } catch (err) {
      console.error("Erro ao excluir receita:", err);
    }
  };

  // Reset forms
  const resetFormConta = () => {
    setFormConta({ nome: "", banco: "", saldo_inicial: "0,00" });
    setShowFormConta(false);
    setEditandoConta(null);
  };

  const resetFormReceita = () => {
    setFormReceita({
      conta_id: "",
      descricao: "",
      valor: "",
      categoria: CATEGORIA_RECEITA_PADRAO,
      tipo: "avulso",
      data: format(new Date(), "yyyy-MM-dd"),
      num_meses: "1",
    });
    setShowFormReceita(false);
    setEditandoReceita(null);
  };

  // Calcular saldo total
  const calcularSaldoTotal = () => {
    const saldoInicial = contas.reduce((sum, c) => sum + c.saldo_inicial, 0);
    const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
    return saldoInicial + totalReceitas;
  };

  return {
    contas,
    receitas,
    loading,
    saving,
    error,
    showFormConta,
    setShowFormConta,
    editandoConta,
    setEditandoConta,
    formConta,
    setFormConta,
    showFormReceita,
    setShowFormReceita,
    editandoReceita,
    setEditandoReceita,
    formReceita,
    setFormReceita,
    handleSubmitConta,
    handleDeleteConta,
    handleSubmitReceita,
    handleDeleteReceita,
    resetFormConta,
    resetFormReceita,
    calcularSaldoTotal,
    fetchContas,
    fetchReceitas,
  };
}
