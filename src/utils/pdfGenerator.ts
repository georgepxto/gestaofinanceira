import { format } from "date-fns";
import { categoriaDeGasto } from "./categories";
import type { ParcelaAtiva, ResumoMensal, MeuGasto, MetaGasto } from "../types";
import type { PagamentoParcial } from "../types/extended";
import {
  FIO,
  FUNDO,
  LARANJA,
  LARANJA_TEXTO,
  LARGURA,
  MARGEM,
  PERIGO,
  PILULA_ABERTO,
  TINTA,
  TINTA_2,
  TINTA_3,
  barrasDeCategoria,
  centavos,
  corCategoria,
  criarContexto,
  definirFonte,
  dataCurta,
  escapeRegex,
  escrever,
  escreverMisto,
  faixaDeAcerto,
  faixaDeIndicadores,
  fechamento,
  finalizarPaginas,
  garantirEspaco,
  moeda,
  nomeMes,
  percentual,
  pilula,
  plural,
  pontoDeCategoria,
  quadradoComInicial,
  registrarPaginas,
  rotuloMes,
  tabelaPlana,
  tituloDePagina,
  textoDePagamentos,
  tituloDeSecao,
  type Ctx,
  type LinhaDeBarra,
  type RGB,
} from "./pdf/base";

const SEM_PESSOA = "Sem pessoa";
const ALTURA_LINHA = 5.3;

type GrupoLancamento = "compras" | "anteriores" | "fixos";

interface Lancamento {
  data: string;
  descricao: string;
  categoria: string;
  tipo: string;
  parcela: string;
  valor: number;
  grupo: GrupoLancamento;
}

interface BlocoPessoa {
  nome: string;
  lancamentos: Lancamento[];
  total: number;
  pagamentos: PagamentoParcial[];
  pago: number;
  divida: number;
}

const rotuloTipo = (tipo: string) => (tipo === "credito" ? "Crédito" : "Débito");

function limparDescricao(descricao: string, pessoa: string): string {
  let texto = (descricao ?? "").replace(/\s*\(\d+\s+parcelas\)/i, "");
  if (pessoa) texto = texto.replace(new RegExp(`\\s+-\\s+${escapeRegex(pessoa)}$`), "");
  return texto.trim() || descricao;
}

function grupoDe(parcela: ParcelaAtiva): GrupoLancamento {
  if (parcela.gasto.recorrente) return "fixos";
  return parcela.parcela_atual > 1 ? "anteriores" : "compras";
}

function montarBlocos(
  parcelas: ParcelaAtiva[],
  pagamentosPorPessoa?: Record<string, PagamentoParcial[]>
): BlocoPessoa[] {
  const mapa = new Map<string, BlocoPessoa>();

  for (const parcela of parcelas) {
    const bruto = parcela.gasto.pessoa?.trim() ?? "";
    const nome = bruto || SEM_PESSOA;
    const bloco =
      mapa.get(nome) ?? { nome, lancamentos: [], total: 0, pagamentos: [], pago: 0, divida: 0 };
    mapa.set(nome, bloco);
    bloco.lancamentos.push({
      data: parcela.gasto.data_inicio,
      descricao: limparDescricao(parcela.gasto.descricao, bruto),
      categoria: categoriaDeGasto(parcela.gasto),
      tipo: rotuloTipo(parcela.gasto.tipo),
      parcela: parcela.gasto.recorrente ? "Fixo" : `${parcela.parcela_atual}/${parcela.gasto.num_parcelas}`,
      valor: centavos(parcela.valor_parcela),
      grupo: grupoDe(parcela),
    });
  }

  for (const [chave, lista] of Object.entries(pagamentosPorPessoa ?? {})) {
    mapa.get(chave.trim() || SEM_PESSOA)?.pagamentos.push(...lista);
  }

  for (const bloco of mapa.values()) {
    bloco.total = centavos(bloco.lancamentos.reduce((soma, l) => soma + l.valor, 0));
    bloco.pago = centavos(bloco.pagamentos.reduce((soma, p) => soma + p.valor, 0));
    bloco.divida = Math.max(0, centavos(bloco.total - bloco.pago));
  }

  return [...mapa.values()].sort((a, b) => {
    if (a.nome === SEM_PESSOA) return 1;
    if (b.nome === SEM_PESSOA) return -1;
    return b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR");
  });
}

function situacaoDe(bloco: BlocoPessoa): { rotulo: string; fundo: RGB; cor: RGB } {
  if (bloco.pago <= 0) return { rotulo: "Em aberto", fundo: PILULA_ABERTO, cor: LARANJA_TEXTO };
  if (bloco.divida <= 0) return { rotulo: "Quitado", fundo: FUNDO, cor: TINTA_2 };
  return { rotulo: "Parcial", fundo: FUNDO, cor: TINTA };
}

// ============================================================ Mês a mês

function resumoDaPrimeiraPagina(ctx: Ctx, blocos: BlocoPessoa[], subtitulo: string): number {
  const totalGeral = centavos(blocos.reduce((s, b) => s + b.total, 0));
  const pagoGeral = centavos(blocos.reduce((s, b) => s + b.pago, 0));
  const dividaGeral = centavos(blocos.reduce((s, b) => s + b.divida, 0));
  const lancamentos = blocos.reduce((s, b) => s + b.lancamentos.length, 0);
  const quitaram = blocos.filter((b) => b.total > 0 && b.divida <= 0).length;

  let y = tituloDePagina(ctx, "Relatório de despesas", subtitulo, 32);
  y = faixaDeIndicadores(ctx, y + 4, [
    { rotulo: "Total do mês", valor: moeda(totalGeral), apoio: plural(lancamentos, "lançamento", "lançamentos") },
    {
      rotulo: "Pago no mês",
      valor: moeda(pagoGeral),
      apoio: `${percentual(pagoGeral, totalGeral)}% do total · ${
        quitaram === 0 ? "ninguém quitou" : quitaram === 1 ? "1 quitou" : `${quitaram} quitaram`
      }`,
    },
    {
      rotulo: "Vai para a dívida",
      valor: moeda(dividaGeral),
      apoio: "não pago até o fechamento",
      corValor: dividaGeral > 0 ? LARANJA_TEXTO : TINTA,
    },
  ]);

  y = tituloDeSecao(
    ctx,
    y + 11,
    "Por pessoa",
    "Quanto cada um gastou, quanto já pagou e o que passa para o próximo mês como dívida."
  );

  y = tabelaPlana(ctx, {
    startY: y + 1.5,
    cabecalho: ["Pessoa", "Lanç.", "Total do mês", "Pago", "Vai p/ dívida", "Situação"],
    linhas: [
      ...blocos.map((b) => [
        b.nome,
        String(b.lancamentos.length),
        moeda(b.total),
        moeda(b.pago),
        moeda(b.divida),
        "",
      ]),
      ["Total", String(lancamentos), moeda(totalGeral), moeda(pagoGeral), moeda(dividaGeral), ""],
    ],
    colunas: [
      { largura: 52, recuoEsquerdo: 9 },
      { largura: 16, direita: true, mono: true },
      { largura: 30, direita: true, mono: true },
      { largura: 28, direita: true, mono: true },
      { largura: 28, direita: true, mono: true },
      { largura: 26, recuoEsquerdo: 5 },
    ],
    tamanho: 9,
    alturaMinima: 9,
    linhaDeTotal: true,
    aoAnalisar: (dados) => {
      if (dados.section !== "body" || dados.row.index >= blocos.length) return;
      if (dados.column.index === 4) {
        dados.cell.styles.textColor = blocos[dados.row.index].divida > 0 ? LARANJA_TEXTO : TINTA_2;
      }
      if (dados.column.index === 0) dados.cell.styles.fontStyle = "normal";
    },
    aoDesenhar: (dados) => {
      if (dados.section !== "body" || dados.row.index >= blocos.length) return;
      const bloco = blocos[dados.row.index];
      const { cell } = dados;
      if (dados.column.index === 0) {
        quadradoComInicial(ctx, cell.x + 1, cell.y + (cell.height - 6) / 2, 6, bloco.nome);
      }
      if (dados.column.index === 5) {
        const situacao = situacaoDe(bloco);
        pilula(ctx, cell.x + 5, cell.y + cell.height / 2, situacao.rotulo, situacao.fundo, situacao.cor);
      }
    },
  });

  const porCategoria = new Map<string, number>();
  for (const bloco of blocos) {
    for (const l of bloco.lancamentos) {
      porCategoria.set(l.categoria, centavos((porCategoria.get(l.categoria) ?? 0) + l.valor));
    }
  }
  const linhas: LinhaDeBarra[] = [...porCategoria.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor]) => ({ nome, valor, cor: corCategoria(nome) }));

  y = garantirEspaco(ctx, y + 11, 30);
  y = tituloDeSecao(ctx, y, "Por categoria", "Soma de todas as pessoas, da maior para a menor.");
  barrasDeCategoria(ctx, y + 2, linhas, totalGeral);

  return y;
}

const TITULOS_GRUPO: Record<GrupoLancamento, (mes: Date) => string> = {
  compras: (mes) => `Compras de ${nomeMes(mes)}`,
  anteriores: () => "Parcelas de meses anteriores",
  fixos: () => "Fixos",
};

const ORDEM_GRUPOS: GrupoLancamento[] = ["compras", "anteriores", "fixos"];

function gruposDaPessoa(bloco: BlocoPessoa) {
  return ORDEM_GRUPOS.map((grupo) => {
    const itens = bloco.lancamentos.filter((l) => l.grupo === grupo).sort((a, b) => b.data.localeCompare(a.data));
    return { grupo, itens, subtotal: centavos(itens.reduce((s, l) => s + l.valor, 0)) };
  }).filter((g) => g.itens.length > 0);
}

function alturaEstimada(bloco: BlocoPessoa): number {
  const grupos = gruposDaPessoa(bloco);
  return 14 + 26 + grupos.reduce((soma, g) => soma + 8 + 6.5 + g.itens.length * ALTURA_LINHA + 6, 0);
}

function cabecalhoDaPessoa(ctx: Ctx, bloco: BlocoPessoa, y: number): number {
  quadradoComInicial(ctx, MARGEM, y, 9, bloco.nome);
  escrever(ctx, bloco.nome, MARGEM + 12.5, y + 4.6, "texto", { tamanho: 17, peso: 500, cor: TINTA });
  escreverMisto(ctx, plural(bloco.lancamentos.length, "lançamento", "lançamentos"), MARGEM + 12.5, y + 9.2, {
    tamanho: 8.5,
    cor: TINTA_2,
  });
  escrever(ctx, "Total do mês", MARGEM + LARGURA, y + 1.8, "texto", { tamanho: 8, cor: TINTA_2, alinhar: "direita" });
  escrever(ctx, moeda(bloco.total), MARGEM + LARGURA, y + 8.2, "mono", {
    tamanho: 15,
    cor: TINTA,
    alinhar: "direita",
  });
  return y + 14;
}

function acertoDaPessoa(ctx: Ctx, bloco: BlocoPessoa, y: number): number {
  const pct = percentual(bloco.pago, bloco.total);
  return faixaDeAcerto(ctx, y, {
    pct,
    apoio:
      bloco.pagamentos.length === 0
        ? "Nenhum pagamento registrado neste mês"
        : textoDePagamentos(ctx, pct, bloco.pagamentos),
    pago: bloco.pago,
    aberto: bloco.divida,
    rotuloAberto: "Vai para a dívida",
  });
}

function paginaDaPessoa(ctx: Ctx, bloco: BlocoPessoa, mes: Date, yInicial: number): number {
  let y = cabecalhoDaPessoa(ctx, bloco, yInicial);
  y = acertoDaPessoa(ctx, bloco, y + 1) + 8;

  for (const { grupo, itens, subtotal } of gruposDaPessoa(bloco)) {
    y = garantirEspaco(ctx, y, 25);
    const titulo = TITULOS_GRUPO[grupo](mes);
    escrever(ctx, titulo, MARGEM, y, "texto", { tamanho: 9, peso: 500, cor: TINTA });
    definirFonte(ctx, "texto", 9, 500, TINTA);
    const largura = ctx.doc.getTextWidth(titulo);
    escreverMisto(ctx, ` · ${itens.length}`, MARGEM + largura, y, { tamanho: 9, cor: TINTA_3 });
    escrever(ctx, moeda(subtotal), MARGEM + LARGURA, y, "mono", { tamanho: 8.5, cor: TINTA_2, alinhar: "direita" });

    y = tabelaPlana(ctx, {
      startY: y + 2.5,
      cabecalho: ["Data", "Descrição", "Categoria", "Tipo", "Parcela", "Valor"],
      linhas: itens.map((l) => [dataCurta(l.data), l.descricao, l.categoria, l.tipo, l.parcela, moeda(l.valor)]),
      colunas: [
        { largura: 14, mono: true },
        { elipse: true },
        { largura: 36, recuoEsquerdo: 5 },
        { largura: 17 },
        { largura: 15, mono: true },
        { largura: 24, direita: true, mono: true },
      ],
      aoAnalisar: (dados) => {
        if (dados.section !== "body") return;
        if ([0, 2, 3].includes(dados.column.index)) dados.cell.styles.textColor = TINTA_2;
      },
      aoDesenhar: (dados) => {
        if (dados.section === "body" && dados.column.index === 2) {
          pontoDeCategoria(
            ctx,
            dados.cell.x + 2.2,
            dados.cell.y + dados.cell.height / 2,
            corCategoria(String(dados.cell.raw))
          );
        }
      },
    });
    y += 7;
  }
  return y;
}

export const generateGastosPDF = async (
  parcelas: ParcelaAtiva[],
  _resumo: ResumoMensal[],
  _total: number,
  mes: Date,
  filtros: { pessoa: string; tipo: string; dia: string },
  pagamentosPorPessoa?: Record<string, PagamentoParcial[]>
) => {
  const ctx = await criarContexto();
  const blocos = montarBlocos(parcelas, pagamentosPorPessoa);
  const mesRotulo = rotuloMes(mes);

  const filtrosAtivos: string[] = [];
  if (filtros.pessoa) filtrosAtivos.push(`Pessoa: ${filtros.pessoa}`);
  if (filtros.tipo) filtrosAtivos.push(`Tipo: ${filtros.tipo === "credito" ? "Crédito" : "Débito"}`);
  if (filtros.dia) filtrosAtivos.push(`Data: ${format(new Date(`${filtros.dia}T12:00:00`), "dd/MM/yyyy")}`);

  const lancamentos = blocos.reduce((s, b) => s + b.lancamentos.length, 0);
  const subtitulo = [
    mesRotulo,
    plural(blocos.length, "pessoa", "pessoas"),
    plural(lancamentos, "lançamento", "lançamentos"),
    ...filtrosAtivos,
  ].join(" · ");

  resumoDaPrimeiraPagina(ctx, blocos, subtitulo);

  const nomesPorPagina = new Map<number, string[]>();
  let y = 0;
  let anteriorPequena = false;

  blocos.forEach((bloco, i) => {
    const cabe = i > 0 && anteriorPequena && y + 8 + alturaEstimada(bloco) <= 279;
    if (cabe) {
      y += 8;
    } else {
      ctx.doc.addPage();
      y = 24;
    }
    const primeira = ctx.doc.getNumberOfPages();
    y = paginaDaPessoa(ctx, bloco, mes, y);
    registrarPaginas(nomesPorPagina, bloco.nome, primeira, ctx.doc.getNumberOfPages());
    anteriorPequena = bloco.lancamentos.length <= 6;
  });

  if (blocos.length > 0) {
    const totalGeral = centavos(blocos.reduce((s, b) => s + b.total, 0));
    const pagoGeral = centavos(blocos.reduce((s, b) => s + b.pago, 0));
    const dividaGeral = centavos(blocos.reduce((s, b) => s + b.divida, 0));
    fechamento(
      ctx,
      y + 4,
      `Fechamento de ${nomeMes(mes)}`,
      `${plural(lancamentos, "lançamento", "lançamentos")} · ${plural(blocos.length, "pessoa", "pessoas")}`,
      [
        { rotulo: "Total geral", valor: moeda(totalGeral) },
        { rotulo: "Pago", valor: moeda(pagoGeral) },
        { rotulo: "Vai para a dívida", valor: moeda(dividaGeral), cor: dividaGeral > 0 ? LARANJA_TEXTO : TINTA_2 },
      ]
    );
  }

  finalizarPaginas(ctx, { titulo: "Relatório de despesas", mesRotulo, nomesPorPagina, geradoEm: new Date() });

  let filename = `gastos_${format(mes, "MM-yyyy")}`;
  if (filtros.pessoa) filename += `_${filtros.pessoa.replace(/\s+/g, "_")}`;
  ctx.doc.save(`${filename}.pdf`);
};

// ======================================================= Meus gastos

const NATUREZA: Record<string, string> = { pessoal: "Pessoal", dividido: "Dividido", fixo: "Fixo" };

const valorDoGasto = (g: MeuGasto) =>
  centavos(g.categoria === "dividido" && g.minha_parte != null ? g.minha_parte : g.valor);

export const generateMeusGastosPDF = async (
  meusGastosDoMes: MeuGasto[],
  gastosFixos: MeuGasto[],
  metas: MetaGasto[],
  totais: {
    credito: number;
    debito: number;
    pagos: number;
    fixos: number;
  },
  mes: Date,
  filtros: { categoria: string; dia: string }
) => {
  const ctx = await criarContexto();
  const mesRotulo = rotuloMes(mes);
  const fixosAtivos = gastosFixos.filter((g) => g.ativo !== false);
  const totalMes = centavos(totais.credito + totais.debito);

  const filtrosAtivos: string[] = [];
  if (filtros.categoria) filtrosAtivos.push(`Categoria: ${NATUREZA[filtros.categoria] || filtros.categoria}`);
  if (filtros.dia) filtrosAtivos.push(`Data: ${format(new Date(`${filtros.dia}T12:00:00`), "dd/MM/yyyy")}`);

  const subtitulo = [
    mesRotulo,
    plural(meusGastosDoMes.length, "lançamento", "lançamentos"),
    plural(fixosAtivos.length, "fixo", "fixos"),
    ...filtrosAtivos,
  ].join(" · ");

  let y = tituloDePagina(ctx, "Meus gastos", subtitulo, 32);
  const doTipo = (tipo: string) => meusGastosDoMes.filter((g) => g.tipo === tipo).length;
  y = faixaDeIndicadores(
    ctx,
    y + 4,
    [
      { rotulo: "Total do mês", valor: moeda(totalMes), apoio: `Pago ${moeda(totais.pagos)}` },
      { rotulo: "Crédito", valor: moeda(totais.credito), apoio: plural(doTipo("credito"), "lançamento", "lançamentos") },
      { rotulo: "Débito", valor: moeda(totais.debito), apoio: plural(doTipo("debito"), "lançamento", "lançamentos") },
      { rotulo: "Fixos", valor: moeda(totais.fixos), apoio: plural(fixosAtivos.length, "ativo", "ativos") },
    ],
    13
  );
  y += 11;

  if (metas.length > 0) {
    y = garantirEspaco(ctx, y, 30);
    y = tituloDeSecao(ctx, y, "Limites de gasto", "Quanto já foi gasto em cada categoria contra o limite definido.") + 2.5;
    for (const meta of metas) {
      y = garantirEspaco(ctx, y, 11);
      const gasto = meusGastosDoMes
        .filter((g) => categoriaDeGasto(g).toLowerCase() === meta.categoria.toLowerCase())
        .reduce((soma, g) => soma + valorDoGasto(g), 0);
      const pct = meta.limite > 0 ? (gasto / meta.limite) * 100 : 0;
      const estourou = gasto > meta.limite;

      pontoDeCategoria(ctx, MARGEM + 1, y + 2.2, corCategoria(meta.categoria));
      escrever(ctx, meta.categoria, MARGEM + 4.6, y + 3.3, "texto", { tamanho: 9, cor: TINTA });
      escreverMisto(ctx, `${moeda(gasto)} / ${moeda(meta.limite)} · ${Math.round(pct)}%`, MARGEM + LARGURA, y + 3.3, {
        tamanho: 8.5,
        cor: estourou ? PERIGO : TINTA_2,
        alinhar: "direita",
      });
      ctx.doc.setFillColor(...FIO);
      ctx.doc.rect(MARGEM, y + 5.6, LARGURA, 0.8, "F");
      ctx.doc.setFillColor(...(estourou ? PERIGO : pct >= 80 ? LARANJA : TINTA));
      ctx.doc.rect(MARGEM, y + 5.6, Math.max(0, Math.min(1, pct / 100)) * LARGURA, 0.8, "F");
      y += 11;
    }
    y += 4;
  }

  if (fixosAtivos.length > 0) {
    y = garantirEspaco(ctx, y, 25);
    escrever(ctx, "Gastos fixos", MARGEM, y, "texto", { tamanho: 11, peso: 500, cor: TINTA });
    escrever(ctx, moeda(totais.fixos), MARGEM + LARGURA, y, "mono", { tamanho: 8.5, cor: TINTA_2, alinhar: "direita" });
    const ordenados = [...fixosAtivos].sort((a, b) => (a.dia_vencimento || 0) - (b.dia_vencimento || 0));
    y = tabelaPlana(ctx, {
      startY: y + 2.5,
      cabecalho: ["Vencimento", "Descrição", "Categoria", "Pagamento", "Valor"],
      linhas: ordenados.map((g) => [
        `Dia ${g.dia_vencimento || "—"}`,
        g.descricao,
        categoriaDeGasto(g),
        rotuloTipo(g.tipo),
        moeda(centavos(g.minha_parte || g.valor)),
      ]),
      colunas: [
        { largura: 22, mono: true },
        { elipse: true },
        { largura: 36, recuoEsquerdo: 5 },
        { largura: 18 },
        { largura: 26, direita: true, mono: true },
      ],
      aoAnalisar: (dados) => {
        if (dados.section === "body" && [0, 2, 3].includes(dados.column.index)) {
          dados.cell.styles.textColor = TINTA_2;
        }
      },
      aoDesenhar: (dados) => {
        if (dados.section === "body" && dados.column.index === 2) {
          pontoDeCategoria(ctx, dados.cell.x + 2.2, dados.cell.y + dados.cell.height / 2, corCategoria(String(dados.cell.raw)));
        }
      },
    });
    y += 9;
  }

  if (meusGastosDoMes.length > 0) {
    y = garantirEspaco(ctx, y, 25);
    const titulo = "Lançamentos do mês";
    escrever(ctx, titulo, MARGEM, y, "texto", { tamanho: 11, peso: 500, cor: TINTA });
    definirFonte(ctx, "texto", 11, 500, TINTA);
    escreverMisto(ctx, ` · ${meusGastosDoMes.length}`, MARGEM + ctx.doc.getTextWidth(titulo), y, {
      tamanho: 11,
      cor: TINTA_3,
    });
    escrever(ctx, moeda(totalMes), MARGEM + LARGURA, y, "mono", { tamanho: 8.5, cor: TINTA_2, alinhar: "direita" });

    const ordenados = [...meusGastosDoMes].sort((a, b) => a.data.localeCompare(b.data));
    y = tabelaPlana(ctx, {
      startY: y + 2.5,
      cabecalho: ["Data", "Descrição", "Categoria", "Tipo", "Pagamento", "Status", "Valor"],
      linhas: ordenados.map((g) => [
        dataCurta(g.data),
        g.descricao,
        categoriaDeGasto(g),
        NATUREZA[g.categoria] || g.categoria,
        rotuloTipo(g.tipo),
        g.pago || g.tipo === "debito" ? "Pago" : "Pendente",
        moeda(valorDoGasto(g)),
      ]),
      colunas: [
        { largura: 14, mono: true },
        { elipse: true },
        { largura: 34, recuoEsquerdo: 5 },
        { largura: 17 },
        { largura: 17 },
        { largura: 16 },
        { largura: 24, direita: true, mono: true },
      ],
      aoAnalisar: (dados) => {
        if (dados.section !== "body") return;
        if ([0, 2, 3, 4].includes(dados.column.index)) dados.cell.styles.textColor = TINTA_2;
        if (dados.column.index === 5) {
          dados.cell.styles.textColor = dados.cell.raw === "Pago" ? TINTA_2 : LARANJA_TEXTO;
        }
      },
      aoDesenhar: (dados) => {
        if (dados.section === "body" && dados.column.index === 2) {
          pontoDeCategoria(ctx, dados.cell.x + 2.2, dados.cell.y + dados.cell.height / 2, corCategoria(String(dados.cell.raw)));
        }
      },
    });
    y += 9;
  }

  const porCategoria = new Map<string, number>();
  for (const g of meusGastosDoMes) {
    const nome = categoriaDeGasto(g);
    porCategoria.set(nome, centavos((porCategoria.get(nome) ?? 0) + valorDoGasto(g)));
  }
  const linhas: LinhaDeBarra[] = [...porCategoria.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor]) => ({ nome, valor, cor: corCategoria(nome) }));

  if (linhas.length > 0) {
    y = garantirEspaco(ctx, y, 30);
    y = tituloDeSecao(ctx, y, "Por categoria", "Soma dos lançamentos do mês, da maior para a menor.");
    const somaCategorias = linhas.reduce((s, l) => s + l.valor, 0);
    y = barrasDeCategoria(ctx, y + 2, linhas, somaCategorias) + 4;
  }

  fechamento(
    ctx,
    y,
    `Fechamento de ${nomeMes(mes)}`,
    `${plural(meusGastosDoMes.length, "lançamento", "lançamentos")} · ${plural(fixosAtivos.length, "fixo", "fixos")}`,
    [
      { rotulo: "Total geral", valor: moeda(totalMes) },
      { rotulo: "Pago", valor: moeda(totais.pagos) },
      { rotulo: "Fixos", valor: moeda(totais.fixos) },
    ]
  );

  finalizarPaginas(ctx, { titulo: "Meus gastos", mesRotulo, geradoEm: new Date() });

  let filename = `meus_gastos_${format(mes, "MM-yyyy")}`;
  if (filtros.categoria) filename += `_${filtros.categoria}`;
  ctx.doc.save(`${filename}.pdf`);
};
