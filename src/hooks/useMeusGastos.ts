import { useState, useEffect, useCallback } from "react";
import { format, addMonths, subMonths } from "date-fns";
import {
  supabase,
  isSupabaseConfigured,
  meusGastosFunctions,
} from "../lib/supabase";
import type { MeuGasto, MeuGastoForm } from "../types";
import { formatCurrency, parseCurrency } from "../utils/calculations";

interface UseMeusGastosProps {
  user: { id: string } | null;
  mesVisualizacao: Date;
  setModalConfirm: (modal: {
    show: boolean;
    titulo: string;
    mensagem: string;
    onConfirm: () => void;
  }) => void;
}

export function useMeusGastos({
  user,
  mesVisualizacao,
  setModalConfirm,
}: UseMeusGastosProps) {
  const [meusGastos, setMeusGastos] = useState<MeuGasto[]>([]);
  const [meusGastosLoaded, setMeusGastosLoaded] = useState<boolean>(false);
  const [showFormMeuGasto, setShowFormMeuGasto] = useState<boolean>(false);
  const [editandoMeuGasto, setEditandoMeuGasto] = useState<MeuGasto | null>(
    null
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroCategoriaMeuGasto, setFiltroCategoriaMeuGasto] =
    useState<string>("");
  const [filtroDiaMeuGasto, setFiltroDiaMeuGasto] = useState<string>("");

  const [formMeuGasto, setFormMeuGasto] = useState<MeuGastoForm>({
    descricao: "",
    valor: "",
    tipo: "debito",
    categoria: "pessoal",
    data: format(new Date(), "yyyy-MM-dd"),
    dividido_com: "",
    minha_parte: "",
    dia_vencimento: "",
    num_parcelas: "1",
  });

  // Carregar meus gastos do Supabase (ou localStorage como fallback)
  const fetchMeusGastos = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      const saved = localStorage.getItem("meusGastos");
      setMeusGastos(saved ? JSON.parse(saved) : []);
      setMeusGastosLoaded(true);
      return;
    }

    try {
      const data = await meusGastosFunctions.getAll();
      setMeusGastos(data);
    } catch (err) {
      console.error("Erro ao carregar meus gastos:", err);
      setMeusGastos([]);
    }
    setMeusGastosLoaded(true);
  }, []);

  // Carregar dados ao iniciar e quando o usuário mudar
  useEffect(() => {
    if (user) {
      fetchMeusGastos();
    }
  }, [user, fetchMeusGastos]);

  // Salvar meus gastos no localStorage como backup
  useEffect(() => {
    if (meusGastosLoaded) {
      localStorage.setItem("meusGastos", JSON.stringify(meusGastos));
    }
  }, [meusGastos, meusGastosLoaded]);

  // Valores derivados
  const meusGastosDoMes = meusGastos.filter((g) => {
    const mesGasto = g.data.substring(0, 7);
    const mesAtual = format(mesVisualizacao, "yyyy-MM");
    const matchMes = mesGasto === mesAtual;
    const matchCategoria = filtroCategoriaMeuGasto
      ? g.categoria === filtroCategoriaMeuGasto
      : g.categoria !== "fixo";
    return matchMes && matchCategoria;
  });

  const gastosFixos = meusGastos.filter((g) => g.categoria === "fixo");

  const totalMeusGastosCredito = meusGastosDoMes
    .filter((g) => g.tipo === "credito")
    .reduce(
      (acc, g) =>
        acc +
        (g.categoria === "dividido" && g.minha_parte ? g.minha_parte : g.valor),
      0
    );

  const totalMeusGastosDebito = meusGastosDoMes
    .filter((g) => g.tipo === "debito")
    .reduce(
      (acc, g) =>
        acc +
        (g.categoria === "dividido" && g.minha_parte ? g.minha_parte : g.valor),
      0
    );

  const totalMeusGastosPagos = meusGastosDoMes
    .filter((g) => g.pago || g.tipo === "debito")
    .reduce(
      (acc, g) =>
        acc +
        (g.categoria === "dividido" && g.minha_parte ? g.minha_parte : g.valor),
      0
    );

  const totalGastosFixos = gastosFixos
    .filter((g) => g.ativo !== false)
    .reduce((acc, g) => acc + g.valor, 0);

  // Adicionar meu gasto
  const handleAddMeuGasto = async () => {
    const valor = parseCurrency(formMeuGasto.valor);
    if (!formMeuGasto.descricao || valor <= 0) {
      setError("Preencha todos os campos corretamente.");
      return;
    }

    let minhaParte = valor;
    if (formMeuGasto.categoria === "dividido" && formMeuGasto.minha_parte) {
      minhaParte = parseCurrency(formMeuGasto.minha_parte);
    }

    const numParcelas =
      formMeuGasto.tipo === "credito"
        ? parseInt(formMeuGasto.num_parcelas) || 1
        : 1;
    const valorParcela = valor / numParcelas;

    setSaving(true);
    try {
      if (formMeuGasto.tipo === "credito" && numParcelas > 1) {
        const dataInicio = new Date(formMeuGasto.data);

        for (let i = 0; i < numParcelas; i++) {
          const dataParcela = new Date(dataInicio);
          dataParcela.setMonth(dataParcela.getMonth() + i);

          const novoGasto: MeuGasto = {
            id: `${Date.now()}-${i}`,
            descricao: `${formMeuGasto.descricao} (${i + 1}/${numParcelas})`,
            valor: valorParcela,
            tipo: formMeuGasto.tipo,
            categoria: formMeuGasto.categoria,
            data: format(dataParcela, "yyyy-MM-dd"),
            pago: false,
            dividido_com:
              formMeuGasto.categoria === "dividido"
                ? formMeuGasto.dividido_com
                : undefined,
            minha_parte:
              formMeuGasto.categoria === "dividido"
                ? minhaParte / numParcelas
                : undefined,
            num_parcelas: numParcelas,
            parcela_atual: i + 1,
          };

          if (isSupabaseConfigured && supabase) {
            await meusGastosFunctions.create(novoGasto);
          }
          setMeusGastos((prev) => [...prev, novoGasto]);
        }
      } else {
        const novoGasto: MeuGasto = {
          id: Date.now().toString(),
          descricao: formMeuGasto.descricao,
          valor: valor,
          tipo: formMeuGasto.tipo,
          categoria: formMeuGasto.categoria,
          data: formMeuGasto.data,
          pago: formMeuGasto.tipo === "debito",
          dividido_com:
            formMeuGasto.categoria === "dividido"
              ? formMeuGasto.dividido_com
              : undefined,
          minha_parte:
            formMeuGasto.categoria === "dividido" ? minhaParte : undefined,
          dia_vencimento:
            formMeuGasto.categoria === "fixo"
              ? parseInt(formMeuGasto.dia_vencimento)
              : undefined,
          ativo: formMeuGasto.categoria === "fixo" ? true : undefined,
          num_parcelas: 1,
          parcela_atual: 1,
        };

        if (isSupabaseConfigured && supabase) {
          await meusGastosFunctions.create(novoGasto);
        }
        setMeusGastos((prev) => [...prev, novoGasto]);
      }

      resetForm();
    } finally {
      setSaving(false);
    }
  };

  // Editar meu gasto
  const handleEditMeuGasto = (gasto: MeuGasto) => {
    const numParcelas = gasto.num_parcelas || 1;
    const valorTotal = gasto.valor * numParcelas;
    const minhaParteTotal = gasto.minha_parte
      ? gasto.minha_parte * numParcelas
      : undefined;

    setFormMeuGasto({
      descricao: gasto.descricao.replace(/\s*\(\d+\/\d+\)$/, ""),
      valor: formatCurrency(valorTotal).replace("R$\u00a0", ""),
      tipo: gasto.tipo,
      categoria: gasto.categoria,
      data: gasto.data,
      dividido_com: gasto.dividido_com || "",
      minha_parte: minhaParteTotal
        ? formatCurrency(minhaParteTotal).replace("R$\u00a0", "")
        : "",
      dia_vencimento: gasto.dia_vencimento?.toString() || "",
      num_parcelas: numParcelas.toString(),
    });
    setEditandoMeuGasto(gasto);
    setShowFormMeuGasto(true);
  };

  // Salvar edição de meu gasto
  const handleSaveMeuGasto = async () => {
    if (editandoMeuGasto) {
      const valor = parseCurrency(formMeuGasto.valor);
      if (!formMeuGasto.descricao || valor <= 0) {
        setError("Preencha todos os campos corretamente.");
        return;
      }

      setSaving(true);
      try {
        let minhaParte = valor;
        if (formMeuGasto.categoria === "dividido" && formMeuGasto.minha_parte) {
          minhaParte = parseCurrency(formMeuGasto.minha_parte);
        }

        const novoNumParcelas =
          formMeuGasto.tipo === "credito"
            ? parseInt(formMeuGasto.num_parcelas) || 1
            : 1;
        const novoValorParcela = valor / novoNumParcelas;

        const descricaoBaseOriginal = editandoMeuGasto.descricao.replace(
          /\s*\(\d+\/\d+\)$/,
          ""
        );
        const numParcelasOriginal = editandoMeuGasto.num_parcelas || 1;

        const parcelasRelacionadas = meusGastos.filter((g) => {
          const descBase = g.descricao.replace(/\s*\(\d+\/\d+\)$/, "");
          return (
            descBase === descricaoBaseOriginal &&
            g.num_parcelas === numParcelasOriginal
          );
        });

        const indiceParcelaEditada = (editandoMeuGasto.parcela_atual || 1) - 1;
        const dataAtualSelecionada = new Date(formMeuGasto.data);
        const dataInicioReal = subMonths(
          dataAtualSelecionada,
          indiceParcelaEditada
        );

        const maxParcelas = Math.max(
          parcelasRelacionadas.length,
          novoNumParcelas
        );

        for (let i = 0; i < maxParcelas; i++) {
          const numParcela = i + 1;
          const existente = parcelasRelacionadas.find(
            (p) => (p.parcela_atual || 1) === numParcela
          );

          if (numParcela <= novoNumParcelas) {
            const dataParcela = addMonths(dataInicioReal, i);
            const dataFormatada = format(dataParcela, "yyyy-MM-dd");

            const dadosAtualizados: Partial<MeuGasto> = {
              descricao:
                novoNumParcelas > 1
                  ? `${formMeuGasto.descricao} (${numParcela}/${novoNumParcelas})`
                  : formMeuGasto.descricao,
              valor: novoValorParcela,
              tipo: formMeuGasto.tipo,
              categoria: formMeuGasto.categoria,
              data: dataFormatada,
              dividido_com:
                formMeuGasto.categoria === "dividido"
                  ? formMeuGasto.dividido_com
                  : undefined,
              minha_parte:
                formMeuGasto.categoria === "dividido"
                  ? minhaParte / novoNumParcelas
                  : undefined,
              num_parcelas: novoNumParcelas,
              parcela_atual: numParcela,
              dia_vencimento:
                formMeuGasto.categoria === "fixo"
                  ? parseInt(formMeuGasto.dia_vencimento)
                  : undefined,
              pago:
                formMeuGasto.tipo === "debito"
                  ? true
                  : existente
                  ? existente.pago
                  : false,
            };

            if (existente) {
              if (isSupabaseConfigured && supabase) {
                await meusGastosFunctions.update(existente.id, dadosAtualizados);
              }
              setMeusGastos((prev) =>
                prev.map((g) =>
                  g.id === existente.id ? { ...g, ...dadosAtualizados } : g
                )
              );
            } else {
              const novoId = `${Date.now()}-${i}`;
              const novoGasto: MeuGasto = {
                id: novoId,
                descricao: dadosAtualizados.descricao || "",
                valor: dadosAtualizados.valor || 0,
                tipo: dadosAtualizados.tipo || "debito",
                categoria: dadosAtualizados.categoria || "pessoal",
                data: dadosAtualizados.data || "",
                pago: dadosAtualizados.pago || false,
                dividido_com: dadosAtualizados.dividido_com,
                minha_parte: dadosAtualizados.minha_parte,
                num_parcelas: dadosAtualizados.num_parcelas,
                parcela_atual: dadosAtualizados.parcela_atual,
                dia_vencimento: dadosAtualizados.dia_vencimento,
              };

              if (isSupabaseConfigured && supabase) {
                await meusGastosFunctions.create(novoGasto);
              }
              setMeusGastos((prev) => [...prev, novoGasto]);
            }
          } else {
            if (existente) {
              if (isSupabaseConfigured && supabase) {
                await meusGastosFunctions.delete(existente.id);
              }
              setMeusGastos((prev) =>
                prev.filter((g) => g.id !== existente.id)
              );
            }
          }
        }

        resetForm();
      } finally {
        setSaving(false);
      }
    } else {
      await handleAddMeuGasto();
    }
  };

  // Marcar meu gasto como pago/não pago
  const handleTogglePagoMeuGasto = async (id: string) => {
    const gasto = meusGastos.find((g) => g.id === id);
    if (!gasto) return;

    const novoStatus = !gasto.pago;
    const updates = {
      pago: novoStatus,
      data_pagamento: novoStatus ? format(new Date(), "yyyy-MM-dd") : undefined,
    };

    setSaving(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await meusGastosFunctions.update(id, updates);
      }

      setMeusGastos((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
      );
    } finally {
      setSaving(false);
    }
  };

  // Excluir meu gasto
  const handleDeleteMeuGasto = (id: string) => {
    const gastoParaExcluir = meusGastos.find((g) => g.id === id);
    if (!gastoParaExcluir) return;

    const descricaoBase = gastoParaExcluir.descricao.replace(
      /\s*\(\d+\/\d+\)$/,
      ""
    );
    const numParcelas = gastoParaExcluir.num_parcelas || 1;

    const parcelasRelacionadas = meusGastos.filter((g) => {
      const descBase = g.descricao.replace(/\s*\(\d+\/\d+\)$/, "");
      return descBase === descricaoBase && g.num_parcelas === numParcelas;
    });

    const mensagem =
      parcelasRelacionadas.length > 1
        ? `Tem certeza que deseja excluir este gasto e todas as suas ${parcelasRelacionadas.length} parcelas?`
        : "Tem certeza que deseja excluir este gasto?";

    setModalConfirm({
      show: true,
      titulo: "Excluir Gasto",
      mensagem,
      onConfirm: async () => {
        setSaving(true);
        try {
          for (const parcela of parcelasRelacionadas) {
            if (isSupabaseConfigured && supabase) {
              await meusGastosFunctions.delete(parcela.id);
            }
          }

          const idsParaExcluir = new Set(parcelasRelacionadas.map((p) => p.id));
          setMeusGastos((prev) =>
            prev.filter((g) => !idsParaExcluir.has(g.id))
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

  // Desativar gasto fixo
  const handleToggleGastoFixo = async (id: string) => {
    const gasto = meusGastos.find((g) => g.id === id);
    if (!gasto) return;

    const novoStatus = !gasto.ativo;

    setSaving(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await meusGastosFunctions.update(id, { ativo: novoStatus });
      }

      setMeusGastos((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ativo: novoStatus } : g))
      );
    } finally {
      setSaving(false);
    }
  };

  // Resetar formulário
  const resetForm = () => {
    setFormMeuGasto({
      descricao: "",
      valor: "",
      tipo: "debito",
      categoria: "pessoal",
      data: format(new Date(), "yyyy-MM-dd"),
      dividido_com: "",
      minha_parte: "",
      dia_vencimento: "",
      num_parcelas: "1",
    });
    setShowFormMeuGasto(false);
    setEditandoMeuGasto(null);
    setError(null);
  };

  return {
    meusGastos,
    setMeusGastos,
    meusGastosLoaded,
    showFormMeuGasto,
    setShowFormMeuGasto,
    editandoMeuGasto,
    setEditandoMeuGasto,
    saving,
    error,
    setError,
    filtroCategoriaMeuGasto,
    setFiltroCategoriaMeuGasto,
    filtroDiaMeuGasto,
    setFiltroDiaMeuGasto,
    formMeuGasto,
    setFormMeuGasto,
    meusGastosDoMes,
    gastosFixos,
    totalMeusGastosCredito,
    totalMeusGastosDebito,
    totalMeusGastosPagos,
    totalGastosFixos,
    fetchMeusGastos,
    handleAddMeuGasto,
    handleEditMeuGasto,
    handleSaveMeuGasto,
    handleTogglePagoMeuGasto,
    handleDeleteMeuGasto,
    handleToggleGastoFixo,
    resetForm,
  };
}
