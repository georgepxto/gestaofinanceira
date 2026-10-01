import type { Previsao } from "../../../utils/previsao";

/* ═══════════════════════════════════════════════════════════════════════
   Dados fictícios das telas do app na landing. Uma pessoa só (Marina), um
   mês só (outubro de 2026), números que fecham entre si: o saldo de hoje é a
   soma das contas, o previsto é o extrato do Início, e o que as pessoas
   devem bate com A receber.
   ═══════════════════════════════════════════════════════════════════════ */

export const USUARIA = "Marina";
export const MES = "Outubro 2026";
export const MES_CURTO = "outubro";

export const CONTAS = [
  { nome: "Nubank", banco: "Conta corrente", saldo: 3214.9 },
  { nome: "Itaú", banco: "Poupança", saldo: 1597.5 },
];
export const SALDO_HOJE = CONTAS.reduce((s, c) => s + c.saldo, 0); // 4.812,40

export type Lancamento = {
  id: number;
  descricao: string;
  categoria: string;
  tipo: "credito" | "debito";
  valor: number;
  /** Minha parte, quando dividido. */
  minhaParte?: number;
  pessoas?: string;
  dia: number;
  fixo?: boolean;
  /** Dinheiro que entrou (Pix de alguém que te devia). */
  entrada?: boolean;
};

export const LANCAMENTOS: Lancamento[] = [
  { id: 1, descricao: "Mercado da semana", categoria: "Alimentação", tipo: "debito", valor: 212.4, dia: 28 },
  { id: 2, descricao: "Uber", categoria: "Transporte", tipo: "credito", valor: 23.9, dia: 28 },
  { id: 3, descricao: "Jantar de aniversário", categoria: "Lazer", tipo: "credito", valor: 186, minhaParte: 62, pessoas: "Ana, Bruno", dia: 27 },
  { id: 4, descricao: "Farmácia", categoria: "Saúde", tipo: "debito", valor: 41.6, dia: 26 },
  { id: 5, descricao: "Padaria", categoria: "Alimentação", tipo: "debito", valor: 18.5, dia: 26 },
  { id: 6, descricao: "Gasolina", categoria: "Transporte", tipo: "credito", valor: 150, dia: 24 },
];

export const FIXOS = [
  { descricao: "Aluguel", valor: 3150, minhaParte: 1050, dia: 5, pessoas: "Ana, Bruno" },
  { descricao: "Internet", valor: 119.9, dia: 15 },
  { descricao: "Academia", valor: 89.9, dia: 30 },
  { descricao: "Streaming", valor: 39.9, dia: 30 },
];

export const METAS = [
  { categoria: "Alimentação", gasto: 812.4, limite: 900 },
  { categoria: "Transporte", gasto: 239.3, limite: 400 },
  { categoria: "Lazer", gasto: 150, limite: 350 },
  { categoria: "Assinaturas", gasto: 39.9, limite: 120 },
];

export type PessoaMock = { nome: string; doMes: number; emCobrancas: number; cobrancas: number };
export const PESSOAS: PessoaMock[] = [
  { nome: "Ana", doMes: 1112, emCobrancas: 0, cobrancas: 0 },
  { nome: "Bruno", doMes: 1112, emCobrancas: 137.6, cobrancas: 1 },
  { nome: "Carla", doMes: 0, emCobrancas: 0, cobrancas: 0 },
];

export const CARTAO = {
  nome: "Nubank",
  vence: 10,
  melhorDia: 3,
  limite: 5000,
  usado: 2910.4,
  fatura: 1842.17,
  itens: [
    { descricao: "Notebook (4/10)", categoria: "Educação", valor: 389.9, dia: 2 },
    { descricao: "Passagem (1/6)", categoria: "Lazer", valor: 312, dia: 1 },
    { descricao: "Tênis (2/3)", categoria: "Outros", valor: 149.9, dia: 1 },
    { descricao: "Gasolina", categoria: "Transporte", valor: 150, dia: 24 },
    { descricao: "Streaming", categoria: "Assinaturas", valor: 39.9, dia: 20, fixo: true },
  ],
};

/** A previsão do Início, no formato que o componente real lê. */
export function previsaoMock(saldoHoje = SALDO_HOJE, devolver: Record<string, number> = { Ana: 1112, Bruno: 1112 }): Previsao {
  const entradas = [{ descricao: "Salário", valor: 5200, dia: "2026-10-30", detalhe: "Nubank, fixa" }];
  const devolucoes = Object.entries(devolver)
    .filter(([, v]) => v > 0)
    .map(([nome, valor]) => ({ descricao: nome, valor, detalhe: "Aluguel, jantar" }));
  const saidas = [
    { descricao: "Academia", valor: 89.9, dia: "2026-10-30", detalhe: "fixo, Nubank" },
    { descricao: "Streaming", valor: 39.9, dia: "2026-10-30", detalhe: "fixo, Nubank" },
  ];
  const faturasPorCartao = [{ descricao: "Nubank", valor: CARTAO.fatura, dia: "2026-10-10", detalhe: "5 compras nesta fatura" }];
  const somar = (l: { valor: number }[]) => Math.round(l.reduce((s, x) => s + x.valor, 0) * 100) / 100;
  const vaiEntrar = somar(entradas);
  const vaoDevolver = somar(devolucoes);
  const vaiSair = somar(saidas);
  const faturas = somar(faturasPorCartao);
  return {
    mes: "2026-10",
    saldoHoje,
    vaiEntrar,
    vaoDevolver,
    vaiSair,
    faturas,
    fimDoMes: Math.round((saldoHoje + vaiEntrar + vaoDevolver - vaiSair - faturas) * 100) / 100,
    entradas,
    devolucoes,
    saidas,
    faturasPorCartao,
  };
}
