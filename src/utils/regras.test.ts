import { describe, expect, it } from "vitest";
import type { CartaoCredito, ContaBancaria, Gasto, MeuGasto, Receita } from "../types";
import { MENOS, formatDinheiro, formatDinheiroCompacto } from "./dinheiro";
import { valorDaMinhaParte } from "./gastosDoMes";
import { faturasDoIntervalo, limiteUsado, mesDaFatura, totalDaFatura, type DadosFatura } from "./fatura";
import { parcelasDaCompra } from "./parcelas";
import { calcularPrevisao } from "./previsao";
import { ocorrencias, saldoDaConta, type Livro } from "./saldo";

// As regras de dinheiro do app, com datas fixas: nada aqui depende do dia em
// que o teste roda nem do banco.

const gasto = (g: Partial<MeuGasto>): MeuGasto => ({
  id: "g",
  descricao: "Mercado",
  valor: 100,
  tipo: "debito",
  categoria: "pessoal",
  data: "2026-09-10",
  pago: true,
  num_parcelas: 1,
  parcela_atual: 1,
  ...g,
});

const conta: ContaBancaria = { id: "c1", nome: "Conta", saldo_inicial: 1000, saldo_atual: null, created_at: "2026-09-01" };
const livro = (l: Partial<Livro>): Livro => ({ receitas: [], meusGastos: [], emprestimos: [], pagamentosFatura: [], ...l });
const dia = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d, 12);
};

describe("parcelasDaCompra", () => {
  it("gasto à vista não puxa os outros de mesmo nome", () => {
    const todos = [
      gasto({ id: "a", data: "2026-08-03" }),
      gasto({ id: "b", data: "2026-09-10" }),
      gasto({ id: "c", data: "2026-09-10" }),
    ];
    expect(parcelasDaCompra(todos[1], todos).map((g) => g.id)).toEqual(["b"]);
  });

  it("junta só as parcelas da mesma compra", () => {
    const compra = (prefixo: string, inicio: number) =>
      [1, 2, 3].map((n) =>
        gasto({
          id: `${prefixo}${n}`,
          descricao: `Tênis (${n}/3)`,
          tipo: "credito",
          data: `2026-${String(inicio + n - 1).padStart(2, "0")}-05`,
          num_parcelas: 3,
          parcela_atual: n,
        })
      );
    const todos = [...compra("x", 3), ...compra("y", 7)];
    expect(parcelasDaCompra(todos[4], todos).map((g) => g.id)).toEqual(["y1", "y2", "y3"]);
  });

  it("compra antiga: acha as parcelas que faltavam, sem a primeira", () => {
    const todos = [4, 5, 6].map((n) =>
      gasto({ id: `p${n}`, descricao: `Sofá (${n}/6)`, tipo: "credito", data: `2026-${String(6 + n).padStart(2, "0")}-01`, num_parcelas: 6, parcela_atual: n })
    );
    expect(parcelasDaCompra(todos[0], todos).map((g) => g.parcela_atual)).toEqual([4, 5, 6]);
  });
});

describe("formatDinheiro", () => {
  it("separa o símbolo do número com espaço que não quebra", () => {
    expect(formatDinheiro(4507.6)).toBe("R$\u00A04.507,60");
    expect(formatDinheiro(-389.9)).toBe(`${MENOS}R$\u00A0389,90`);
    expect(formatDinheiro(1050, { positivo: true })).toBe("+R$\u00A01.050,00");
    expect(formatDinheiroCompacto(1500)).toBe("R$\u00A01,5k");
  });
});

describe("valorDaMinhaParte", () => {
  it("parte zero é zero, não o valor cheio", () => {
    expect(valorDaMinhaParte(gasto({ categoria: "dividido", minha_parte: 0 }))).toBe(0);
    expect(valorDaMinhaParte(gasto({ categoria: "dividido", minha_parte: 40 }))).toBe(40);
    expect(valorDaMinhaParte(gasto({ categoria: "dividido" }))).toBe(100);
  });
});

describe("saldoDaConta", () => {
  it("o dia 31 vira o último dia em mês curto", () => {
    expect(ocorrencias("2026-01-31", 31, "2026-03-31")).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("soma o histórico desde a criação da conta", () => {
    const l = livro({
      meusGastos: [
        gasto({ id: "antes", data: "2026-08-20", conta_id: "c1" }),
        gasto({ id: "debito", data: "2026-09-10", conta_id: "c1" }),
        gasto({ id: "futuro", data: "2026-10-20", conta_id: "c1" }),
        gasto({ id: "fixo", categoria: "fixo", valor: 200, data: "2026-09-01", dia_vencimento: 5, ativo: true, conta_id: "c1" }),
        gasto({ id: "credito", tipo: "credito", data: "2026-09-10" }),
      ],
    });
    // 1000 − 100 (débito) − 2 × 200 (fixo em 05/09 e 05/10)
    expect(saldoDaConta(conta, l, dia("2026-10-06"))).toBe(500);
  });

  it("empréstimo que repete sai da conta todo mês", () => {
    const emprestimo = { id: "e", descricao: "Mesada", pessoa: "Ana", valor_total: 50, num_parcelas: 1, data_inicio: "2026-09-15", tipo: "debito", categoria: "Outros", conta_id: "c1" } as Gasto;
    expect(saldoDaConta(conta, livro({ emprestimos: [emprestimo] }), dia("2026-10-20"))).toBe(950);
    expect(saldoDaConta(conta, livro({ emprestimos: [{ ...emprestimo, recorrente: true }] }), dia("2026-10-20"))).toBe(900);
  });

  it("receita fixa só entra depois de confirmada, no valor que caiu", () => {
    const salario: Receita = { id: "r", conta_id: "c1", descricao: "Salário", valor: 3000, categoria: "Salário", tipo: "fixo", dia_recebimento: 5, created_at: "2026-09-01" };
    const semResposta = livro({ receitas: [salario], confirmacoes: [], confirmacaoDesde: "2026-09-01" });
    expect(saldoDaConta(conta, semResposta, dia("2026-09-10"))).toBe(1000);
    const confirmada = livro({
      receitas: [salario],
      confirmacaoDesde: "2026-09-01",
      confirmacoes: [{ receita_id: "r", mes: "2026-09", status: "recebida", data_recebida: "2026-09-04", valor: 2700 }],
    });
    expect(saldoDaConta(conta, confirmada, dia("2026-09-10"))).toBe(3700);
  });
});

describe("fatura", () => {
  const cartao: CartaoCredito = { id: "k", nome: "Cartão", dia_vencimento: 10, melhor_dia_compra: 3, limite: 5000, created_at: "2026-07-01" };
  const dados = (meusGastos: MeuGasto[]): DadosFatura => ({ meusGastos, transacoes: [], emprestimos: [], pagamentos: [] });
  const fixo = (g: Partial<MeuGasto>) =>
    gasto({ id: "f", descricao: "Streaming", categoria: "fixo", tipo: "credito", cartao_id: "k", data: "2026-07-01", dia_vencimento: 15, ativo: true, pago: false, ...g });

  it("compra depois do melhor dia cai na fatura seguinte", () => {
    expect(mesDaFatura("2026-09-02", cartao)).toBe("2026-09");
    expect(mesDaFatura("2026-09-05", cartao)).toBe("2026-10");
  });

  it("fixo desativado continua nas faturas que já cobrou", () => {
    const d = dados([fixo({ ativo: false, encerrado_em: "2026-09-20" })]);
    expect(totalDaFatura(cartao, "2026-09", d)).toBe(100);
    expect(totalDaFatura(cartao, "2026-10", d)).toBe(0);
  });

  it("fixo com `ativo` nulo conta como ativo", () => {
    const d = dados([fixo({ ativo: undefined })]);
    expect(totalDaFatura(cartao, "2026-09", d)).toBe(100);
  });

  it("desativar não devolve o limite das faturas pagas", () => {
    const pagamentos = ["2026-07", "2026-08", "2026-09"].map((mes) => ({ cartao_id: "k", mes, valor_pago: 100, created_at: `${mes}-10T12:00:00` }));
    const d = { ...dados([fixo({ ativo: false, encerrado_em: "2026-09-20" })]), pagamentos };
    expect(limiteUsado(cartao, d, "2026-10-06")).toBe(0);
    // Uma compra nova de 300 ocupa 300, não 0: nada "sobra" das faturas pagas.
    const comCompra = { ...d, meusGastos: [...d.meusGastos, gasto({ id: "n", tipo: "credito", cartao_id: "k", valor: 300, data: "2026-10-04", pago: false })] };
    expect(limiteUsado(cartao, comCompra, "2026-10-06")).toBe(300);
  });

  it("ao reativar, as faturas da pausa ficam de fora", () => {
    expect(faturasDoIntervalo(cartao, 15, "2026-07-20", "2026-10-06")).toEqual(["2026-08", "2026-09", "2026-10"]);
  });
});

describe("calcularPrevisao", () => {
  const salario: Receita = { id: "r", conta_id: "c1", descricao: "Salário", valor: 3000, categoria: "Salário", tipo: "fixo", dia_recebimento: 5, created_at: "2026-09-01" };
  const base = { contas: [conta], cartoes: [], transacoes: [], pagamentosFatura: [], pagamentosDoMes: [], cobrancas: [] };

  it("a entrada do mês passado sem resposta continua na previsão", () => {
    const p = calcularPrevisao({ ...base, livro: livro({ receitas: [salario], confirmacoes: [], confirmacaoDesde: "2026-09-01" }) }, dia("2026-10-06"));
    expect(p.saldoHoje).toBe(1000);
    expect(p.vaiEntrar).toBe(6000);
    expect(p.fimDoMes).toBe(7000);
  });

  it("empréstimo com zero parcelas não vira infinito", () => {
    const emprestimo = { id: "e", descricao: "Jantar - Ana", pessoa: "Ana", valor_total: 80, num_parcelas: 0, data_inicio: "2026-10-02", tipo: "credito", categoria: "Outros", recorrente: true } as Gasto;
    const p = calcularPrevisao({ ...base, livro: livro({ emprestimos: [emprestimo] }) }, dia("2026-10-06"));
    expect(p.vaoDevolver).toBe(80);
  });
});
