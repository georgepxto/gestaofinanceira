import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { Gasto, GastoForm, ParcelaAtiva, ResumoMensal } from "../types";
import {
  formatCurrency,
  parseCurrency,
  getParcelasAtivas,
  calcularResumoMensal,
  calcularTotalMes,
} from "../utils/calculations";
import { CATEGORIA_PADRAO } from "../utils/categories";

interface UseGastosProps {
  user: { id: string } | null;
  mesVisualizacao: Date;
  setModalConfirm: (modal: {
    show: boolean;
    titulo: string;
    mensagem: string;
    onConfirm: () => void;
  }) => void;
}

export function useGastos({
  user,
  mesVisualizacao,
  setModalConfirm,
}: UseGastosProps) {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [parcelasAtivas, setParcelasAtivas] = useState<ParcelaAtiva[]>([]);
  const [resumoMensal, setResumoMensal] = useState<ResumoMensal[]>([]);
  const [totalMes, setTotalMes] = useState<number>(0);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editandoGasto, setEditandoGasto] = useState<Gasto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroPessoaGasto, setFiltroPessoaGasto] = useState<string>("");
  const [filtroTipoGasto, setFiltroTipoGasto] = useState<string>("");
  const [filtroDiaGasto, setFiltroDiaGasto] = useState<string>("");

  const [formData, setFormData] = useState<GastoForm>({
    descricao: "",
    pessoa: "",
    valor_total: "",
    num_parcelas: 1,
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    tipo: "credito",
    categoria: CATEGORIA_PADRAO,
    cartao_id: "",
    conta_id: "",
  });



  // Buscar gastos do Supabase
  const fetchGastos = useCallback(async () => {
    if (!supabase) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("gastos")
        .select("*")
        .order("data_inicio", { ascending: false });

      if (fetchError) throw fetchError;

      setGastos(data || []);
    } catch (err) {
      console.error("Erro ao buscar gastos:", err);
      setError(
        "Erro ao carregar gastos. Verifique sua conexão com o Supabase."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar gastos ao iniciar e quando o usuário mudar
  useEffect(() => {
    if (user) {
      fetchGastos();
    }
  }, [user, fetchGastos]);

  // Sincronização em tempo real com Supabase (Realtime)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Inscrever para mudanças na tabela gastos
    const gastosChannel = supabase
      .channel("gastos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gastos" },
        () => {
          fetchGastos();
        }
      )
      .subscribe();

    // Cleanup ao desmontar
    return () => {
      if (supabase) {
        supabase.removeChannel(gastosChannel);
      }
    };
  }, [fetchGastos]);

  // Recalcular parcelas ativas quando muda o mês ou os gastos
  useEffect(() => {
    const parcelas = getParcelasAtivas(gastos, mesVisualizacao);
    setParcelasAtivas(parcelas);
    setResumoMensal(calcularResumoMensal(parcelas));
    setTotalMes(calcularTotalMes(parcelas));
  }, [gastos, mesVisualizacao]);

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) return;

    try {
      setSaving(true);
      setError(null);

      const valorNumerico = parseCurrency(formData.valor_total);

      if (valorNumerico <= 0) {
        setError("O valor deve ser maior que zero.");
        return;
      }

      if (!formData.descricao.trim()) {
        setError("A descrição é obrigatória.");
        return;
      }

      // Se está editando
      if (editandoGasto) {
        const { error: updateError } = await supabase
          .from("gastos")
          .update({
            descricao: formData.descricao.trim(),
            pessoa: formData.pessoa,
            valor_total: valorNumerico,
            num_parcelas: formData.num_parcelas,
            data_inicio: formData.data_inicio,
            tipo: formData.tipo,
            categoria: formData.categoria,
            cartao_id: formData.tipo === "credito" && formData.cartao_id ? formData.cartao_id : null,
            conta_id: formData.tipo === "debito" && formData.conta_id ? formData.conta_id : null,
          })
          .eq("id", editandoGasto.id);

        if (updateError) throw updateError;
        
        // Se for débito, verificar mudança de conta para descontar/estornar saldo
        if (formData.tipo === "debito") {
          const contaAntiga = editandoGasto.conta_id;
          const contaNova = formData.conta_id || "";
          const valorAntigo = editandoGasto.valor_total || 0;
          
          // Caso 1: Tinha conta e removeu → estornar
          if (contaAntiga && !contaNova) {
            const { data: conta } = await supabase.from("contas_bancarias").select("saldo_atual").eq("id", contaAntiga).single();
            if (conta) await supabase.from("contas_bancarias").update({ saldo_atual: (conta.saldo_atual || 0) + valorAntigo }).eq("id", contaAntiga);
          }
          // Caso 2: Não tinha conta e agora tem → descontar
          else if (!contaAntiga && contaNova) {
            const { data: conta } = await supabase.from("contas_bancarias").select("saldo_atual").eq("id", contaNova).single();
            if (conta) await supabase.from("contas_bancarias").update({ saldo_atual: (conta.saldo_atual || 0) - valorNumerico }).eq("id", contaNova);
          }
          // Caso 3: Mesma conta mas valor mudou → ajustar diferença
          else if (contaAntiga && contaNova && contaAntiga === contaNova && valorAntigo !== valorNumerico) {
            const { data: conta } = await supabase.from("contas_bancarias").select("saldo_atual").eq("id", contaNova).single();
            if (conta) {
              const diferenca = valorNumerico - valorAntigo;
              await supabase.from("contas_bancarias").update({ saldo_atual: (conta.saldo_atual || 0) - diferenca }).eq("id", contaNova);
            }
          }
          // Caso 4: Mudou de conta → estornar antiga e descontar nova
          else if (contaAntiga && contaNova && contaAntiga !== contaNova) {
            const { data: contaAntigaData } = await supabase.from("contas_bancarias").select("saldo_atual").eq("id", contaAntiga).single();
            if (contaAntigaData) await supabase.from("contas_bancarias").update({ saldo_atual: (contaAntigaData.saldo_atual || 0) + valorAntigo }).eq("id", contaAntiga);
            const { data: contaNovaData } = await supabase.from("contas_bancarias").select("saldo_atual").eq("id", contaNova).single();
            if (contaNovaData) await supabase.from("contas_bancarias").update({ saldo_atual: (contaNovaData.saldo_atual || 0) - valorNumerico }).eq("id", contaNova);
          }
        }
        
        await fetchGastos();
        setEditandoGasto(null);
      } else {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        const { error: insertError } = await supabase.from("gastos").insert({
          descricao: formData.descricao.trim(),
          pessoa: formData.pessoa,
          valor_total: valorNumerico,
          num_parcelas: formData.num_parcelas,
          data_inicio: formData.data_inicio,
          tipo: formData.tipo,
          categoria: formData.categoria,
          cartao_id: formData.tipo === "credito" && formData.cartao_id ? formData.cartao_id : null,
          conta_id: formData.tipo === "debito" && formData.conta_id ? formData.conta_id : null,
          user_id: currentUser?.id,
        });

        if (insertError) throw insertError;
        
        // Se for débito e tiver conta selecionada, descontar do saldo
        if (formData.tipo === "debito" && formData.conta_id) {
          const { data: conta } = await supabase.from("contas_bancarias").select("saldo_atual").eq("id", formData.conta_id).single();
          if (conta) await supabase.from("contas_bancarias").update({ saldo_atual: (conta.saldo_atual || 0) - valorNumerico }).eq("id", formData.conta_id);
        }
        
        await fetchGastos();
      }

      // Resetar formulário
      setFormData({
        descricao: "",
        pessoa: "",
        valor_total: "",
        num_parcelas: 1,
        data_inicio: format(new Date(), "yyyy-MM-dd"),
        tipo: "credito",
        categoria: CATEGORIA_PADRAO,
        cartao_id: "",
        conta_id: "",
      });
      setShowForm(false);
    } catch (err) {
      console.error("Erro ao salvar gasto:", err);
      setError("Erro ao salvar o gasto. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // Iniciar edição de gasto
  const handleEditGasto = (gasto: Gasto) => {
    setFormData({
      descricao: gasto.descricao,
      pessoa: gasto.pessoa,
      valor_total: formatCurrency(gasto.valor_total).replace("R$\u00a0", ""),
      num_parcelas: gasto.num_parcelas,
      data_inicio: gasto.data_inicio,
      tipo: gasto.tipo,
      categoria: gasto.categoria || CATEGORIA_PADRAO,
      cartao_id: gasto.cartao_id || "",
      conta_id: gasto.conta_id || "",
    });
    setEditandoGasto(gasto);
    setShowForm(true);
  };

  // Excluir gasto
  const handleDelete = async (id: string) => {
    setModalConfirm({
      show: true,
      titulo: "Excluir Lançamento",
      mensagem:
        "Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.",
      onConfirm: async () => {
        if (!supabase) return;
        
        setSaving(true);
        try {
          setError(null);
          
          // Buscar o gasto para verificar se precisa estornar saldo
          const gastoParaExcluir = gastos.find(g => g.id === id);
          if (gastoParaExcluir && gastoParaExcluir.tipo === "debito" && gastoParaExcluir.conta_id) {
            const { data: conta } = await supabase.from("contas_bancarias").select("saldo_atual").eq("id", gastoParaExcluir.conta_id).single();
            if (conta) {
              const saldoEstornado = (conta.saldo_atual || 0) + gastoParaExcluir.valor_total;
              await supabase.from("contas_bancarias").update({ saldo_atual: saldoEstornado }).eq("id", gastoParaExcluir.conta_id);
            }
          }

          const { error: deleteError } = await supabase
            .from("gastos")
            .delete()
            .eq("id", id);

          if (deleteError) throw deleteError;

          await fetchGastos();
          setModalConfirm({
            show: false,
            titulo: "",
            mensagem: "",
            onConfirm: () => {},
          });
        } catch (err) {
          console.error("Erro ao excluir gasto:", err);
          setError("Erro ao excluir o gasto. Tente novamente.");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      descricao: "",
      pessoa: "",
      valor_total: "",
      num_parcelas: 1,
      data_inicio: format(new Date(), "yyyy-MM-dd"),
      tipo: "credito",
      categoria: CATEGORIA_PADRAO,
      cartao_id: "",
      conta_id: "",
    });
    setShowForm(false);
    setEditandoGasto(null);
  };

  return {
    gastos,
    parcelasAtivas,
    resumoMensal,
    totalMes,
    showForm,
    setShowForm,
    editandoGasto,
    setEditandoGasto,
    loading,
    saving,
    error,
    setError,
    filtroPessoaGasto,
    setFiltroPessoaGasto,
    filtroTipoGasto,
    setFiltroTipoGasto,
    filtroDiaGasto,
    setFiltroDiaGasto,
    formData,
    setFormData,
    fetchGastos,
    handleSubmit,
    handleEditGasto,
    handleDelete,
    resetForm,
  };
}
