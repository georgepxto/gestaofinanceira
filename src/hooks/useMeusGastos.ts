import { useState, useEffect, useCallback } from "react";
import { format, addMonths, subMonths } from "date-fns";
import {
  supabase,
  isSupabaseConfigured,
  meusGastosFunctions,
} from "../lib/supabase";
import type { MeuGasto, MeuGastoForm, CartaoCredito } from "../types";
import { formatCurrency, parseCurrency, getMesFaturaCartao } from "../utils/calculations";
import { CATEGORIA_PADRAO } from "../utils/categories";

interface UseMeusGastosProps {
  user: { id: string } | null;
  mesVisualizacao: Date;
  setModalConfirm: (modal: {
    show: boolean;
    titulo: string;
    mensagem: string;
    onConfirm: () => void;
    confirmLabel?: string;
    confirmColor?: "red" | "green" | "blue" | "indigo" | "purple";
  }) => void;
  cartoes: CartaoCredito[];
  cartoesLoading?: boolean;
  onRefreshGastos?: () => Promise<void>;
}

export function useMeusGastos({
  user,
  mesVisualizacao,
  setModalConfirm,
  cartoes,
  cartoesLoading = false,
  onRefreshGastos,
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
    categoria_gasto: "",
    data: format(new Date(), "yyyy-MM-dd"),
    dividido_com: "",
    minha_parte: "",
    dia_vencimento: "",
    num_parcelas: "1",
    cartao_id: "",
    conta_id: "",
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
  const meusGastosDoMes = cartoesLoading ? [] : meusGastos.filter((g) => {
    let mesGasto = g.data.substring(0, 7);

    // Lógica da fatura do cartão de crédito
    if (g.tipo === "credito" && g.cartao_id) {
      const cartao = cartoes.find((c) => c.id === g.cartao_id);
      if (cartao && cartao.melhor_dia_compra) {
        const proxMesDate = getMesFaturaCartao(g.data, cartao.melhor_dia_compra, cartao.dia_vencimento);
        mesGasto = format(proxMesDate, "yyyy-MM");
      }
    }

    const mesAtual = format(mesVisualizacao, "yyyy-MM");
    const matchMes = mesGasto === mesAtual;
    const matchCategoria = filtroCategoriaMeuGasto
      ? g.categoria === filtroCategoriaMeuGasto
      : g.categoria !== "fixo";
    return matchMes && matchCategoria;
  });

  const gastosFixos = meusGastos.filter((g) => {
    if (g.categoria !== "fixo") return false;
    
    let mesCriacao = g.data.substring(0, 7);
    
    // Se for no cartão de crédito, o mês de "início" é o mês da primeira fatura
    if (g.tipo === "credito" && g.cartao_id) {
      const cartao = cartoes.find((c) => c.id === g.cartao_id);
      if (cartao && cartao.melhor_dia_compra) {
        const proxMesDate = getMesFaturaCartao(g.data, cartao.melhor_dia_compra, cartao.dia_vencimento);
        mesCriacao = format(proxMesDate, "yyyy-MM");
      }
    }

    // Mostrar apenas se o mês de visualização for igual ou posterior ao mês de criação real
    const mesAtual = format(mesVisualizacao, "yyyy-MM");
    return mesAtual >= mesCriacao;
  });

  const totalMeusGastosCredito = meusGastosDoMes
    .filter((g) => g.tipo === "credito")
    .reduce(
      (acc, g) =>
        acc +
        (g.dividido_com && g.minha_parte ? g.minha_parte : g.valor),
      0
    );

  const totalMeusGastosDebito = meusGastosDoMes
    .filter((g) => g.tipo === "debito")
    .reduce(
      (acc, g) =>
        acc +
        (g.dividido_com && g.minha_parte ? g.minha_parte : g.valor),
      0
    );

  const totalMeusGastosPagos = meusGastosDoMes
    .filter((g) => g.pago)
    .reduce(
      (acc, g) =>
        acc +
        (g.dividido_com && g.minha_parte ? g.minha_parte : g.valor),
      0
    );

  const totalGastosFixos = gastosFixos
    .filter((g) => {
      if (g.ativo === false) return false;
      
      const mesAtualView = format(mesVisualizacao, "yyyy-MM");
      if (g.meses_suspensos?.includes(mesAtualView)) return false;

      const mesHoje = format(new Date(), "yyyy-MM");
      if (mesAtualView === mesHoje && g.dia_vencimento) {
        const hoje = new Date().getDate();
        if (hoje < g.dia_vencimento) return false;
      }

      return true;
    })
    .reduce((acc, g) => acc + g.valor, 0);

  // Adicionar meu gasto
  const handleAddMeuGasto = async () => {
    const valor = parseCurrency(formMeuGasto.valor);
    if (!formMeuGasto.descricao || valor <= 0) {
      setError("Preencha todos os campos corretamente.");
      return;
    }

    let minhaParte = valor;
    if (formMeuGasto.dividido_com && formMeuGasto.minha_parte) {
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
        const [ano, mes, dia] = formMeuGasto.data.split("-").map(Number);
        const dataInicio = new Date(ano, mes - 1, dia);

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
            dividido_com: formMeuGasto.dividido_com ? formMeuGasto.dividido_com : undefined,
            minha_parte: formMeuGasto.dividido_com ? minhaParte / numParcelas : undefined,
            num_parcelas: numParcelas,
            parcela_atual: i + 1,
            cartao_id: formMeuGasto.tipo === "credito" ? formMeuGasto.cartao_id || undefined : undefined,
            categoria_gasto: formMeuGasto.categoria_gasto || undefined,
          };

          if (isSupabaseConfigured && supabase) {
            await meusGastosFunctions.create(novoGasto);

            // Criar despesa compartilhada para as outras pessoas na aba "Gastos"
            if (formMeuGasto.dividido_com) {
              const nomes = formMeuGasto.dividido_com.split(",").map((n) => n.trim()).filter(Boolean);
              if (nomes.length > 0) {
                const valorRestante = valorParcela - (minhaParte / numParcelas);
                const valorPorPessoa = valorRestante / nomes.length;
                
                if (valorPorPessoa > 0) {
                  const promessasGastos = nomes.map(async (nome) => {
                    const gastoCompartilhado = {
                      descricao: `Dividido: ${formMeuGasto.descricao} (${i + 1}/${numParcelas})`,
                      pessoa: nome,
                      valor_total: valorPorPessoa,
                      num_parcelas: 1, // Já está sendo dividido na parcela atual do loop
                      data_inicio: format(dataParcela, "yyyy-MM-dd"),
                      tipo: formMeuGasto.tipo,
                      categoria: formMeuGasto.categoria_gasto || CATEGORIA_PADRAO,
                      recorrente: false,
                      cartao_id: formMeuGasto.tipo === "credito" ? formMeuGasto.cartao_id || null : null,
                      conta_id: formMeuGasto.tipo === "debito" ? formMeuGasto.conta_id || null : null,
                      user_id: user?.id,
                    };
                    return supabase!.from("gastos").insert(gastoCompartilhado);
                  });
                  await Promise.all(promessasGastos);
                }
              }
            }
          }
          setMeusGastos((prev) => [...prev, novoGasto]);
        }
      } else {
        const dataGasto = formMeuGasto.data;
        const hojeIso = format(new Date(), "yyyy-MM-dd");
        const isFuture = dataGasto > hojeIso;

        const isPago = formMeuGasto.tipo === "debito" && !isFuture;

        const novoGasto: MeuGasto = {
          id: Date.now().toString(),
          descricao: formMeuGasto.descricao,
          valor: valor,
          tipo: formMeuGasto.tipo,
          categoria: formMeuGasto.categoria,
          data: formMeuGasto.data,
          pago: isPago,
          dividido_com: formMeuGasto.dividido_com ? formMeuGasto.dividido_com : undefined,
          minha_parte: formMeuGasto.dividido_com ? minhaParte : undefined,
          dia_vencimento:
            formMeuGasto.categoria === "fixo"
              ? parseInt(formMeuGasto.dia_vencimento)
              : undefined,
          ativo: formMeuGasto.categoria === "fixo" ? true : undefined,
          num_parcelas: 1,
          parcela_atual: 1,
          cartao_id: formMeuGasto.tipo === "credito" ? formMeuGasto.cartao_id || undefined : undefined,
          conta_id: formMeuGasto.tipo === "debito" ? formMeuGasto.conta_id || undefined : undefined,
          categoria_gasto: formMeuGasto.categoria_gasto || undefined,
        };

        if (isSupabaseConfigured && supabase) {
          await meusGastosFunctions.create(novoGasto);
          
          // Criar despesa compartilhada para as outras pessoas na aba "Gastos"
          if (formMeuGasto.dividido_com) {
            const nomes = formMeuGasto.dividido_com.split(",").map((n) => n.trim()).filter(Boolean);
            if (nomes.length > 0) {
              const valorRestante = valor - minhaParte;
              const valorPorPessoa = valorRestante / nomes.length;
              
              if (valorPorPessoa > 0) {
                const promessasGastos = nomes.map(async (nome) => {
                  const gastoCompartilhado = {
                    descricao: `Dividido: ${formMeuGasto.descricao}`,
                    pessoa: nome,
                    valor_total: valorPorPessoa,
                    num_parcelas: 1,
                    data_inicio: formMeuGasto.data,
                    tipo: formMeuGasto.tipo,
                    categoria: formMeuGasto.categoria_gasto || CATEGORIA_PADRAO,
                    recorrente: formMeuGasto.categoria === "fixo", // Fixos vão como recorrentes
                    cartao_id: formMeuGasto.tipo === "credito" ? formMeuGasto.cartao_id || null : null,
                    conta_id: formMeuGasto.tipo === "debito" ? formMeuGasto.conta_id || null : null,
                    user_id: user?.id,
                  };
                  return supabase!.from("gastos").insert(gastoCompartilhado);
                });
                await Promise.all(promessasGastos);
              }
            }
          }
          
          // Se for débito e tiver conta selecionada, descontar do saldo Apenas se não for data futura
          if (isPago && formMeuGasto.conta_id && formMeuGasto.categoria !== "fixo") {
            const { data: contaAtual } = await supabase
              .from("contas_bancarias")
              .select("saldo_atual")
              .eq("id", formMeuGasto.conta_id)
              .single();
            
            if (contaAtual) {
              const novoSaldo = (contaAtual.saldo_atual || 0) - valor;
              await supabase
                .from("contas_bancarias")
                .update({ saldo_atual: novoSaldo })
                .eq("id", formMeuGasto.conta_id);
            }
          }
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
      categoria_gasto: gasto.categoria_gasto || "",
      data: gasto.data,
      dividido_com: gasto.dividido_com || "",
      minha_parte: minhaParteTotal
        ? formatCurrency(minhaParteTotal).replace("R$\u00a0", "")
        : "",
      dia_vencimento: gasto.dia_vencimento?.toString() || "",
      num_parcelas: numParcelas.toString(),
      cartao_id: gasto.cartao_id || "",
      conta_id: gasto.conta_id || "",
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
        if (formMeuGasto.dividido_com && formMeuGasto.minha_parte) {
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
        const [ano, mes, dia] = formMeuGasto.data.split("-").map(Number);
        const dataAtualSelecionada = new Date(ano, mes - 1, dia);
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
              categoria_gasto: formMeuGasto.categoria_gasto || undefined,
              data: dataFormatada,
              dividido_com: formMeuGasto.dividido_com ? formMeuGasto.dividido_com : undefined,
              minha_parte: formMeuGasto.dividido_com ? minhaParte / novoNumParcelas : undefined,
              num_parcelas: novoNumParcelas,
              parcela_atual: numParcela,
              dia_vencimento:
                formMeuGasto.categoria === "fixo"
                  ? parseInt(formMeuGasto.dia_vencimento)
                  : undefined,
              cartao_id: formMeuGasto.tipo === "credito" ? formMeuGasto.cartao_id || undefined : undefined,
              conta_id: formMeuGasto.tipo === "debito" ? formMeuGasto.conta_id || undefined : undefined,
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
                
                // Se for débito, verificar mudança de conta para descontar/estornar saldo (ignorando gastos fixos)
                if (formMeuGasto.tipo === "debito" && formMeuGasto.categoria !== "fixo" && existente.categoria !== "fixo") {
                  const contaAntiga = existente.conta_id;
                  const contaNova = formMeuGasto.conta_id || "";
                  const valorAntigo = existente.valor || 0;
                  
                  // Caso 1: Tinha conta e removeu → estornar
                  if (contaAntiga && !contaNova) {
                    const { data: conta } = await supabase
                      .from("contas_bancarias")
                      .select("saldo_atual")
                      .eq("id", contaAntiga)
                      .single();
                    
                    if (conta) {
                      const saldoEstornado = (conta.saldo_atual || 0) + valorAntigo;
                      await supabase
                        .from("contas_bancarias")
                        .update({ saldo_atual: saldoEstornado })
                        .eq("id", contaAntiga);
                    }
                  }
                  // Caso 2: Não tinha conta e agora tem → descontar
                  else if (!contaAntiga && contaNova) {
                    const { data: conta } = await supabase
                      .from("contas_bancarias")
                      .select("saldo_atual")
                      .eq("id", contaNova)
                      .single();
                    
                    if (conta) {
                      const novoSaldo = (conta.saldo_atual || 0) - novoValorParcela;
                      await supabase
                        .from("contas_bancarias")
                        .update({ saldo_atual: novoSaldo })
                        .eq("id", contaNova);
                    }
                  }
                  // Caso 3: Mesma conta mas valor mudou → ajustar diferença
                  else if (contaAntiga && contaNova && contaAntiga === contaNova && valorAntigo !== novoValorParcela) {
                    const { data: conta } = await supabase
                      .from("contas_bancarias")
                      .select("saldo_atual")
                      .eq("id", contaNova)
                      .single();
                    
                    if (conta) {
                      const diferenca = novoValorParcela - valorAntigo;
                      const novoSaldo = (conta.saldo_atual || 0) - diferenca;
                      await supabase
                        .from("contas_bancarias")
                        .update({ saldo_atual: novoSaldo })
                        .eq("id", contaNova);
                    }
                  }
                  // Caso 4: Mudou de conta → estornar antiga e descontar nova
                  else if (contaAntiga && contaNova && contaAntiga !== contaNova) {
                    // Estornar conta antiga
                    const { data: contaAntigaData } = await supabase
                      .from("contas_bancarias")
                      .select("saldo_atual")
                      .eq("id", contaAntiga)
                      .single();
                    
                    if (contaAntigaData) {
                      const saldoEstornado = (contaAntigaData.saldo_atual || 0) + valorAntigo;
                      await supabase
                        .from("contas_bancarias")
                        .update({ saldo_atual: saldoEstornado })
                        .eq("id", contaAntiga);
                    }
                    
                    // Descontar nova conta
                    const { data: contaNovaData } = await supabase
                      .from("contas_bancarias")
                      .select("saldo_atual")
                      .eq("id", contaNova)
                      .single();
                    
                    if (contaNovaData) {
                      const novoSaldo = (contaNovaData.saldo_atual || 0) - novoValorParcela;
                      await supabase
                        .from("contas_bancarias")
                        .update({ saldo_atual: novoSaldo })
                        .eq("id", contaNova);
                    }
                  }
                }
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
    
    if (onRefreshGastos && formMeuGasto.dividido_com) {
      await onRefreshGastos();
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
        if (gasto.tipo === "credito") {
          const { data: contas } = await supabase.from("contas_bancarias").select("*").order("nome").limit(1);
          if (contas && contas.length > 0) {
            const conta = contas[0];
            const diferenca = novoStatus ? gasto.valor : -gasto.valor;
            const novoSaldo = (conta.saldo_atual || 0) - diferenca;
            
            await supabase.from("contas_bancarias")
              .update({ saldo_atual: novoSaldo })
              .eq("id", conta.id);
          }
        } else if (gasto.tipo === "debito" && gasto.conta_id && gasto.categoria !== "fixo") {
          const { data: contaAtual } = await supabase
            .from("contas_bancarias")
            .select("saldo_atual")
            .eq("id", gasto.conta_id)
            .single();

          if (contaAtual) {
            const diferenca = novoStatus ? gasto.valor : -gasto.valor;
            const novoSaldo = (contaAtual.saldo_atual || 0) - diferenca;
            await supabase
              .from("contas_bancarias")
              .update({ saldo_atual: novoSaldo })
              .eq("id", gasto.conta_id);
          }
        }
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
              
              if (parcela.dividido_com) {
                const descCompartilhada = `Dividido: ${parcela.descricao}`;
                await supabase
                  .from("gastos")
                  .delete()
                  .eq("descricao", descCompartilhada)
                  .in("pessoa", parcela.dividido_com.split(",").map(n => n.trim()));
              }
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

  // Suspender gasto fixo em um mês específico
  const handleToggleSuspenderGastoFixo = async (id: string, mesRef: Date) => {
    const gasto = meusGastos.find((g) => g.id === id);
    if (!gasto) return;

    const mesStr = format(mesRef, "yyyy-MM");
    const mesesSuspensos = gasto.meses_suspensos || [];
    
    let novoArray: string[];
    if (mesesSuspensos.includes(mesStr)) {
      novoArray = mesesSuspensos.filter(m => m !== mesStr);
    } else {
      novoArray = [...mesesSuspensos, mesStr];
    }

    setSaving(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await meusGastosFunctions.update(id, { meses_suspensos: novoArray });
      }

      setMeusGastos((prev) =>
        prev.map((g) => (g.id === id ? { ...g, meses_suspensos: novoArray } : g))
      );
    } finally {
      setSaving(false);
    }
  };

  // Pagar todos os gastos de crédito pendentes do mês atual
  const handlePagarTodosCredito = async () => {
    const pendentes = meusGastosDoMes.filter(g => g.tipo === "credito" && !g.pago);
    if (pendentes.length === 0) return;

    setModalConfirm({
      show: true,
      titulo: "Pagar Fatura de Crédito",
      mensagem: `Deseja dar baixa como pago em todos os ${pendentes.length} gastos de crédito listados neste mês?`,
      confirmLabel: "Pagar Todos",
      confirmColor: "green",
      onConfirm: async () => {
        if (!supabase) return;
        setSaving(true);
        try {
          // Descontar do saldo total
          const valorTotal = pendentes.reduce((acc, g) => acc + (g.valor || 0), 0);
          if (valorTotal > 0) {
            const { data: contasInfo } = await supabase.from("contas_bancarias").select("*").order("nome").limit(1);
            if (contasInfo && contasInfo.length > 0) {
              const conta = contasInfo[0];
              const novoSaldo = (conta.saldo_atual || 0) - valorTotal;
              await supabase.from("contas_bancarias").update({ saldo_atual: novoSaldo }).eq("id", conta.id);
            }
          }

          const ids = pendentes.map(g => g.id);
          const { error: updateError } = await supabase
            .from("meus_gastos")
            .update({ pago: true })
            .in("id", ids);

          if (updateError) throw updateError;

          setMeusGastos((prev) =>
            prev.map((g) => ids.includes(g.id) ? { ...g, pago: true } : g)
          );
          setModalConfirm({ show: false, titulo: "", mensagem: "", onConfirm: () => {} });
        } catch (err) {
          console.error("Erro ao pagar todos:", err);
          setError("Erro ao pagar gastos de crédito. Tente novamente.");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // Resetar formulário
  const resetForm = () => {
    setFormMeuGasto({
      descricao: "",
      valor: "",
      tipo: "debito",
      categoria: "pessoal",
      categoria_gasto: "",
      data: format(new Date(), "yyyy-MM-dd"),
      dividido_com: "",
      minha_parte: "",
      dia_vencimento: "",
      num_parcelas: "1",
      cartao_id: "",
      conta_id: "",
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
    handleToggleSuspenderGastoFixo,
    handlePagarTodosCredito,
    resetForm,
  };
}
