import { useState, useEffect, useCallback, useRef } from "react";
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
import { mesDoGasto, valorDaMinhaParte } from "../utils/gastosDoMes";
import { descricaoSemParcela, parcelasDaCompra } from "../utils/parcelas";
import { dataNaFatura, faturasDoIntervalo, proximaFatura } from "../utils/fatura";
import { criarCobrancasDoFixo, divididoComParaBanco, encerrarCobrancasDoFixo, pessoasDoGasto } from "../utils/fixoDividido";
import { inicioParaNovoRecorrente, manterSaldoAoMudar } from "../utils/saldo";
import { avisarDadosMudaram, ouvirDadosMudaram } from "../utils/onboarding";
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
  tipo: "credito" | "debito" = "credito",
  origemId?: string
) {
  if (!isSupabaseConfigured || !supabase) return true;

  const criado = await gastosFunctions.create({
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
    origem_id: origemId ?? null,
  });
  return !!criado;
}

const FALHA_AO_SALVAR = "Não foi possível salvar o gasto. Tente de novo.";
const FALHA_NA_COBRANCA =
  "O gasto foi salvo, mas a cobrança em A receber não. Abra o gasto e salve de novo para refazer.";

/**
 * Apaga as cobranças que um gasto dividido espelhou em A receber (tabela
 * `gastos`). A cobrança guarda em `origem_id` o id do gasto que a criou — na
 * compra parcelada, o da primeira parcela lançada.
 *
 * As cobranças de antes dessa coluna que a migração 20261007 não conseguiu
 * ligar ficaram com `origem_id` nulo, e só elas ainda são achadas pelo nome
 * ("<descrição> - <pessoa>", com " (N parcelas)" quando parcelado), pela
 * pessoa e pela data da 1ª parcela — a da compra ou a da fatura.
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

async function removerEspelhosDoDividido(gasto: MeuGasto, datasPossiveis: string[], origemId: string) {
  if (!isSupabaseConfigured || !supabase || gasto.categoria !== "dividido") return;
  const { data: daOrigem } = await supabase.from("gastos").select("id").eq("origem_id", origemId);

  const pessoas = pessoasDoGasto(gasto);
  const base = descricaoSemParcela(gasto.descricao);
  const n = gasto.num_parcelas || 1;
  const nome = n > 1 ? `${base} (${n} parcelas)` : base;
  const { data: semOrigem } = pessoas.length
    ? await supabase
        .from("gastos")
        .select("id")
        .is("origem_id", null)
        .in("pessoa", pessoas)
        .in("descricao", pessoas.map((p) => `${nome} - ${p}`))
        .in("data_inicio", datasPossiveis)
    : { data: [] };
  for (const row of [...(daOrigem || []), ...(semOrigem || [])]) await gastosFunctions.delete(row.id);
}


/** O formulário é um gasto dividido — o comum ou o fixo com pessoas? */
const formDivide = (f: MeuGastoForm) =>
  f.categoria === "dividido" || (f.categoria === "fixo" && pessoasDoGasto(f).length > 0);

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

  // Gasto criado fora deste gancho (os fixos dos primeiros passos): recarrega.
  useEffect(() => ouvirDadosMudaram((origem) => origem !== "meusGastos" && fetchMeusGastos()), [fetchMeusGastos]);

  // Toda mudança daqui avisa o Início, que recarrega os números.
  const primeiraCarga = useRef(true);
  useEffect(() => {
    if (!meusGastosLoaded) return;
    if (primeiraCarga.current) { primeiraCarga.current = false; return; }
    avisarDadosMudaram("meusGastos");
  }, [meusGastos, meusGastosLoaded]);

  // Modo demonstração (sem banco): a lista mora no navegador.
  useEffect(() => {
    if (!isSupabaseConfigured && meusGastosLoaded) {
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
    .reduce((acc, g) => acc + valorDaMinhaParte(g), 0);

  const totalMeusGastosDebito = meusGastosDoMes
    .filter((g) => g.tipo === "debito")
    .reduce((acc, g) => acc + valorDaMinhaParte(g), 0);

  const totalMeusGastosPagos = meusGastosDoMes
    .filter((g) => g.pago || g.tipo === "debito")
    .reduce((acc, g) => acc + valorDaMinhaParte(g), 0);

  // Fixo dividido conta a minha parte (o resto volta pelo A receber).
  const totalGastosFixos = gastosFixos
    .filter((g) => g.ativo !== false)
    .reduce((acc, g) => acc + valorDaMinhaParte(g), 0);

  // Adicionar meu gasto
  const handleAddMeuGasto = async () => {
    const valor = parseCurrency(formMeuGasto.valor);
    if (!formMeuGasto.descricao || valor <= 0) {
      setError("Preencha todos os campos corretamente.");
      return;
    }

    let minhaParte = valor;
    if (formDivide(formMeuGasto) && formMeuGasto.minha_parte) {
      minhaParte = parseCurrency(formMeuGasto.minha_parte);
    }
    if (minhaParte > valor + 0.004) {
      setError("Sua parte não pode ser maior que o valor da conta.");
      return;
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

    // Compra parcelada antiga: o valor digitado é o da parcela e só as que
    // faltam são lançadas, a partir da próxima fatura. As já pagas não viram
    // gasto de novo — nem no mês, nem no limite.
    const antiga =
      formMeuGasto.tipo === "credito" && formMeuGasto.categoria !== "fixo" && !!formMeuGasto.compra_antiga && numParcelas > 1;
    if (antiga && (parseInt(formMeuGasto.parcela_proxima || "1") || 1) > numParcelas) {
      setError(`A compra tem ${numParcelas} parcelas: a da fatura vai de 1 a ${numParcelas}.`);
      return;
    }
    const primeiraParcela = antiga
      ? Math.min(Math.max(parseInt(formMeuGasto.parcela_proxima || "1") || 1, 1), numParcelas)
      : 1;
    const faltam = numParcelas - primeiraParcela + 1;
    const cartaoDaCompra = cartoes.find((c) => c.id === formMeuGasto.cartao_id);
    const mesDaPrimeira = cartaoDaCompra ? proximaFatura(cartaoDaCompra) : format(new Date(), "yyyy-MM");
    const dataDaParcelaAntiga = (i: number) => {
      const mes = format(addMonths(parseISO(`${mesDaPrimeira}-01`), i - (primeiraParcela - 1)), "yyyy-MM");
      return cartaoDaCompra ? dataNaFatura(cartaoDaCompra, mes) : `${mes}-01`;
    };

    const valorParcela = antiga ? valor : valor / numParcelas;
    // Na compra antiga a parte é por parcela, como o valor.
    const minhaParteDaParcela = antiga ? minhaParte : minhaParte / numParcelas;
    const dataDaCompra = antiga ? dataDaParcelaAntiga(primeiraParcela - 1) : formMeuGasto.data;

    setSaving(true);
    try {
      const novos: MeuGasto[] = [];
      const lote = Date.now();
      if (formMeuGasto.tipo === "credito" && numParcelas > 1) {
        const dataInicio = parseISO(formMeuGasto.data);

        for (let i = primeiraParcela - 1; i < numParcelas; i++) {
          // `parseISO` lê a data no fuso local; `new Date("aaaa-mm-dd")` a lê em UTC,
          // o que no Brasil vira a véspera — e, no dia 1º, o mês anterior.
          const dataParcela = antiga ? parseISO(dataDaParcelaAntiga(i)) : addMonths(dataInicio, i);

          const novoGasto: MeuGasto = {
            id: `${lote}-${i}`,
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
                ? minhaParteDaParcela
                : undefined,
            num_parcelas: numParcelas,
            parcela_atual: i + 1,
            cartao_id: formMeuGasto.tipo === "credito" ? formMeuGasto.cartao_id || undefined : undefined,
            categoria_gasto: formMeuGasto.categoria_gasto || undefined,
          };

          novos.push(novoGasto);
        }
      } else {
        const novoGasto: MeuGasto = {
          id: lote.toString(),
          descricao: formMeuGasto.descricao,
          valor: valor,
          tipo: formMeuGasto.tipo,
          categoria: formMeuGasto.categoria,
          // Fixo conta do começo do mês em que foi cadastrado (utils/saldo).
          data: formMeuGasto.categoria === "fixo" ? inicioParaNovoRecorrente() : formMeuGasto.data,
          pago: formMeuGasto.tipo === "debito",
          dividido_com: formDivide(formMeuGasto) ? formMeuGasto.dividido_com : undefined,
          dividido_com_pessoas: formDivide(formMeuGasto) ? formMeuGasto.dividido_com_pessoas : undefined,
          minha_parte: formDivide(formMeuGasto) ? minhaParte : undefined,
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

        novos.push(novoGasto);
      }

      // O saldo da conta sai do histórico (utils/saldo): nada a escrever nele.
      // O gasto só entra na lista depois de salvo; compra parcelada que falha
      // no meio é desfeita, para não sobrar metade das parcelas.
      if (isSupabaseConfigured && supabase) {
        const salvos: string[] = [];
        for (const g of novos) {
          if (await meusGastosFunctions.create(prepararGastoParaSupabase(g))) {
            salvos.push(g.id);
            continue;
          }
          for (const id of salvos) await meusGastosFunctions.delete(id);
          setError(FALHA_AO_SALVAR);
          return;
        }
      }
      setMeusGastos((prev) => [...prev, ...novos]);

      let cobrancaFalhou = false;
      if (formMeuGasto.categoria === "fixo" && formDivide(formMeuGasto)) {
        cobrancaFalhou = !(await criarCobrancasDoFixo({
          descricao: formMeuGasto.descricao,
          valor,
          minha_parte: minhaParte,
          dia_vencimento: parseInt(formMeuGasto.dia_vencimento) || 1,
          tipo: formMeuGasto.tipo,
          categoria_gasto: formMeuGasto.categoria_gasto || undefined,
          pessoas: pessoasDoGasto(formMeuGasto),
          origem_id: novos[0].id,
        }));
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
          // Dividir apenas o restante após a minha parte entre as demais pessoas.
          // Compra antiga: só as parcelas que faltam.
          const valorRestante = antiga ? Math.max(valor - minhaParte, 0) * faltam : Math.max(valor - minhaParte, 0);
          const valorPorPessoa = valorRestante / pessoasSelecionadas.length;
          const descricaoGasto = formMeuGasto.descricao;

          // Para cada pessoa selecionada, criar um lançamento em 'Empréstimos do Mês'
          for (const pessoa of pessoasSelecionadas) {
            // Para parcelas, incluir a informação
            const descricaoParaEmprestimo = numParcelas > 1
              ? `${descricaoGasto} (${numParcelas} parcelas)`
              : descricaoGasto;

            const valorTotalPorPessoa = valorPorPessoa;

            const criada = await criarLancamentoEmprestimoDoMes(
              pessoa,
              descricaoParaEmprestimo,
              valorTotalPorPessoa,
              antiga ? faltam : numParcelas,
              dataDoEspelho(dataDaCompra, formMeuGasto.tipo, formMeuGasto.cartao_id, cartoes),
              formMeuGasto.categoria_gasto || undefined,
              formMeuGasto.tipo,
              novos[0].id
            );
            if (!criada) cobrancaFalhou = true;
          }
        }
      }
      if (cobrancaFalhou) toast.error(FALHA_NA_COBRANCA);

      if (onRefreshGastos) {
        await onRefreshGastos();
      }

      // Compra no crédito depois do melhor dia cai na fatura seguinte e some
      // da lista deste mês: avisar onde ela foi parar.
      const mesFatura = mesDoGasto(
        { data: dataDaCompra, tipo: formMeuGasto.tipo, cartao_id: formMeuGasto.cartao_id } as MeuGasto,
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
    const minhaParteTotal = gasto.minha_parte != null
      ? gasto.minha_parte * numParcelas
      : undefined;

    setFormMeuGasto({
      descricao: gasto.descricao.replace(/\s*\(\d+\/\d+\)$/, ""),
      valor: formatCurrencyValue(valorTotal),
      tipo: gasto.tipo,
      categoria: gasto.categoria,
      categoria_gasto: gasto.categoria_gasto || "",
      data: gasto.data,
      dividido_com: gasto.dividido_com || "",
      dividido_com_pessoas: gasto.dividido_com_pessoas || [],
      minha_parte: minhaParteTotal !== undefined
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
        if (formDivide(formMeuGasto) && formMeuGasto.minha_parte) {
          minhaParte = parseCurrency(formMeuGasto.minha_parte);
        }
        if (minhaParte > valor + 0.004) {
          setError("Sua parte não pode ser maior que o valor da conta.");
          return;
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
        const inicioDoFixo =
          editandoMeuGasto.categoria === "fixo"
            ? editandoMeuGasto.data
            : formMeuGasto.categoria === "fixo"
              ? inicioParaNovoRecorrente()
              : null;

        // Só as parcelas DESTA compra (utils/parcelas): pelo nome, um gasto
        // igual de outro dia era editado no lugar deste.
        const parcelasRelacionadas = parcelasDaCompra(editandoMeuGasto, meusGastos);

        const indiceParcelaEditada = (editandoMeuGasto.parcela_atual || 1) - 1;
        const dataAtualSelecionada = parseISO(formMeuGasto.data);
        const dataInicioReal = subMonths(
          dataAtualSelecionada,
          indiceParcelaEditada
        );

        const maxParcelas = Math.max(
          ...parcelasRelacionadas.map((p) => p.parcela_atual || 1),
          novoNumParcelas
        );
        // Compra antiga lançada só com as parcelas que faltavam: as anteriores
        // foram pagas antes do Hedge e não voltam na edição.
        const primeiraLancada = Math.min(...parcelasRelacionadas.map((p) => p.parcela_atual || 1));
        // Na lista da tela as pessoas ficam em lista; no banco, em `dividido_com`.
        const pessoasDoForm = formDivide(formMeuGasto) ? pessoasDoGasto(formMeuGasto) : undefined;
        const usaBanco = isSupabaseConfigured && !!supabase;

        const gravarParcelas = async () => {
          for (let i = primeiraLancada - 1; i < maxParcelas; i++) {
            const numParcela = i + 1;
            const existente = parcelasRelacionadas.find(
              (p) => (p.parcela_atual || 1) === numParcela
            );

            if (numParcela > novoNumParcelas) {
              if (!existente) continue;
              if (usaBanco && !(await meusGastosFunctions.delete(existente.id))) throw new Error(FALHA_AO_SALVAR);
              setMeusGastos((prev) => prev.filter((g) => g.id !== existente.id));
              continue;
            }

            const dadosAtualizados: Partial<MeuGasto> = {
              descricao:
                novoNumParcelas > 1
                  ? `${formMeuGasto.descricao} (${numParcela}/${novoNumParcelas})`
                  : formMeuGasto.descricao,
              valor: novoValorParcela,
              tipo: formMeuGasto.tipo,
              categoria: formMeuGasto.categoria,
              categoria_gasto: formMeuGasto.categoria_gasto || undefined,
              data:
                formMeuGasto.categoria === "fixo" && inicioDoFixo
                  ? inicioDoFixo
                  : format(addMonths(dataInicioReal, i), "yyyy-MM-dd"),
              // Todas as pessoas, não só a primeira: a edição perdia as outras.
              dividido_com: pessoasDoForm ? divididoComParaBanco(pessoasDoForm) : undefined,
              minha_parte: formDivide(formMeuGasto) ? minhaParte / novoNumParcelas : undefined,
              num_parcelas: novoNumParcelas,
              parcela_atual: numParcela,
              dia_vencimento:
                formMeuGasto.categoria === "fixo"
                  ? parseInt(formMeuGasto.dia_vencimento)
                  : undefined,
              cartao_id: formMeuGasto.tipo === "credito" ? formMeuGasto.cartao_id || undefined : undefined,
              conta_id: formMeuGasto.tipo === "debito" ? formMeuGasto.conta_id || undefined : undefined,
              pago: formMeuGasto.tipo === "debito" ? true : existente ? existente.pago : false,
            };

            if (existente) {
              if (usaBanco && !(await meusGastosFunctions.update(existente.id, dadosAtualizados))) {
                throw new Error(FALHA_AO_SALVAR);
              }
              setMeusGastos((prev) =>
                prev.map((g) =>
                  g.id === existente.id ? { ...g, ...dadosAtualizados, dividido_com_pessoas: pessoasDoForm } : g
                )
              );
            } else {
              // Parcela que a edição acrescentou: nasce com tudo o que as outras
              // têm. Sem o cartão, ela ficava fora da fatura.
              const novoGasto = { ...dadosAtualizados, id: `${Date.now()}-${i}` } as MeuGasto;
              if (usaBanco && !(await meusGastosFunctions.create(prepararGastoParaSupabase(novoGasto)))) {
                throw new Error(FALHA_AO_SALVAR);
              }
              setMeusGastos((prev) => [...prev, { ...novoGasto, dividido_com_pessoas: pessoasDoForm }]);
            }
          }
        };

        if (editandoMeuGasto.categoria === "fixo") {
          await manterSaldoAoMudar(
            editandoMeuGasto,
            {
              ...editandoMeuGasto,
              categoria: formMeuGasto.categoria,
              tipo: formMeuGasto.tipo,
              valor: novoValorParcela,
              dia_vencimento: parseInt(formMeuGasto.dia_vencimento) || 1,
              conta_id: formMeuGasto.tipo === "debito" ? formMeuGasto.conta_id || undefined : undefined,
            },
            gravarParcelas
          );
        } else {
          await gravarParcelas();
        }

        // As cobranças do gasto como ele ERA saem antes: se continuar dividido,
        // são recriadas abaixo com os valores novos; se deixou de ser, somem.
        const primeiraOriginal =
          parcelasRelacionadas.find((g) => (g.parcela_atual || 1) === 1) || editandoMeuGasto;
        await removerEspelhosDoDividido(editandoMeuGasto, [
          primeiraOriginal.data,
          dataDoEspelho(primeiraOriginal.data, editandoMeuGasto.tipo, editandoMeuGasto.cartao_id, cartoes),
        ], parcelasRelacionadas[0].id);

        // Fixo dividido: as cobranças antigas param no mês passado e as novas
        // (valores, pessoas e parte de agora) valem a partir deste mês.
        if (editandoMeuGasto.categoria === "fixo") await encerrarCobrancasDoFixo(editandoMeuGasto, false);
        let cobrancaFalhou = false;
        if (formMeuGasto.categoria === "fixo" && formDivide(formMeuGasto)) {
          cobrancaFalhou = !(await criarCobrancasDoFixo({
            descricao: formMeuGasto.descricao,
            valor,
            minha_parte: minhaParte,
            dia_vencimento: parseInt(formMeuGasto.dia_vencimento) || 1,
            tipo: formMeuGasto.tipo,
            categoria_gasto: formMeuGasto.categoria_gasto || undefined,
            pessoas: pessoasDoGasto(formMeuGasto),
            origem_id: parcelasRelacionadas[0].id,
          }));
        }

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

              const criada = await criarLancamentoEmprestimoDoMes(
                pessoa,
                descricaoParaSaldo,
                valorTotalPorPessoa,
                novoNumParcelas,
                dataDoEspelho(format(dataInicioReal, "yyyy-MM-dd"), formMeuGasto.tipo, formMeuGasto.cartao_id, cartoes),
                formMeuGasto.categoria_gasto || undefined,
                formMeuGasto.tipo,
                parcelasRelacionadas[0].id
              );
              if (!criada) cobrancaFalhou = true;
            }

            // no-op: no onRefreshSaldos callback anymore
          }
        }

        if (cobrancaFalhou) toast.error(FALHA_NA_COBRANCA);
        resetForm();
      } catch (err) {
        console.error("Erro ao salvar meu gasto:", err);
        // A edição pode ter parado no meio: a lista volta a mostrar o que ficou.
        await fetchMeusGastos();
        setError("Não foi possível salvar tudo. Confira o gasto e tente de novo.");
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
      if (isSupabaseConfigured && supabase && !(await meusGastosFunctions.update(id, updates))) {
        toast.error(FALHA_AO_SALVAR);
        return;
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

    // Só as parcelas desta compra (utils/parcelas), não todo gasto de mesmo nome.
    const parcelasRelacionadas = parcelasDaCompra(gastoParaExcluir, meusGastos);

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
          const excluir = async () => {
            for (const parcela of parcelasRelacionadas) {
              if (isSupabaseConfigured && supabase && !(await meusGastosFunctions.delete(parcela.id))) {
                throw new Error("Falha ao excluir o gasto.");
              }
            }
          };
          if (gastoParaExcluir.categoria === "fixo") {
            // Excluir o fixo não devolve ao saldo o que ele já tirou da conta.
            await manterSaldoAoMudar(gastoParaExcluir, null, excluir);
            // As cobranças das pessoas param depois deste mês; os meses que já
            // passaram continuam em A receber.
            await encerrarCobrancasDoFixo(gastoParaExcluir, true);
          } else {
            await excluir();
          }

          // Depois do gasto: se a exclusão falhar, a cobrança continua com dono.
          const primeira =
            parcelasRelacionadas.find((g) => (g.parcela_atual || 1) === 1) || gastoParaExcluir;
          await removerEspelhosDoDividido(gastoParaExcluir, [
            primeira.data,
            dataDoEspelho(primeira.data, gastoParaExcluir.tipo, gastoParaExcluir.cartao_id, cartoes),
          ], parcelasRelacionadas[0].id);

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
        } catch (err) {
          console.error("Erro ao excluir meu gasto:", err);
          await fetchMeusGastos();
          toast.error("Não foi possível excluir o gasto. Tente de novo.");
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
      // No cartão, o dia em que parou segura as faturas já cobradas
      // (utils/fatura); ao voltar, as faturas do intervalo ficam de fora.
      const hojeIso = format(new Date(), "yyyy-MM-dd");
      const cartaoDoFixo = gasto.tipo === "credito" ? cartoes.find((c) => c.id === gasto.cartao_id) : undefined;
      const comDia: Partial<MeuGasto> = novoStatus
        ? {
            ...updates,
            encerrado_em: null,
            ...(cartaoDoFixo && gasto.encerrado_em
              ? {
                  meses_suspensos: [
                    ...new Set([
                      ...(gasto.meses_suspensos || []),
                      ...faturasDoIntervalo(cartaoDoFixo, gasto.dia_vencimento || 1, gasto.encerrado_em, hojeIso),
                    ]),
                  ],
                }
              : {}),
          }
        : { ...updates, encerrado_em: hojeIso };
      await manterSaldoAoMudar(gasto, { ...gasto, ...updates }, async () => {
        if (isSupabaseConfigured && supabase && !(await meusGastosFunctions.update(id, comDia))) {
          throw new Error(FALHA_AO_SALVAR);
        }
      });
      // Dividido: desativar para as cobranças depois deste mês; reativar cria
      // as cobranças de novo a partir deste mês.
      if (novoStatus) {
        await criarCobrancasDoFixo({
          descricao: gasto.descricao,
          valor: gasto.valor,
          minha_parte: gasto.minha_parte,
          dia_vencimento: gasto.dia_vencimento,
          tipo: gasto.tipo,
          categoria_gasto: gasto.categoria_gasto,
          pessoas: pessoasDoGasto(gasto),
          origem_id: gasto.id,
        });
      } else {
        await encerrarCobrancasDoFixo(gasto, true);
      }

      setMeusGastos((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...comDia } : g))
      );

      if (onRefreshGastos) {
        await onRefreshGastos();
      }
    } catch (err) {
      console.error("Erro ao mudar o gasto fixo:", err);
      toast.error(FALHA_AO_SALVAR);
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
      if (isSupabaseConfigured && supabase && !(await meusGastosFunctions.update(id, updates))) {
        toast.error(FALHA_AO_SALVAR);
        return;
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
      if (isSupabaseConfigured && supabase && !(await meusGastosFunctions.update(id, updates))) {
        toast.error(FALHA_AO_SALVAR);
        return;
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

        if (isSupabaseConfigured && supabase && !(await meusGastosFunctions.update(gasto.id, updates))) {
          toast.error("Nem tudo foi marcado como pago. Tente de novo.");
          break;
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
