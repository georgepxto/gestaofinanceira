import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  supabase,
  isSupabaseConfigured,
  pagamentosParciaisFunctions,
} from "../lib/supabase";
import type { PagamentoParcial } from "../types/extended";
import { formatCurrency, parseCurrency } from "../utils/calculations";

interface UsePagamentosParciaisProps {
  user: { id: string } | null;
  getObsKey: (pessoa: string) => string;
  getMesAtual: () => string;
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
  resumoMensal: { pessoa: string; total: number }[];
  setError: (error: string | null) => void;
}

export function usePagamentosParciais({
  user,
  getObsKey,
  getMesAtual,
  setModalConfirm,
  setModalFeedback,
  resumoMensal,
  setError,
}: UsePagamentosParciaisProps) {
  const [pagamentosParciais, setPagamentosParciais] = useState<
    Record<string, PagamentoParcial[]>
  >({});
  const [showPagamentoParcial, setShowPagamentoParcial] = useState<
    string | null
  >(null);
  const [valorPagamentoParcial, setValorPagamentoParcial] =
    useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Carregar pagamentos parciais do Supabase (ou localStorage como fallback)
  const fetchPagamentosParciais = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      const saved = localStorage.getItem("pagamentosParciais");
      if (saved) {
        setPagamentosParciais(JSON.parse(saved));
      }
      return;
    }

    try {
      const data = await pagamentosParciaisFunctions.getAll();
      const pagMap: Record<string, PagamentoParcial[]> = {};
      data.forEach((item) => {
        const key = `${item.pessoa}_${item.mes}`;
        if (!pagMap[key]) pagMap[key] = [];
        pagMap[key].push({
          id: item.id,
          valor: Number(item.valor),
          data: item.data_pagamento,
        });
      });
      setPagamentosParciais(pagMap);
    } catch (err) {
      console.error("Erro ao carregar pagamentos parciais:", err);
    }
  }, []);

  // Carregar pagamentos quando usuário logar
  useEffect(() => {
    if (user) {
      fetchPagamentosParciais();
    }
  }, [user, fetchPagamentosParciais]);

  // Salvar pagamentos no localStorage como backup (modo demo)
  useEffect(() => {
    if (!isSupabaseConfigured && Object.keys(pagamentosParciais).length > 0) {
      localStorage.setItem(
        "pagamentosParciais",
        JSON.stringify(pagamentosParciais)
      );
    }
  }, [pagamentosParciais]);

  // Obter pagamentos parciais de uma pessoa no mês atual
  const getPagamentosParciais = useCallback(
    (pessoa: string): PagamentoParcial[] => {
      const key = getObsKey(pessoa);
      return pagamentosParciais[key] || [];
    },
    [pagamentosParciais, getObsKey]
  );

  // Calcular total pago parcialmente por uma pessoa no mês
  const getTotalPagoParcial = useCallback(
    (pessoa: string): number => {
      return getPagamentosParciais(pessoa).reduce((acc, p) => acc + p.valor, 0);
    },
    [getPagamentosParciais]
  );

  // Adicionar pagamento parcial
  const handleAddPagamentoParcial = async (pessoa: string) => {
    const valor = parseCurrency(valorPagamentoParcial);
    if (valor <= 0) {
      setError("Valor de pagamento inválido.");
      return;
    }

    const resumoPessoa = resumoMensal.find((r) => r.pessoa === pessoa);
    const totalDevido = resumoPessoa?.total || 0;
    const jaPago = getTotalPagoParcial(pessoa);
    const restante = totalDevido - jaPago;

    if (valor > restante) {
      setError(`O valor não pode ser maior que ${formatCurrency(restante)}.`);
      return;
    }

    const dataPagamento = format(new Date(), "dd/MM/yyyy");
    const mes = getMesAtual();
    const key = getObsKey(pessoa);

    setSaving(true);
    try {
      // Salvar no Supabase
      if (isSupabaseConfigured && supabase) {
        const result = await pagamentosParciaisFunctions.create({
          pessoa,
          mes,
          valor,
          data_pagamento: dataPagamento,
        });

        if (result) {
          setPagamentosParciais((prev) => ({
            ...prev,
            [key]: [
              ...(prev[key] || []),
              { id: result.id, valor, data: dataPagamento },
            ],
          }));
        }
      } else {
        // Modo demo - salvar localmente
        setPagamentosParciais((prev) => ({
          ...prev,
          [key]: [...(prev[key] || []), { valor, data: dataPagamento }],
        }));
      }

      setValorPagamentoParcial("");
      setShowPagamentoParcial(null);
      setError(null);

      setModalFeedback({
        show: true,
        titulo: "Pagamento Registrado!",
        mensagem: `${pessoa} pagou ${formatCurrency(
          valor
        )}.\nFalta: ${formatCurrency(restante - valor)}`,
        tipo: "sucesso",
      });
    } finally {
      setSaving(false);
    }
  };

  // Remover último pagamento parcial (desfazer)
  const handleDesfazerPagamentoParcial = (pessoa: string) => {
    const key = getObsKey(pessoa);
    const pagamentos = pagamentosParciais[key] || [];

    if (pagamentos.length === 0) return;

    const ultimoPagamento = pagamentos[pagamentos.length - 1];

    setModalConfirm({
      show: true,
      titulo: "Desfazer Pagamento",
      mensagem: `Deseja remover o pagamento de ${formatCurrency(
        ultimoPagamento.valor
      )} feito em ${ultimoPagamento.data}?`,
      onConfirm: async () => {
        setSaving(true);
        try {
          // Deletar do Supabase se tiver ID
          if (isSupabaseConfigured && supabase && ultimoPagamento.id) {
            await pagamentosParciaisFunctions.delete(ultimoPagamento.id);
          }

          setPagamentosParciais((prev) => ({
            ...prev,
            [key]: pagamentos.slice(0, -1),
          }));
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

  return {
    pagamentosParciais,
    setPagamentosParciais,
    showPagamentoParcial,
    setShowPagamentoParcial,
    valorPagamentoParcial,
    setValorPagamentoParcial,
    saving,
    fetchPagamentosParciais,
    getPagamentosParciais,
    getTotalPagoParcial,
    handleAddPagamentoParcial,
    handleDesfazerPagamentoParcial,
  };
}
