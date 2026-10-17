import jsPDF from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "../calculations";
import { CATEGORIAS_GASTO_PADRAO, chaveCategoria } from "../categories";

export type RGB = [number, number, number];

// Os mesmos tokens do tema claro do app (src/index.css), em papel.
export const TINTA: RGB = [11, 11, 12];
export const TINTA_2: RGB = [94, 94, 91];
export const TINTA_3: RGB = [106, 106, 102];
export const FIO: RGB = [226, 226, 222];
export const FIO_LEVE: RGB = [240, 240, 237];
export const FUNDO: RGB = [244, 244, 242];
export const LARANJA: RGB = [255, 107, 53];
export const LARANJA_TEXTO: RGB = [169, 63, 22];
export const PILULA_ABERTO: RGB = [251, 233, 225];
export const PERIGO: RGB = [191, 48, 53];

// --cat-1…8 do tema claro. A posição na lista padrão decide o tom, como no app.
const PALETA_CATEGORIAS: RGB[] = [
  [94, 118, 154],
  [79, 133, 145],
  [127, 104, 163],
  [151, 98, 140],
  [166, 100, 106],
  [156, 126, 79],
  [106, 109, 174],
  [122, 116, 110],
];

export function corCategoria(nome: string | null | undefined): RGB {
  if (!nome) return PALETA_CATEGORIAS[7];
  const chave = chaveCategoria(nome);
  const i = CATEGORIAS_GASTO_PADRAO.findIndex((c) => chaveCategoria(c) === chave);
  if (i >= 0) return PALETA_CATEGORIAS[i % 8];
  let hash = 0;
  for (const letra of chave) hash = (hash * 31 + letra.charCodeAt(0)) >>> 0;
  return PALETA_CATEGORIAS[hash % 7];
}

export const MARGEM = 15;
export const LARGURA = 180;
export const TOPO_CONTINUACAO = 24;
const RODAPE_FIO_Y = 284;
export const LIMITE_INFERIOR = 279;

export interface Ctx {
  doc: jsPDF;
  texto: string;
  mono: string;
}

// ---------------------------------------------------------------- fontes

// O jsPDF só embute TTF. Peso 500 entra como o estilo "bold" da família: o
// relatório nunca usa 700, então "bold" aqui quer dizer "Medium".
const ARQUIVOS_FONTE = {
  textoNormal: () => import("../../assets/pdf-fonts/Switzer-400.ttf?url"),
  textoMedio: () => import("../../assets/pdf-fonts/Switzer-500.ttf?url"),
  monoNormal: () => import("../../assets/pdf-fonts/GeistMono-400.ttf?url"),
  monoMedio: () => import("../../assets/pdf-fonts/GeistMono-500.ttf?url"),
};

type ChaveFonte = keyof typeof ARQUIVOS_FONTE;

async function baixarBase64(carregar: () => Promise<{ default: string }>): Promise<string> {
  const { default: url } = await carregar();
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`fonte indisponível (${resposta.status})`);
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binario);
}

let fontesEmCache: Promise<Record<ChaveFonte, string>> | null = null;

function carregarFontes(): Promise<Record<ChaveFonte, string>> {
  if (!fontesEmCache) {
    fontesEmCache = (async () => {
      const chaves = Object.keys(ARQUIVOS_FONTE) as ChaveFonte[];
      const dados = await Promise.all(chaves.map((c) => baixarBase64(ARQUIVOS_FONTE[c])));
      return Object.fromEntries(chaves.map((c, i) => [c, dados[i]])) as Record<ChaveFonte, string>;
    })().catch((erro) => {
      fontesEmCache = null;
      throw erro;
    });
  }
  return fontesEmCache;
}

export async function criarContexto(): Promise<Ctx> {
  const doc = new jsPDF();
  try {
    const dados = await carregarFontes();
    const registrar = (arquivo: string, familia: string, estilo: string, base64: string) => {
      doc.addFileToVFS(arquivo, base64);
      doc.addFont(arquivo, familia, estilo, undefined, "Identity-H");
    };
    registrar("Switzer-400.ttf", "Switzer", "normal", dados.textoNormal);
    registrar("Switzer-500.ttf", "Switzer", "bold", dados.textoMedio);
    registrar("GeistMono-400.ttf", "GeistMono", "normal", dados.monoNormal);
    registrar("GeistMono-500.ttf", "GeistMono", "bold", dados.monoMedio);
    return { doc, texto: "Switzer", mono: "GeistMono" };
  } catch {
    return { doc: new jsPDF(), texto: "helvetica", mono: "courier" };
  }
}

type Familia = "texto" | "mono";
type Peso = 400 | 500;

export function definirFonte(ctx: Ctx, familia: Familia, tamanho: number, peso: Peso, cor: RGB) {
  ctx.doc.setFont(ctx[familia], peso === 500 ? "bold" : "normal");
  ctx.doc.setFontSize(tamanho);
  ctx.doc.setTextColor(...cor);
}

// ------------------------------------------------------------ formatação

export const moeda = (valor: number) => formatCurrency(valor).replace(/\p{Zs}/gu, " ");

export const centavos = (valor: number) => Math.round(valor * 100) / 100;

export const plural = (n: number, singular: string, pluralForma: string) =>
  `${n} ${n === 1 ? singular : pluralForma}`;

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export const rotuloMes = (mes: Date) =>
  `${capitalizar(format(mes, "LLLL", { locale: ptBR }))} ${format(mes, "yyyy")}`;

export const nomeMes = (mes: Date) => format(mes, "LLLL", { locale: ptBR });

export const dataCurta = (data: string) => {
  const iso = data.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}`;
  const br = data.match(/^(\d{2})\/(\d{2})\//);
  return br ? `${br[1]}/${br[2]}` : data;
};

export const escapeRegex = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------------------------------------------------------- texto misto

// Números, R$, % e datas vão em Geist Mono; o resto da frase em Switzer.
const NUMEROS = /(R\$\s?-?[\d.]+(?:,\d+)?|\d+(?:[.,:/]\d+)*%?)/;

interface OpcoesTexto {
  tamanho: number;
  peso?: Peso;
  cor: RGB;
  alinhar?: "esquerda" | "direita";
}

function partesMistas(texto: string) {
  return texto
    .split(NUMEROS)
    .map((trecho, i) => ({ trecho, mono: i % 2 === 1 }))
    .filter((p) => p.trecho !== "");
}

export function larguraMista(ctx: Ctx, texto: string, tamanho: number, peso: Peso = 400): number {
  return partesMistas(texto).reduce((soma, p) => {
    definirFonte(ctx, p.mono ? "mono" : "texto", tamanho, peso, TINTA);
    return soma + ctx.doc.getTextWidth(p.trecho);
  }, 0);
}

export function escreverMisto(ctx: Ctx, texto: string, x: number, y: number, o: OpcoesTexto) {
  const peso = o.peso ?? 400;
  let cursor = o.alinhar === "direita" ? x - larguraMista(ctx, texto, o.tamanho, peso) : x;
  for (const p of partesMistas(texto)) {
    definirFonte(ctx, p.mono ? "mono" : "texto", o.tamanho, peso, o.cor);
    ctx.doc.text(p.trecho, cursor, y);
    cursor += ctx.doc.getTextWidth(p.trecho);
  }
}

export function escrever(
  ctx: Ctx,
  texto: string,
  x: number,
  y: number,
  familia: Familia,
  o: OpcoesTexto
) {
  definirFonte(ctx, familia, o.tamanho, o.peso ?? 400, o.cor);
  const largura = o.alinhar === "direita" ? ctx.doc.getTextWidth(texto) : 0;
  ctx.doc.text(texto, x - largura, y);
}

// ----------------------------------------------------------------- marca

// public/hedge-mark.svg desenhado em vetor: dois polígonos, um deles com o
// arco de 120° (raio 250) do lado direito amostrado em segmentos.
const VIEWBOX = { x: 61.31, y: -4.07, lado: 1251.7 };

function marcaPontos(): [number, number][][] {
  const corpo: [number, number][] = [
    [200, 20], [414, 143.55], [414, 563.86], [778, 774.02], [778, 1100],
    [564, 1223.55], [564, 897.57], [414, 810.97], [414, 1023.55], [200, 900],
  ];
  const centro: [number, number] = [924.31, 726.855];
  const arco: [number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const ang = ((-60 + (120 * i) / 16) * Math.PI) / 180;
    arco.push([centro[0] + 250 * Math.cos(ang), centro[1] + 250 * Math.sin(ang)]);
  }
  const fita: [number, number][] = [[564, 230.16], ...arco, [928, 1013.4], [928, 687.42], [564, 477.26]];
  return [corpo, fita];
}

export function desenharMarca(ctx: Ctx, x: number, y: number, tamanho: number, cor: RGB = LARANJA) {
  const k = tamanho / VIEWBOX.lado;
  ctx.doc.setFillColor(...cor);
  for (const poligono of marcaPontos()) {
    const pts = poligono.map(([px, py]) => [x + (px - VIEWBOX.x) * k, y + (py - VIEWBOX.y) * k]);
    const passos = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
    ctx.doc.lines(passos, pts[0][0], pts[0][1], [1, 1], "F", true);
  }
}

// ------------------------------------------------- cabeçalho e rodapé

export function cabecalhoPrimeiraPagina(ctx: Ctx, geradoEm: Date) {
  desenharMarca(ctx, MARGEM, 9.5, 6);
  escrever(ctx, "Hedge", MARGEM + 8.2, 14.1, "texto", { tamanho: 10.5, peso: 500, cor: TINTA });
  escreverMisto(
    ctx,
    `Gerado em ${format(geradoEm, "dd/MM/yyyy 'às' HH:mm")}`,
    MARGEM + LARGURA,
    13.8,
    { tamanho: 8, cor: TINTA_3, alinhar: "direita" }
  );
}

function cabecalhoContinuacao(ctx: Ctx, titulo: string, nomes: string[]) {
  desenharMarca(ctx, MARGEM, 8, 3.8);
  escreverMisto(ctx, titulo, MARGEM + 5.6, 11.2, { tamanho: 8, cor: TINTA_2 });
  if (nomes.length > 0) {
    let texto = nomes.join(", ");
    const limite = LARGURA - larguraMista(ctx, titulo, 8) - 14;
    while (texto.length > 4 && larguraMista(ctx, texto, 8) > limite) {
      texto = `${texto.slice(0, -2).trimEnd()}…`;
    }
    escreverMisto(ctx, texto, MARGEM + LARGURA, 11.2, { tamanho: 8, cor: TINTA_2, alinhar: "direita" });
  }
  ctx.doc.setDrawColor(...FIO);
  ctx.doc.setLineWidth(0.2);
  ctx.doc.line(MARGEM, 14.5, MARGEM + LARGURA, 14.5);
}

function rodape(ctx: Ctx, pagina: number, total: number, titulo: string) {
  ctx.doc.setDrawColor(...FIO);
  ctx.doc.setLineWidth(0.2);
  ctx.doc.line(MARGEM, RODAPE_FIO_Y, MARGEM + LARGURA, RODAPE_FIO_Y);
  escreverMisto(ctx, `Hedge · ${titulo}`, MARGEM, RODAPE_FIO_Y + 5, { tamanho: 7.5, cor: TINTA_3 });
  escreverMisto(ctx, `Página ${pagina} de ${total}`, MARGEM + LARGURA, RODAPE_FIO_Y + 5, {
    tamanho: 7.5,
    cor: TINTA_3,
    alinhar: "direita",
  });
}

export interface FimDoDocumento {
  titulo: string;
  mesRotulo: string;
  nomesPorPagina?: Map<number, string[]>;
  geradoEm: Date;
}

export function finalizarPaginas(ctx: Ctx, fim: FimDoDocumento) {
  const total = ctx.doc.getNumberOfPages();
  for (let pagina = 1; pagina <= total; pagina++) {
    ctx.doc.setPage(pagina);
    if (pagina === 1) cabecalhoPrimeiraPagina(ctx, fim.geradoEm);
    else cabecalhoContinuacao(ctx, `${fim.titulo} · ${fim.mesRotulo}`, fim.nomesPorPagina?.get(pagina) ?? []);
    rodape(ctx, pagina, total, `${fim.titulo} · ${fim.mesRotulo}`);
  }
}

export function registrarPaginas(
  mapa: Map<number, string[]>,
  nome: string,
  primeira: number,
  ultima: number
) {
  for (let p = primeira; p <= ultima; p++) {
    const nomes = mapa.get(p) ?? [];
    if (!nomes.includes(nome)) mapa.set(p, [...nomes, nome]);
  }
}

// ---------------------------------------------------------- componentes

export function garantirEspaco(ctx: Ctx, y: number, altura: number): number {
  if (y + altura <= LIMITE_INFERIOR) return y;
  ctx.doc.addPage();
  return TOPO_CONTINUACAO;
}

export function tituloDePagina(ctx: Ctx, titulo: string, subtitulo: string, y: number): number {
  escrever(ctx, titulo, MARGEM, y, "texto", { tamanho: 22, peso: 500, cor: TINTA });
  escreverMisto(ctx, subtitulo, MARGEM, y + 6.6, { tamanho: 10, cor: TINTA_2 });
  return y + 12;
}

export function tituloDeSecao(ctx: Ctx, y: number, titulo: string, apoio?: string): number {
  escrever(ctx, titulo, MARGEM, y, "texto", { tamanho: 11, peso: 500, cor: TINTA });
  if (!apoio) return y + 3;
  escreverMisto(ctx, apoio, MARGEM, y + 4.7, { tamanho: 8, cor: TINTA_2 });
  return y + 8;
}

export interface Indicador {
  rotulo: string;
  valor: string;
  apoio: string;
  corValor?: RGB;
}

export function faixaDeIndicadores(ctx: Ctx, y: number, itens: Indicador[], tamanhoValor = 16): number {
  const altura = 23;
  const coluna = LARGURA / itens.length;
  ctx.doc.setFillColor(...FUNDO);
  ctx.doc.roundedRect(MARGEM, y, LARGURA, altura, 1, 1, "F");
  itens.forEach((item, i) => {
    const x = MARGEM + i * coluna;
    if (i > 0) {
      ctx.doc.setDrawColor(...FIO);
      ctx.doc.setLineWidth(0.2);
      ctx.doc.line(x, y + 4, x, y + altura - 4);
    }
    escrever(ctx, item.rotulo, x + 5, y + 7, "texto", { tamanho: 8, cor: TINTA_2 });
    escrever(ctx, item.valor, x + 5, y + 14.6, "mono", {
      tamanho: tamanhoValor,
      cor: item.corValor ?? TINTA,
    });
    escreverMisto(ctx, item.apoio, x + 5, y + 19.6, { tamanho: 8, cor: TINTA_2 });
  });
  return y + altura;
}

export function pilula(ctx: Ctx, xEsq: number, yCentro: number, texto: string, fundo: RGB, cor: RGB) {
  definirFonte(ctx, "texto", 7, 500, cor);
  const largura = ctx.doc.getTextWidth(texto) + 4.4;
  ctx.doc.setFillColor(...fundo);
  ctx.doc.roundedRect(xEsq, yCentro - 2.1, largura, 4.2, 1, 1, "F");
  ctx.doc.text(texto, xEsq + 2.2, yCentro + 0.9);
}

export function quadradoComInicial(ctx: Ctx, x: number, y: number, lado: number, nome: string) {
  ctx.doc.setFillColor(...FUNDO);
  ctx.doc.roundedRect(x, y, lado, lado, 1, 1, "F");
  const inicial = nome.charAt(0).toUpperCase() || "?";
  definirFonte(ctx, "texto", lado * 1.35, 500, TINTA);
  const largura = ctx.doc.getTextWidth(inicial);
  ctx.doc.text(inicial, x + (lado - largura) / 2, y + lado * 0.69);
}

export function pontoDeCategoria(ctx: Ctx, x: number, y: number, cor: RGB, raio = 1) {
  ctx.doc.setFillColor(...cor);
  ctx.doc.circle(x, y, raio, "F");
}

export interface LinhaDeBarra {
  nome: string;
  valor: number;
  cor: RGB;
}

export function barrasDeCategoria(ctx: Ctx, yInicial: number, linhas: LinhaDeBarra[], total: number): number {
  const maior = Math.max(...linhas.map((l) => l.valor), 0.01);
  const trilho = { x: MARGEM + 52, largura: 74 };
  let y = yInicial;
  for (const linha of linhas) {
    y = garantirEspaco(ctx, y, 7);
    const centro = y + 2.4;
    pontoDeCategoria(ctx, MARGEM + 1, centro, linha.cor);
    let nome = linha.nome;
    definirFonte(ctx, "texto", 9, 400, TINTA);
    while (nome.length > 3 && ctx.doc.getTextWidth(nome) > 46) nome = `${nome.slice(0, -2).trimEnd()}…`;
    ctx.doc.text(nome, MARGEM + 4.6, y + 3.5);
    ctx.doc.setFillColor(...FUNDO);
    ctx.doc.roundedRect(trilho.x, centro - 0.9, trilho.largura, 1.8, 0.5, 0.5, "F");
    const preenchido = Math.max(0.6, (linha.valor / maior) * trilho.largura);
    ctx.doc.setFillColor(...linha.cor);
    ctx.doc.roundedRect(trilho.x, centro - 0.9, preenchido, 1.8, 0.5, 0.5, "F");
    escrever(ctx, moeda(linha.valor), MARGEM + 156, y + 3.5, "mono", {
      tamanho: 8.5,
      cor: TINTA,
      alinhar: "direita",
    });
    const pct = total > 0 ? (linha.valor / total) * 100 : 0;
    escrever(ctx, `${pct.toFixed(1).replace(".", ",")}%`, MARGEM + LARGURA, y + 3.5, "mono", {
      tamanho: 8.5,
      cor: TINTA_2,
      alinhar: "direita",
    });
    y += 7;
  }
  return y;
}

export interface ColunaFechamento {
  rotulo: string;
  valor: string;
  cor?: RGB;
}

export function fechamento(
  ctx: Ctx,
  yInicial: number,
  titulo: string,
  apoio: string,
  colunas: ColunaFechamento[]
): number {
  const y = garantirEspaco(ctx, yInicial, 24);
  ctx.doc.setDrawColor(...TINTA);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(MARGEM, y, MARGEM + LARGURA, y);
  escrever(ctx, titulo, MARGEM, y + 8, "texto", { tamanho: 11, peso: 500, cor: TINTA });
  escreverMisto(ctx, apoio, MARGEM, y + 13, { tamanho: 8.5, cor: TINTA_2 });
  const passo = 36;
  colunas.forEach((coluna, i) => {
    const direita = MARGEM + LARGURA - (colunas.length - 1 - i) * passo;
    escrever(ctx, coluna.rotulo, direita, y + 7, "texto", { tamanho: 7.5, cor: TINTA_3, alinhar: "direita" });
    escrever(ctx, coluna.valor, direita, y + 13.5, "mono", {
      tamanho: 11,
      peso: 500,
      cor: coluna.cor ?? TINTA,
      alinhar: "direita",
    });
  });
  return y + 18;
}

// --------------------------------------------------------------- tabelas

export interface ColunaDeTabela {
  largura?: number;
  direita?: boolean;
  mono?: boolean;
  recuoEsquerdo?: number;
  elipse?: boolean;
}

interface ConfigTabela {
  startY: number;
  cabecalho: string[];
  linhas: string[][];
  colunas: ColunaDeTabela[];
  tamanho?: number;
  alturaMinima?: number;
  linhaDeTotal?: boolean;
  aoAnalisar?: (dados: CellHookData) => void;
  aoDesenhar?: (dados: CellHookData) => void;
}

export function finalDaUltimaTabela(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

export function tabelaPlana(ctx: Ctx, cfg: ConfigTabela): number {
  const tamanho = cfg.tamanho ?? 8.5;
  const colunas: Record<number, Record<string, unknown>> = {};
  cfg.colunas.forEach((c, i) => {
    colunas[i] = {
      ...(c.largura ? { cellWidth: c.largura } : {}),
      ...(c.direita ? { halign: "right" } : {}),
      ...(c.mono ? { font: ctx.mono } : {}),
      ...(c.elipse ? { overflow: "ellipsize" } : {}),
      ...(c.recuoEsquerdo
        ? { cellPadding: { top: 0.95, bottom: 0.95, left: c.recuoEsquerdo, right: 1 } }
        : {}),
    };
  });

  autoTable(ctx.doc, {
    startY: cfg.startY,
    head: [cfg.cabecalho],
    body: cfg.linhas,
    theme: "plain",
    showHead: "everyPage",
    rowPageBreak: "avoid",
    margin: { left: MARGEM, right: MARGEM, top: TOPO_CONTINUACAO, bottom: 18 },
    styles: {
      font: ctx.texto,
      fontStyle: "normal",
      fontSize: tamanho,
      textColor: TINTA,
      cellPadding: { top: 0.95, bottom: 0.95, left: 1, right: 1 },
      minCellHeight: cfg.alturaMinima ?? 0,
      valign: "middle",
      lineWidth: { bottom: 0.2 },
      lineColor: FIO_LEVE,
      overflow: "linebreak",
    },
    headStyles: {
      fontSize: 7.5,
      textColor: TINTA_3,
      fillColor: false,
      lineWidth: 0,
      minCellHeight: 0,
    },
    columnStyles: colunas,
    didParseCell: (dados) => {
      if (dados.section === "head") {
        dados.cell.styles.font = ctx.texto;
        dados.cell.styles.fontStyle = "normal";
        dados.cell.styles.halign = cfg.colunas[dados.column.index]?.direita ? "right" : "left";
        dados.cell.styles.cellPadding = {
          top: 1.4,
          bottom: 1.4,
          left: cfg.colunas[dados.column.index]?.recuoEsquerdo ?? 1,
          right: 1,
        };
      } else if (cfg.linhaDeTotal && dados.row.index === cfg.linhas.length - 1) {
        dados.cell.styles.fontStyle = "bold";
        dados.cell.styles.lineWidth = 0;
      }
      cfg.aoAnalisar?.(dados);
    },
    didDrawCell: (dados) => {
      const { cell } = dados;
      if (dados.section === "head") {
        ctx.doc.setLineWidth(0.3);
        ctx.doc.setDrawColor(...TINTA);
        ctx.doc.line(cell.x, cell.y, cell.x + cell.width, cell.y);
        ctx.doc.setLineWidth(0.2);
        ctx.doc.setDrawColor(...FIO);
        ctx.doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
      } else if (cfg.linhaDeTotal && dados.row.index === cfg.linhas.length - 1) {
        ctx.doc.setLineWidth(0.3);
        ctx.doc.setDrawColor(...TINTA);
        ctx.doc.line(cell.x, cell.y, cell.x + cell.width, cell.y);
      }
      cfg.aoDesenhar?.(dados);
    },
  });

  return finalDaUltimaTabela(ctx.doc);
}
