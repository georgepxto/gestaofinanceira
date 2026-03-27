import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  supabase,
  isSupabaseConfigured,
  saldosFunctions,
  pagamentosParciaisFunctions,
} from "../lib/supabase";
import type { SaldoDevedor, SaldoDevedorForm, ResumoMensal } from "../types";
import type { PagamentoParcial } from "../types/extended";
import { formatCurrency, parseCurrency, formatMonthYear } from "../utils/calculations";
import { toast } from "../components/ui/Toaster";

interface UseSaldosDevedoresProps {
  user: { id: string } | null;
  mesVisualizacao: Date;
  resumoMensal: ResumoMensal[];
  getTotalPagoParcial: (pessoa: string) => number;
  getObsKey: (pessoa: string) => string;
  getMesAtual: () => string;
  setPagamentosParciais: React.Dispatch<
    React.SetStateAction<Record<string, PagamentoParcial[]>>
  >;
  setModalConfirm: (modal: {
    show: boolean;
    titulo: string;
    mensagem: string;
    onConfirm: () => void;
  }) => void;
  setModalFeedback: (modal: {
    show: boolean;
    titulo: string;
    mensagem: string;
    tipo: "sucesso" | "info";
  }) => void;
  fetchPessoas: () => Promise<void>;
  fetchSaldosExternal?: () => Promise<void>;
  onRefreshAfterClose?: () => Promise<void> | void;
}

export function useSaldosDevedores({
  user,
  mesVisualizacao,
  resumoMensal,
  getTotalPagoParcial,
  getObsKey,
  getMesAtual,
  setPagamentosParciais,
  setModalConfirm,
  setModalFeedback,
  fetchPessoas,
  onRefreshAfterClose,
}: UseSaldosDevedoresProps) {
  const [saldosDevedores, setSaldosDevedores] = useState<SaldoDevedor[]>([]);
  const [saldosLoaded, setSaldosLoaded] = useState<boolean>(false);
  const [showFormDivida, setShowFormDivida] = useState<boolean>(false);
  const [showPagamento, setShowPagamento] = useState<string | null>(null);
  const [valorPagamento, setValorPagamento] = useState<string>("");
  const [obsPagamento, setObsPagamento] = useState<string>("");
  const [showFecharMes, setShowFecharMes] = useState<string | null>(null);
  const [valorPagoFecharMes, setValorPagoFecharMes] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Meses fechados: rastreia fechamentos por pessoa/mês com referência ao saldo devedor criado
  // Formato da chave: "pessoa|mes" (ex: "João|janeiro 2026")
  const [mesesFechados, setMesesFechados] = useState<Record<string, { saldoDevedorId?: string; valorPago: number; valorDevedor: number }>>({});

  // Filtros
  const [filtroPessoaDivida, setFiltroPessoaDivida] = useState<string>("");
  const [filtroStatusDivida, setFiltroStatusDivida] = useState<
    "pendentes" | "pagos"
  >("pendentes");

  const [formDivida, setFormDivida] = useState<SaldoDevedorForm>({
    pessoa: "",
    descricao: "",
    valor: "",
  });



  // Carregar saldos devedores do Supabase (ou localStorage como fallback)
  const fetchSaldos = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Fallback para localStorage em modo demo
      const saved = localStorage.getItem("saldosDevedores");
      setSaldosDevedores(saved ? JSON.parse(saved) : []);
      setSaldosLoaded(true);
      return;
    }

    try {
      const data = await saldosFunctions.getAll();
      setSaldosDevedores(data);
    } catch (err) {
      console.error("Erro ao carregar saldos:", err);
      setSaldosDevedores([]);
    }
    setSaldosLoaded(true);
  }, []);

  // Carregar saldos ao iniciar e quando o usuário mudar
  useEffect(() => {
    if (user) {
      fetchSaldos();
    }
  }, [user, fetchSaldos]);

  // Salvar saldos devedores no localStorage como backup
  useEffect(() => {
    if (saldosLoaded && saldosDevedores.length >= 0) {
      localStorage.setItem("saldosDevedores", JSON.stringify(saldosDevedores));
    }
  }, [saldosDevedores, saldosLoaded]);

  // Sincronização em tempo real com Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const saldosChannel = supabase
      .channel("saldos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "saldos_devedores" },
        () => {
          fetchSaldos();
        }
      )
      .subscribe();

    const pessoasChannel = supabase
      .channel("pessoas-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pessoas" },
        () => {
          fetchPessoas();
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(saldosChannel);
        supabase.removeChannel(pessoasChannel);
      }
    };
  }, [fetchSaldos, fetchPessoas]);

  // Valores derivados
  const dividasFiltradas = saldosDevedores.filter((d) => {
    const matchStatus =
      filtroStatusDivida === "pendentes"
        ? d.valor_atual > 0
        : d.valor_atual === 0;
    const matchPessoa = filtroPessoaDivida
      ? d.pessoa === filtroPessoaDivida
      : true;
    return matchStatus && matchPessoa;
  });

  const totalPendentes = saldosDevedores.filter(
    (d) => d.valor_atual > 0
  ).length;
  const totalPagos = saldosDevedores.filter((d) => d.valor_atual === 0).length;

  const totalDividasPendentes = dividasFiltradas.reduce(
    (acc, d) => acc + d.valor_atual,
    0
  );

  const totalDividasQuitadas = dividasFiltradas.reduce(
    (acc, d) => acc + d.valor_original,
    0
  );

  const pessoasComDividas = [...new Set(saldosDevedores.map((d) => d.pessoa))];

  // Adicionar nova dívida
  const handleAddDivida = async () => {
    const valor = parseCurrency(formDivida.valor);
    if (!formDivida.pessoa || !formDivida.descricao || valor <= 0) {
      setError("Preencha todos os campos corretamente.");
      return;
    }

    setSaving(true);
    try {
      const novaDivida: SaldoDevedor = {
        id: Date.now().toString(),
        pessoa: formDivida.pessoa,
        descricao: formDivida.descricao,
        valor_original: valor,
        valor_atual: valor,
        data_criacao: format(new Date(), "yyyy-MM-dd"),
        historico: [],
      };

      if (isSupabaseConfigured && supabase) {
        await saldosFunctions.create(novaDivida);
      }

      setSaldosDevedores((prev) => [...prev, novaDivida]);
      setFormDivida({ pessoa: "", descricao: "", valor: "" });
      setShowFormDivida(false);
      setError(null);
      toast.success("Dívida adicionada com sucesso!");
    } finally {
      setSaving(false);
    }
  };

  // Registrar pagamento de dívida
  const handlePagamento = async (dividaId: string) => {
    const valor = parseCurrency(valorPagamento);
    if (valor <= 0) {
      setModalFeedback({
        show: true,
        titulo: "Erro",
        tipo: "info",
        mensagem: "Valor de pagamento inválido.",
      });
      return;
    }

    const valorArredondado = Math.round(valor * 100) / 100;
    const dividaAtual = saldosDevedores.find((d) => d.id === dividaId);
    if (!dividaAtual) return;

    const maximoArredondado = Math.round(dividaAtual.valor_atual * 100) / 100;

    if (valorArredondado > maximoArredondado + 0.01) {
      setModalFeedback({
        show: true,
        titulo: "Erro",
        tipo: "info",
        mensagem: `O valor não pode ser maior que ${formatCurrency(
          maximoArredondado
        )}.`,
      });
      return;
    }

    const valorFinal = Math.min(valorArredondado, maximoArredondado);

    setSaving(true);
    try {
      const novoValor = Math.max(
        0,
        Math.round((dividaAtual.valor_atual - valorFinal) * 100) / 100
      );
      const novoHistorico = [
        ...dividaAtual.historico,
        {
          id: Date.now().toString(),
          valor: valorFinal,
          data: format(new Date(), "yyyy-MM-dd"),
          observacao: obsPagamento || undefined,
        },
      ];

      if (isSupabaseConfigured && supabase) {
        await saldosFunctions.update(dividaId, {
          valor_atual: novoValor,
          historico: novoHistorico,
        });
      }

      setSaldosDevedores((prev) =>
        prev.map((divida) => {
          if (divida.id === dividaId) {
            return {
              ...divida,
              valor_atual: novoValor,
              historico: novoHistorico,
            };
          }
          return divida;
        })
      );

      setValorPagamento("");
      setObsPagamento("");
      setShowPagamento(null);
      setModalFeedback({
        show: true,
        titulo: "Sucesso",
        tipo: "sucesso",
        mensagem: `Pagamento de ${formatCurrency(
          valorFinal
        )} registrado com sucesso!`,
      });
    } catch (err) {
      setModalFeedback({
        show: true,
        titulo: "Erro",
        tipo: "info",
        mensagem:
          err instanceof Error
            ? err.message
            : "Erro ao registrar pagamento. Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Desfazer pagamento
  const handleDesfazerPagamento = (
    dividaId: string,
    pagamentoId: string,
    valorPagamentoParam: number
  ) => {
    setModalConfirm({
      show: true,
      titulo: "Desfazer Pagamento",
      mensagem: `Tem certeza que deseja desfazer este pagamento de ${formatCurrency(
        valorPagamentoParam
      )}? O valor será adicionado de volta à dívida.`,
      onConfirm: async () => {
        setSaving(true);
        try {
          const dividaAtual = saldosDevedores.find((d) => d.id === dividaId);
          if (!dividaAtual) return;

          const novoValorAtual =
            Math.round((dividaAtual.valor_atual + valorPagamentoParam) * 100) / 100;
          const novoHistorico = dividaAtual.historico.filter(
            (p) => p.id !== pagamentoId
          );

          if (isSupabaseConfigured && supabase) {
            await saldosFunctions.update(dividaId, {
              valor_atual: novoValorAtual,
              historico: novoHistorico,
            });
          }

          setSaldosDevedores((prev) =>
            prev.map((divida) => {
              if (divida.id === dividaId) {
                return {
                  ...divida,
                  valor_atual: novoValorAtual,
                  historico: novoHistorico,
                };
              }
              return divida;
            })
          );
          setModalConfirm({
            show: false,
            titulo: "",
            mensagem: "",
            onConfirm: () => {},
          });
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // Excluir dívida
  const handleDeleteDivida = (id: string) => {
    setModalConfirm({
      show: true,
      titulo: "Excluir Dívida",
      mensagem:
        "Tem certeza que deseja excluir esta dívida? Esta ação não pode ser desfeita.",
      onConfirm: async () => {
        setSaving(true);
        try {
          if (isSupabaseConfigured && supabase) {
            await saldosFunctions.delete(id);
          }
          setSaldosDevedores((prev) => prev.filter((d) => d.id !== id));
          setModalConfirm({
            show: false,
            titulo: "",
            mensagem: "",
            onConfirm: () => {},
          });
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // Fechar mês de uma pessoa
  const handleFecharMes = async (pessoa: string) => {
    const resumoPessoa = resumoMensal.find((r) => r.pessoa === pessoa);
    if (!resumoPessoa) return;

    const jaPago = getTotalPagoParcial(pessoa);
    const totalDevido = resumoPessoa.total;
    const totalRestante = totalDevido - jaPago;
    const valorPago = parseCurrency(valorPagoFecharMes);

    if (valorPago < 0) {
      setError("Valor pago inválido.");
      return;
    }

    if (valorPago > totalRestante + 0.01) {
      setError(
        `O valor pago não pode ser maior que o restante (${formatCurrency(
          totalRestante
        )}).`
      );
      return;
    }

    const valorDevedor = totalRestante - valorPago;

    setSaving(true);
    try {
      // Registrar o pagamento se houver valor pago
      if (valorPago > 0) {
        const dataPagamento = format(new Date(), "dd/MM/yyyy");
        const mes = getMesAtual();
        const key = getObsKey(pessoa);

        if (isSupabaseConfigured && supabase) {
          const result = await pagamentosParciaisFunctions.create({
            pessoa,
            mes,
            valor: valorPago,
            data_pagamento: dataPagamento,
          });

          if (result) {
            setPagamentosParciais((prev) => ({
              ...prev,
              [key]: [
                ...(prev[key] || []),
                { id: result.id, valor: valorPago, data: dataPagamento },
              ],
            }));
          }
        } else {
          setPagamentosParciais((prev) => ({
            ...prev,
            [key]: [
              ...(prev[key] || []),
              { valor: valorPago, data: dataPagamento },
            ],
          }));
        }
      }

      if (valorDevedor > 0) {
        const novaDivida: SaldoDevedor = {
          id: Date.now().toString(),
          pessoa: pessoa,
          descricao: `Gastos pendentes - ${formatMonthYear(mesVisualizacao)}`,
          valor_original: valorDevedor,
          valor_atual: valorDevedor,
          data_criacao: format(new Date(), "yyyy-MM-dd"),
          historico: [],
        };

        if (isSupabaseConfigured && supabase) {
          await saldosFunctions.create(novaDivida);
        }

        setSaldosDevedores((prev) => [...prev, novaDivida]);
        
        // Salvar fechamento com referência ao saldo devedor
        const mesFechadoKey = `${pessoa}|${getMesAtual()}`;
        setMesesFechados((prev) => ({
          ...prev,
          [mesFechadoKey]: {
            saldoDevedorId: novaDivida.id,
            valorPago,
            valorDevedor,
          },
        }));
      } else {
        // Fechou pagando tudo - salvar fechamento sem saldo devedor
        const mesFechadoKey = `${pessoa}|${getMesAtual()}`;
        setMesesFechados((prev) => ({
          ...prev,
          [mesFechadoKey]: {
            valorPago,
            valorDevedor: 0,
          },
        }));
      }

      setValorPagoFecharMes("");
      setShowFecharMes(null);
      setError(null);

      if (valorDevedor > 0) {
        setModalFeedback({
          show: true,
          titulo: "Mês Fechado!",
          mensagem: `${pessoa} pagou ${formatCurrency(
            valorPago
          )}.\n${formatCurrency(
            valorDevedor
          )} foi transferido para o Saldo Devedor.`,
          tipo: "info",
        });
      } else {
        setModalFeedback({
          show: true,
          titulo: "Mês Fechado!",
          mensagem: `${pessoa} quitou o restante de ${formatCurrency(
            valorPago
          )}.`,
          tipo: "sucesso",
        });
      }
      
      // Chamar callback de refresh após fechar mês
      if (onRefreshAfterClose) {
        console.log("Chamando onRefreshAfterClose...");
        await onRefreshAfterClose();
      }
    } finally {
      setSaving(false);
    }
  };

  // Verificar se um mês está fechado para uma pessoa
  const isMesFechado = (pessoa: string): boolean => {
    const key = `${pessoa}|${getMesAtual()}`;
    return !!mesesFechados[key];
  };

  // Obter dados do fechamento de um mês
  const getMesFechado = (pessoa: string) => {
    const key = `${pessoa}|${getMesAtual()}`;
    return mesesFechados[key] || null;
  };

  // Desfazer o fechamento do mês de uma pessoa
  const handleDesfazerFechamento = async (pessoa: string) => {
    const key = `${pessoa}|${getMesAtual()}`;
    const fechamento = mesesFechados[key];
    
    if (!fechamento) return;

    setSaving(true);
    try {
      // Se tinha saldo devedor associado, remover
      if (fechamento.saldoDevedorId) {
        if (isSupabaseConfigured && supabase) {
          await supabase
            .from("saldos_devedores")
            .delete()
            .eq("id", fechamento.saldoDevedorId);
        }
        
        // Remover do estado local
        setSaldosDevedores((prev) => 
          prev.filter((s) => s.id !== fechamento.saldoDevedorId)
        );
      }

      // Remover o fechamento do mês
      setMesesFechados((prev) => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });

      // Limpar pagamentos parciais da pessoa para este mês
      const pagamentosKey = getObsKey(pessoa);
      const mes = getMesAtual();
      
      // Deletar do Supabase
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from("pagamentos_parciais")
          .delete()
          .eq("pessoa", pessoa)
          .eq("mes", mes);
      }
      
      // Limpar do estado local
      setPagamentosParciais((prev: Record<string, { id?: string; valor: number; data: string }[]>) => {
        const newState = { ...prev };
        delete newState[pagamentosKey];
        return newState;
      });

      setModalFeedback({
        show: true,
        titulo: "Fechamento Desfeito!",
        mensagem: `O fechamento do mês de ${pessoa} foi desfeito. Os pagamentos parciais foram removidos.${
          fechamento.saldoDevedorId 
            ? ` O saldo devedor de ${formatCurrency(fechamento.valorDevedor)} foi removido.` 
            : ""
        }`,
        tipo: "info",
      });

      // Chamar callback de refresh
      if (onRefreshAfterClose) {
        await onRefreshAfterClose();
      }
    } catch (err) {
      console.error("Erro ao desfazer fechamento:", err);
      setError("Erro ao desfazer fechamento do mês.");
    } finally {
      setSaving(false);
    }
  };

  return {
    saldosDevedores,
    setSaldosDevedores,
    saldosLoaded,
    showFormDivida,
    setShowFormDivida,
    showPagamento,
    setShowPagamento,
    valorPagamento,
    setValorPagamento,
    obsPagamento,
    setObsPagamento,
    showFecharMes,
    setShowFecharMes,
    valorPagoFecharMes,
    setValorPagoFecharMes,
    saving,
    error,
    setError,
    filtroPessoaDivida,
    setFiltroPessoaDivida,
    filtroStatusDivida,
    setFiltroStatusDivida,
    formDivida,
    setFormDivida,
    dividasFiltradas,
    totalPendentes,
    totalPagos,
    totalDividasPendentes,
    totalDividasQuitadas,
    pessoasComDividas,
    fetchSaldos,
    handleAddDivida,
    handlePagamento,
    handleDesfazerPagamento,
    handleDeleteDivida,
    handleFecharMes,
    isMesFechado,
    getMesFechado,
    handleDesfazerFechamento,
  };
}
