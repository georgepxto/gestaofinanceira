import { useState, useEffect, useCallback } from "react";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import {
  supabase,
  isSupabaseConfigured,
  gastosFunctions,
  meusGastosFunctions,
} from "../lib/supabase";
import type { MeuGasto, MeuGastoForm, CartaoCredito } from "../types";
import { formatCurrencyValue, parseCurrency } from "../utils/calculations";
import { PARCELAS_MAX } from "../utils/constants";
import { normalizarCategoria } from "../utils/categories";
import { mesDoGasto } from "../utils/gastosDoMes";
import { inicioParaNovoRecorrente, manterSaldoAoMudar } from "../utils/saldo";
import { ptBR } from "date-fns/locale";
import { toast } from "../components/ui/Toaster";
import { categoriaPadraoAtual } from "./useCategorias";

// (helper gerarId removed - not needed)

// Helper para preparar gasto para enviar ao Supabase (remove campos que não existem no DB)
function prepararGastoParaSupabase(gasto: MeuGasto): Omit<MeuGasto, 'dividido_com_pessoas'> & { dividido_com?: string } {
  const { dividido_com_pessoas, ...gastoSemMultiplasPessoas } = gasto as any;
  
  // Se houver múltiplas pessoas, serializar em JSON dentro de dividido_com
  if (dividido_com_pessoas && dividido_com_pessoas.length > 0) {
    return {
      ...gastoSemMultiplasPessoas,
      dividido_com: JSON.stringify(dividido_com_pessoas)
    };
  }
  
  return gastoSemMultiplasPessoas;
}

// Helper para processar gasto carregado do Supabase (parsear dividido_com se for JSON)
function processarGastoDoSupabase(gasto: any): MeuGasto {
  // Se dividido_com for uma string que parece JSON, converter para array
  if (typeof gasto.dividido_com === 'string' && gasto.dividido_com.startsWith('[')) {
    try {
      gasto.dividido_com_pessoas = JSON.parse(gasto.dividido_com);
      // Manter dividido_com como string para compatibilidade
    } catch (e) {
      // Se não conseguir parsear, deixar como está
    }
  }
  return gasto as MeuGasto;
}

async function criarLancamentoEmprestimoDoMes(
  pessoa: string,
  descricao: string,
  valorTotalPorPessoa: number,
  numParcelas: number,
  dataInicio: string,
  categoriaGasto?: string,
  tipo: "credito" | "debito" = "credito"
) {
  if (!isSupabaseConfigured || !supabase) return;

  await gastosFunctions.create({
    descricao: `${descricao} - ${pessoa}`,
    pessoa,
    valor_total: valorTotalPorPessoa,
    num_parcelas: numParcelas,
    data_inicio: dataInicio,
    tipo,
    // O empréstimo em si já é a entidade (Dívidas / Saldos Devedores); sem
    // categoria escolhida, o gasto espelhado cai no padrão da lista da pessoa.
    categoria: categoriaGasto || categoriaPadraoAtual("gasto"),
    recorrente: false,
    cartao_id: undefined,
    conta_id: undefined,
  });
}
// Note: saldo devedor behavior removed - no associated deletion needed

/**
 * Apaga as cobranças que um gasto dividido espelhou em A receber (tabela
 * `gastos`). Não há chave ligando os dois: o espelho é achado pelo nome que
 * `criarLancamentoEmprestimoDoMes` dá ("<descrição> - <pessoa>", com
 * " (N parcelas)" quando parcelado), pela pessoa e pela data da 1ª parcela —
 * a da compra ou a da fatura (espelhos antigos usavam a da compra).
 * Sem isto, excluir o gasto deixava a cobrança órfã e cada edição a duplicava.
 */
/**
 * Data da cobrança espelho: a do mês em que a compra pesa. No crédito depois
 * do melhor dia, a fatura é a do mês seguinte, e a cobrança da pessoa vai
 * junto — antes ela caía no mês da compra e o gasto, na fatura seguinte.
 */
function dataDoEspelho(
  dataIso: string,
  tipo: string,
  cartaoId: string | undefined,
  cartoes: CartaoCredito[]
): string {
  const g = { data: dataIso, tipo, cartao_id: cartaoId } as MeuGasto;
  return mesDoGasto(g, cartoes) === dataIso.substring(0, 7)
    ? dataIso
    : format(addMonths(parseISO(dataIso), 1), "yyyy-MM-dd");
}

async function removerEspelhosDoDividido(gasto: MeuGasto, datasPossiveis: string[]) {
  if (!isSupabaseConfigured || !supabase || gasto.categoria !== "dividido") return;
  const pessoas = gasto.dividido_com_pessoas?.length
    ? gasto.dividido_com_pessoas
    : gasto.dividido_com
      ? [gasto.dividido_com]
      : [];
  if (pessoas.length === 0) return;

  const base = gasto.descricao.replace(/\s*\(\d+\/\d+\)$/, "");
  const n = gasto.num_parcelas || 1;
  const nome = n > 1 ? `${base} (${n} parcelas)` : base;
  const { data } = await supabase
    .from("gastos")
    .select("id")
    .in("pessoa", pessoas)
    .in("descricao", pessoas.map((p) => `${nome} - ${p}`))
    .in("data_inicio", datasPossiveis);
  for (const row of data || []) await gastosFunctions.delete(row.id);
}

interface UseMeusGastosProps {
  user: { id: string } | null;
  mesVisualizacao: Date;
  setModalConfirm: (modal: {
    show: boolean;
    titulo: string;
    mensagem: string;
    onConfirm: () => void;
  }) => void;
  setModalFeedback: (modal: { show: boolean; titulo: string; mensagem: string; tipo: "sucesso" | "info" }) => void;
  cartoes: CartaoCredito[];
  cartoesLoading?: boolean;
  onRefreshGastos?: () => Promise<void>;
}

export function useMeusGastos({
  user,
  mesVisualizacao,
  setModalConfirm,
  setModalFeedback,
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
    dividido_com_pessoas: [],
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
      setMeusGastos(data.map(processarGastoDoSupabase));
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
    // No crédito, o mês da fatura (utils/gastosDoMes, a mesma regra do Início).
    const mesGasto = mesDoGasto(g, cartoes);

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

    if (
      formMeuGasto.tipo === "credito" &&
      (!Number.isInteger(numParcelas) || numParcelas < 1 || numParcelas > PARCELAS_MAX)
    ) {
      setError(`Número de parcelas inválido. Use entre 1 e ${PARCELAS_MAX}.`);
      return;
    }

    const valorParcela = valor / numParcelas;

    setSaving(true);
    try {
      if (formMeuGasto.tipo === "credito" && numParcelas > 1) {
        const dataInicio = parseISO(formMeuGasto.data);

        for (let i = 0; i < numParcelas; i++) {
          // `parseISO` lê a data no fuso local; `new Date("aaaa-mm-dd")` a lê em UTC,
          // o que no Brasil vira a véspera — e, no dia 1º, o mês anterior.
          const dataParcela = addMonths(dataInicio, i);

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
            dividido_com_pessoas:
              formMeuGasto.categoria === "dividido"
                ? formMeuGasto.dividido_com_pessoas
                : undefined,
            minha_parte:
              formMeuGasto.categoria === "dividido"
                ? minhaParte / numParcelas
                : undefined,
            num_parcelas: numParcelas,
            parcela_atual: i + 1,
            cartao_id: formMeuGasto.tipo === "credito" ? formMeuGasto.cartao_id || undefined : undefined,
            categoria_gasto: formMeuGasto.categoria_gasto || undefined,
          };

          let created: any = null;
          if (isSupabaseConfigured && supabase) {
            created = await meusGastosFunctions.create(prepararGastoParaSupabase(novoGasto));
            if (!created) {
              setModalFeedback({ show: true, titulo: "Erro", mensagem: "Não foi possível salvar seu gasto. Tente novamente.", tipo: "info" });
            }
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
          // Fixo conta do começo do mês em que foi cadastrado (utils/saldo).
          data: formMeuGasto.categoria === "fixo" ? inicioParaNovoRecorrente() : formMeuGasto.data,
          pago: formMeuGasto.tipo === "debito",
          dividido_com:
            formMeuGasto.categoria === "dividido"
              ? formMeuGasto.dividido_com
              : undefined,
          dividido_com_pessoas:
            formMeuGasto.categoria === "dividido"
              ? formMeuGasto.dividido_com_pessoas
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
          cartao_id: formMeuGasto.tipo === "credito" ? formMeuGasto.cartao_id || undefined : undefined,
          conta_id: formMeuGasto.tipo === "debito" ? formMeuGasto.conta_id || undefined : undefined,
          categoria_gasto: formMeuGasto.categoria_gasto || undefined,
        };

        if (isSupabaseConfigured && supabase) {
          const created = await meusGastosFunctions.create(prepararGastoParaSupabase(novoGasto));
          if (!created) {
            setModalFeedback({ show: true, titulo: "Erro", mensagem: "Não foi possível salvar seu gasto. Tente novamente.", tipo: "info" });
          }
          // O saldo da conta sai do histórico (utils/saldo): nada a escrever aqui.
        }
        setMeusGastos((prev) => [...prev, novoGasto]);
      }

      // Criar saldo devedor se for gasto dividido
      if (
        formMeuGasto.categoria === "dividido" &&
        isSupabaseConfigured &&
        supabase
      ) {
        // Suporta múltiplas pessoas ou uma única (legacy)
        const pessoasSelecionadas = (formMeuGasto.dividido_com_pessoas && formMeuGasto.dividido_com_pessoas.length > 0)
          ? formMeuGasto.dividido_com_pessoas
          : (formMeuGasto.dividido_com ? [formMeuGasto.dividido_com] : []);

        if (pessoasSelecionadas.length > 0) {
          // Dividir apenas o restante após a minha parte entre as demais pessoas
          const valorRestante = Math.max(valor - minhaParte, 0);
          const valorPorPessoa = valorRestante / pessoasSelecionadas.length;
          const descricaoGasto = formMeuGasto.descricao;

          // Para cada pessoa selecionada, criar um lançamento em 'Empréstimos do Mês'
          for (const pessoa of pessoasSelecionadas) {
            // Para parcelas, incluir a informação
            const descricaoParaEmprestimo = numParcelas > 1
              ? `${descricaoGasto} (${numParcelas} parcelas)`
              : descricaoGasto;

            const valorTotalPorPessoa = valorPorPessoa;

            await criarLancamentoEmprestimoDoMes(
              pessoa,
              descricaoParaEmprestimo,
              valorTotalPorPessoa,
              numParcelas,
              dataDoEspelho(formMeuGasto.data, formMeuGasto.tipo, formMeuGasto.cartao_id, cartoes),
              formMeuGasto.categoria_gasto || undefined,
              formMeuGasto.tipo
            );
          }
        }
      }

      if (onRefreshGastos) {
        await onRefreshGastos();
      }

      // Compra no crédito depois do melhor dia cai na fatura seguinte e some
      // da lista deste mês: avisar onde ela foi parar.
      const mesFatura = mesDoGasto(
        { data: formMeuGasto.data, tipo: formMeuGasto.tipo, cartao_id: formMeuGasto.cartao_id } as MeuGasto,
        cartoes
      );
      if (formMeuGasto.categoria !== "fixo" && mesFatura !== format(mesVisualizacao, "yyyy-MM")) {
        const nomeMes = format(parseISO(`${mesFatura}-01`), "MMMM", { locale: ptBR });
        toast.success(`Lançado na fatura de ${nomeMes}.`);
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
      valor: formatCurrencyValue(valorTotal),
      tipo: gasto.tipo,
      categoria: gasto.categoria,
      categoria_gasto: normalizarCategoria(gasto.categoria_gasto),
      data: gasto.data,
      dividido_com: gasto.dividido_com || "",
      dividido_com_pessoas: gasto.dividido_com_pessoas || [],
      minha_parte: minhaParteTotal
        ? formatCurrencyValue(minhaParteTotal)
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
        if (formMeuGasto.categoria === "dividido" && formMeuGasto.minha_parte) {
          minhaParte = parseCurrency(formMeuGasto.minha_parte);
        }

        const novoNumParcelas =
          formMeuGasto.tipo === "credito"
            ? parseInt(formMeuGasto.num_parcelas) || 1
            : 1;

        if (
          formMeuGasto.tipo === "credito" &&
          (!Number.isInteger(novoNumParcelas) || novoNumParcelas < 1 || novoNumParcelas > PARCELAS_MAX)
        ) {
          setError(`Número de parcelas inválido. Use entre 1 e ${PARCELAS_MAX}.`);
          return;
        }

        const novoValorParcela = valor / novoNumParcelas;

        // Fixo: mudar valor, dia, conta ou tipo não reescreve os meses que já
        // passaram (utils/saldo). Virar fixo agora conta do começo do mês.
        let inicioDoFixo: string | null = null;
        if (editandoMeuGasto.categoria === "fixo") {
          inicioDoFixo = editandoMeuGasto.data;
          await manterSaldoAoMudar(editandoMeuGasto, {
            ...editandoMeuGasto,
            categoria: formMeuGasto.categoria,
            tipo: formMeuGasto.tipo,
            valor: novoValorParcela,
            dia_vencimento: parseInt(formMeuGasto.dia_vencimento) || 1,
            conta_id: formMeuGasto.tipo === "debito" ? formMeuGasto.conta_id || undefined : undefined,
          });
        } else if (formMeuGasto.categoria === "fixo") {
          inicioDoFixo = inicioParaNovoRecorrente();
        }

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
        const dataAtualSelecionada = parseISO(formMeuGasto.data);
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
              data: formMeuGasto.categoria === "fixo" && inicioDoFixo ? inicioDoFixo : dataFormatada,
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
                dividido_com_pessoas: dadosAtualizados.dividido_com_pessoas,
                minha_parte: dadosAtualizados.minha_parte,
                num_parcelas: dadosAtualizados.num_parcelas,
                parcela_atual: dadosAtualizados.parcela_atual,
                dia_vencimento: dadosAtualizados.dia_vencimento,
              };

              if (isSupabaseConfigured && supabase) {
                await meusGastosFunctions.create(prepararGastoParaSupabase(novoGasto));
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

        // As cobranças do gasto como ele ERA saem antes: se continuar dividido,
        // são recriadas abaixo com os valores novos; se deixou de ser, somem.
        const primeiraOriginal =
          parcelasRelacionadas.find((g) => (g.parcela_atual || 1) === 1) || editandoMeuGasto;
        await removerEspelhosDoDividido(editandoMeuGasto, [
          primeiraOriginal.data,
          dataDoEspelho(primeiraOriginal.data, editandoMeuGasto.tipo, editandoMeuGasto.cartao_id, cartoes),
        ]);

        if (
          formMeuGasto.categoria === "dividido" &&
          isSupabaseConfigured &&
          supabase
        ) {
          // Suporta múltiplas pessoas ou uma única (legacy)
          const pessoasSelecionadas = (formMeuGasto.dividido_com_pessoas && formMeuGasto.dividido_com_pessoas.length > 0)
            ? formMeuGasto.dividido_com_pessoas
            : (formMeuGasto.dividido_com ? [formMeuGasto.dividido_com] : []);

          // Previously deleted prior saldos_devedores here; no longer needed

          // Criar novos saldos devedores para cada pessoa
          if (pessoasSelecionadas.length > 0) {
            const valor = parseCurrency(formMeuGasto.valor);
            const novoNumParcelas = formMeuGasto.tipo === "credito" ? parseInt(formMeuGasto.num_parcelas) || 1 : 1;
            const valorRestante = Math.max(valor - minhaParte, 0);
            const valorPorPessoa = valorRestante / pessoasSelecionadas.length;

            for (const pessoa of pessoasSelecionadas) {
              const descricaoParaSaldo = novoNumParcelas > 1
                ? `${formMeuGasto.descricao} (${novoNumParcelas} parcelas)`
                : formMeuGasto.descricao;

              const valorTotalPorPessoa = valorPorPessoa;

                await criarLancamentoEmprestimoDoMes(
                  pessoa,
                  descricaoParaSaldo,
                  valorTotalPorPessoa,
                  novoNumParcelas,
                  dataDoEspelho(format(dataInicioReal, "yyyy-MM-dd"), formMeuGasto.tipo, formMeuGasto.cartao_id, cartoes),
                  formMeuGasto.categoria_gasto || undefined,
                  formMeuGasto.tipo
                );
            }

            // no-op: no onRefreshSaldos callback anymore
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

      if (onRefreshGastos) {
        await onRefreshGastos();
      }
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
      (parcelasRelacionadas.length > 1
        ? `Tem certeza que deseja excluir este gasto e todas as suas ${parcelasRelacionadas.length} parcelas?`
        : "Tem certeza que deseja excluir este gasto?") +
      (gastoParaExcluir.categoria === "dividido" ? " A cobrança em A receber sai junto." : "");

    setModalConfirm({
      show: true,
      titulo: "Excluir gasto",
      mensagem,
      onConfirm: async () => {
        setSaving(true);
        try {
          // Excluir o fixo não devolve ao saldo o que ele já tirou da conta.
          if (gastoParaExcluir.categoria === "fixo") await manterSaldoAoMudar(gastoParaExcluir, null);

          const primeira =
            parcelasRelacionadas.find((g) => (g.parcela_atual || 1) === 1) || gastoParaExcluir;
          await removerEspelhosDoDividido(gastoParaExcluir, [
            primeira.data,
            dataDoEspelho(primeira.data, gastoParaExcluir.tipo, gastoParaExcluir.cartao_id, cartoes),
          ]);

          for (const parcela of parcelasRelacionadas) {
            if (isSupabaseConfigured && supabase) {
              await meusGastosFunctions.delete(parcela.id);
            }
          }

          const idsParaExcluir = new Set(parcelasRelacionadas.map((p) => p.id));
          setMeusGastos((prev) =>
            prev.filter((g) => !idsParaExcluir.has(g.id))
          );
          if (onRefreshGastos) {
            await onRefreshGastos();
          }
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

    const novoStatus = gasto.ativo === false;

    setSaving(true);
    try {
      // Desativar não devolve o que o fixo já tirou; reativar não cobra os
      // meses em que ficou parado (utils/saldo).
      const updates: Partial<MeuGasto> = { ativo: novoStatus };
      await manterSaldoAoMudar(gasto, { ...gasto, ...updates });
      if (isSupabaseConfigured && supabase) {
        await meusGastosFunctions.update(id, updates);
      }

      setMeusGastos((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
      );

      if (onRefreshGastos) {
        await onRefreshGastos();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReativarGastoFixo = async (id: string, mesRef: Date) => {
    const gasto = meusGastos.find((item) => item.id === id);
    if (!gasto) return;

    const mesSuspensao = format(mesRef, "yyyy-MM");
    const mesesSuspensos = (gasto.meses_suspensos || []).filter(
      (mes) => mes !== mesSuspensao
    );

    const updates = {
      meses_suspensos: mesesSuspensos.length > 0 ? mesesSuspensos : undefined,
    };

    setSaving(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await meusGastosFunctions.update(id, updates);
      }

      setMeusGastos((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );

      if (onRefreshGastos) {
        await onRefreshGastos();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSuspenderMultiplosMeses = async (
    id: string,
    meses: string[],
    mesRef: Date
  ) => {
    const gasto = meusGastos.find((item) => item.id === id);
    if (!gasto) return;

    const mesReferencia = format(mesRef, "yyyy-MM");

    const mesesSuspensos = Array.from(
      new Set([...(gasto.meses_suspensos || []), mesReferencia, ...meses])
    );

    const updates = {
      meses_suspensos: mesesSuspensos,
    };

    setSaving(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await meusGastosFunctions.update(id, updates);
      }

      setMeusGastos((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );

      if (onRefreshGastos) {
        await onRefreshGastos();
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePagarTodosCredito = async () => {
    const creditosPendentes = meusGastosDoMes.filter(
      (gasto) => gasto.tipo === "credito" && !gasto.pago
    );

    if (creditosPendentes.length === 0) return;

    setSaving(true);
    try {
      const dataPagamento = format(new Date(), "yyyy-MM-dd");

      for (const gasto of creditosPendentes) {
        const updates = {
          pago: true,
          data_pagamento: dataPagamento,
        };

        if (isSupabaseConfigured && supabase) {
          await meusGastosFunctions.update(gasto.id, updates);
        }

        setMeusGastos((prev) =>
          prev.map((item) => (item.id === gasto.id ? { ...item, ...updates } : item))
        );
      }

      if (onRefreshGastos) {
        await onRefreshGastos();
      }
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
      categoria_gasto: "",
      data: format(new Date(), "yyyy-MM-dd"),
      dividido_com: "",
      dividido_com_pessoas: [],
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
    handleReativarGastoFixo,
    handleSuspenderMultiplosMeses,
    handlePagarTodosCredito,
    resetForm,
  };
}
