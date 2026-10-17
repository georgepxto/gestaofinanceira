import { format } from "date-fns";
import type { SaldoDevedor } from "../../types";
import {
  FUNDO,
  LARANJA_TEXTO,
  LARGURA,
  MARGEM,
  PILULA_ABERTO,
  TINTA,
  TINTA_2,
  centavos,
  criarContexto,
  escrever,
  escreverMisto,
  faixaDeAcerto,
  faixaDeIndicadores,
  finalizarPaginas,
  garantirEspaco,
  moeda,
  percentual,
  pilula,
  plural,
  quadradoComInicial,
  registrarPaginas,
  tabelaPlana,
  textoDePagamentos,
  tituloDePagina,
  tituloDeSecao,
  type Ctx,
  type RGB,
} from "./base";

const SEM_PESSOA = "Sem pessoa";

interface Pagamento {
  data: string;
  valor: number;
  cobranca: string;
  observacao: string;
}

interface BlocoCobrancas {
  nome: string;
  abertas: SaldoDevedor[];
  quitadas: SaldoDevedor[];
  original: number;
  pago: number;
  aberto: number;
  pagamentos: Pagamento[];
}

const dataCompleta = (data: string) => {
  const iso = data?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : data || "—";
};

const porData = (a: string, b: string) => (a || "").localeCompare(b || "");

function montarBlocos(saldos: SaldoDevedor[], apenas?: string): BlocoCobrancas[] {
  const mapa = new Map<string, BlocoCobrancas>();
  for (const saldo of saldos) {
    const nome = saldo.pessoa?.trim() || SEM_PESSOA;
    if (apenas !== undefined && nome !== (apenas.trim() || SEM_PESSOA)) continue;
    const bloco =
      mapa.get(nome) ??
      { nome, abertas: [], quitadas: [], original: 0, pago: 0, aberto: 0, pagamentos: [] };
    mapa.set(nome, bloco);
    if (saldo.valor_atual > 0.009) bloco.abertas.push(saldo);
    else bloco.quitadas.push(saldo);
  }

  for (const bloco of mapa.values()) {
    bloco.abertas.sort((a, b) => porData(a.data_criacao, b.data_criacao));
    bloco.quitadas.sort((a, b) => porData(b.data_criacao, a.data_criacao));
    bloco.original = centavos(bloco.abertas.reduce((s, d) => s + d.valor_original, 0));
    bloco.aberto = centavos(bloco.abertas.reduce((s, d) => s + d.valor_atual, 0));
    bloco.pago = centavos(bloco.original - bloco.aberto);
    bloco.pagamentos = bloco.abertas
      .flatMap((d) =>
        (d.historico ?? []).map((p) => ({
          data: p.data,
          valor: p.valor,
          cobranca: d.descricao,
          observacao: p.observacao ?? "",
        }))
      )
      .sort((a, b) => porData(b.data, a.data));
  }

  return [...mapa.values()]
    .filter((b) => apenas !== undefined || b.abertas.length > 0)
    .sort((a, b) => {
      if (a.nome === SEM_PESSOA) return 1;
      if (b.nome === SEM_PESSOA) return -1;
      return b.aberto - a.aberto || a.nome.localeCompare(b.nome, "pt-BR");
    });
}

function situacaoDe(b: BlocoCobrancas): { rotulo: string; fundo: RGB; cor: RGB } {
  if (b.aberto <= 0) return { rotulo: "Quitado", fundo: FUNDO, cor: TINTA_2 };
  if (b.pago <= 0) return { rotulo: "Em aberto", fundo: PILULA_ABERTO, cor: LARANJA_TEXTO };
  return { rotulo: "Parcial", fundo: FUNDO, cor: TINTA };
}

function resumoGeral(ctx: Ctx, blocos: BlocoCobrancas[], hoje: string) {
  const original = centavos(blocos.reduce((s, b) => s + b.original, 0));
  const pago = centavos(blocos.reduce((s, b) => s + b.pago, 0));
  const aberto = centavos(blocos.reduce((s, b) => s + b.aberto, 0));
  const cobrancas = blocos.reduce((s, b) => s + b.abertas.length, 0);

  let y = tituloDePagina(
    ctx,
    "Cobranças em aberto",
    `Posição em ${hoje} · ${plural(blocos.length, "pessoa", "pessoas")} · ${plural(cobrancas, "cobrança", "cobranças")}`,
    32
  );
  y = faixaDeIndicadores(ctx, y + 4, [
    {
      rotulo: "Em aberto",
      valor: moeda(aberto),
      apoio: plural(cobrancas, "cobrança ativa", "cobranças ativas"),
      corValor: aberto > 0 ? LARANJA_TEXTO : TINTA,
    },
    { rotulo: "Já pago", valor: moeda(pago), apoio: `${percentual(pago, original)}% do valor original` },
    { rotulo: "Valor original", valor: moeda(original), apoio: "das cobranças em aberto" },
  ]);

  y = tituloDeSecao(ctx, y + 11, "Por pessoa", "O que cada um ainda deve e o que já pagou das cobranças em aberto.");
  tabelaPlana(ctx, {
    startY: y + 1.5,
    cabecalho: ["Pessoa", "Cobr.", "Valor original", "Pago", "Em aberto", "Situação"],
    linhas: [
      ...blocos.map((b) => [
        b.nome,
        String(b.abertas.length),
        moeda(b.original),
        moeda(b.pago),
        moeda(b.aberto),
        "",
      ]),
      ["Total", String(cobrancas), moeda(original), moeda(pago), moeda(aberto), ""],
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
        dados.cell.styles.textColor = blocos[dados.row.index].aberto > 0 ? LARANJA_TEXTO : TINTA_2;
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
        const s = situacaoDe(bloco);
        pilula(ctx, cell.x + 5, cell.y + cell.height / 2, s.rotulo, s.fundo, s.cor);
      }
    },
  });
}

function tituloDeGrupo(ctx: Ctx, y: number, titulo: string, quantidade: number, subtotal?: number) {
  escrever(ctx, titulo, MARGEM, y, "texto", { tamanho: 9, peso: 500, cor: TINTA });
  ctx.doc.setFont(ctx.texto, "bold");
  ctx.doc.setFontSize(9);
  escreverMisto(ctx, ` · ${quantidade}`, MARGEM + ctx.doc.getTextWidth(titulo), y, {
    tamanho: 9,
    cor: TINTA_2,
  });
  if (subtotal !== undefined) {
    escrever(ctx, moeda(subtotal), MARGEM + LARGURA, y, "mono", {
      tamanho: 8.5,
      cor: TINTA_2,
      alinhar: "direita",
    });
  }
}

function paginaDaPessoa(ctx: Ctx, b: BlocoCobrancas, yInicial: number) {
  let y = yInicial;
  quadradoComInicial(ctx, MARGEM, y, 9, b.nome);
  escrever(ctx, b.nome, MARGEM + 12.5, y + 4.6, "texto", { tamanho: 17, peso: 500, cor: TINTA });
  escreverMisto(
    ctx,
    b.abertas.length > 0
      ? plural(b.abertas.length, "cobrança em aberto", "cobranças em aberto")
      : "Nenhuma cobrança em aberto",
    MARGEM + 12.5,
    y + 9.2,
    { tamanho: 8.5, cor: TINTA_2 }
  );
  escrever(ctx, "Em aberto", MARGEM + LARGURA, y + 1.8, "texto", { tamanho: 8, cor: TINTA_2, alinhar: "direita" });
  escrever(ctx, moeda(b.aberto), MARGEM + LARGURA, y + 8.2, "mono", {
    tamanho: 15,
    cor: b.aberto > 0 ? LARANJA_TEXTO : TINTA,
    alinhar: "direita",
  });
  y += 15;

  const pct = percentual(b.pago, b.original);
  y =
    faixaDeAcerto(ctx, y, {
      pct,
      apoio:
        b.pagamentos.length === 0
          ? "Nenhum pagamento registrado"
          : textoDePagamentos(
              ctx,
              pct,
              b.pagamentos.map((p) => ({ data: p.data, valor: p.valor }))
            ),
      pago: b.pago,
      aberto: b.aberto,
      rotuloAberto: "Em aberto",
    }) + 8;

  if (b.abertas.length > 0) {
    y = garantirEspaco(ctx, y, 25);
    tituloDeGrupo(ctx, y, "Em aberto", b.abertas.length, b.aberto);
    y =
      tabelaPlana(ctx, {
        startY: y + 2.5,
        cabecalho: ["Criada em", "Descrição", "Valor original", "Pago", "Em aberto"],
        linhas: b.abertas.map((d) => [
          dataCompleta(d.data_criacao),
          d.descricao,
          moeda(d.valor_original),
          moeda(centavos(d.valor_original - d.valor_atual)),
          moeda(d.valor_atual),
        ]),
        colunas: [
          { largura: 24, mono: true },
          { elipse: true },
          { largura: 30, direita: true, mono: true },
          { largura: 28, direita: true, mono: true },
          { largura: 28, direita: true, mono: true },
        ],
        aoAnalisar: (dados) => {
          if (dados.section !== "body") return;
          if (dados.column.index === 0 || dados.column.index === 3) dados.cell.styles.textColor = TINTA_2;
          if (dados.column.index === 4) dados.cell.styles.textColor = LARANJA_TEXTO;
        },
      }) + 8;
  }

  if (b.pagamentos.length > 0) {
    y = garantirEspaco(ctx, y, 25);
    tituloDeGrupo(ctx, y, "Pagamentos recebidos", b.pagamentos.length, b.pago);
    y =
      tabelaPlana(ctx, {
        startY: y + 2.5,
        cabecalho: ["Data", "Cobrança", "Observação", "Valor"],
        linhas: b.pagamentos.map((p) => [dataCompleta(p.data), p.cobranca, p.observacao, moeda(p.valor)]),
        colunas: [
          { largura: 24, mono: true },
          { elipse: true },
          { largura: 52, elipse: true },
          { largura: 28, direita: true, mono: true },
        ],
        aoAnalisar: (dados) => {
          if (dados.section === "body" && [0, 2].includes(dados.column.index)) {
            dados.cell.styles.textColor = TINTA_2;
          }
        },
      }) + 8;
  }

  if (b.quitadas.length > 0) {
    y = garantirEspaco(ctx, y, 25);
    tituloDeGrupo(ctx, y, "Já quitadas", b.quitadas.length);
    tabelaPlana(ctx, {
      startY: y + 2.5,
      cabecalho: ["Criada em", "Descrição", "Quitada em", "Valor"],
      linhas: b.quitadas.map((d) => {
        const ultimo = d.historico?.[d.historico.length - 1];
        return [
          dataCompleta(d.data_criacao),
          d.descricao,
          ultimo ? dataCompleta(ultimo.data) : "—",
          moeda(d.valor_original),
        ];
      }),
      colunas: [
        { largura: 24, mono: true },
        { elipse: true },
        { largura: 28, mono: true },
        { largura: 28, direita: true, mono: true },
      ],
      aoAnalisar: (dados) => {
        if (dados.section === "body") dados.cell.styles.textColor = TINTA_2;
      },
    });
  }
}

/**
 * Extrato de cobranças em aberto: um resumo com todo mundo e uma página por
 * pessoa. Com `pessoa`, só o extrato dela — o PDF que se manda para ela.
 */
export const generateCobrancasPDF = async (saldos: SaldoDevedor[], pessoa?: string) => {
  const ctx = await criarContexto();
  const blocos = montarBlocos(saldos, pessoa);
  const hoje = format(new Date(), "dd/MM/yyyy");
  const nomesPorPagina = new Map<number, string[]>();

  if (pessoa === undefined) {
    resumoGeral(ctx, blocos, hoje);
    for (const bloco of blocos) {
      ctx.doc.addPage();
      const primeira = ctx.doc.getNumberOfPages();
      paginaDaPessoa(ctx, bloco, 24);
      registrarPaginas(nomesPorPagina, bloco.nome, primeira, ctx.doc.getNumberOfPages());
    }
  } else if (blocos.length > 0) {
    const y = tituloDePagina(ctx, "Extrato de cobranças", `Posição em ${hoje}`, 32);
    paginaDaPessoa(ctx, blocos[0], y + 6);
    registrarPaginas(nomesPorPagina, blocos[0].nome, 2, ctx.doc.getNumberOfPages());
  }

  finalizarPaginas(ctx, {
    titulo: "Extrato de cobranças",
    mesRotulo: hoje,
    nomesPorPagina,
    geradoEm: new Date(),
  });

  let nome = `cobrancas_${format(new Date(), "dd-MM-yyyy")}`;
  if (pessoa) nome += `_${pessoa.trim().replace(/\s+/g, "_")}`;
  ctx.doc.save(`${nome}.pdf`);
};
