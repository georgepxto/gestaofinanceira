import type { MeuGasto } from "../types";

// As parcelas de UMA compra. Cada parcela é uma linha de `meus_gastos`, sem
// chave ligando as irmãs: o que as une é o nome ("Tênis (2/6)"), o total de
// parcelas e a data — a parcela 3 cai dois meses depois da 1.
//
// Antes bastava o nome e o total de parcelas baterem. Como todo gasto à vista
// tem 1 parcela, excluir um "Mercado" apagava todos os "Mercado" de todos os
// meses, e editar um mexia no primeiro da lista.

/** "Tênis (2/6)" → "Tênis". */
export const descricaoSemParcela = (descricao: string) => descricao.replace(/\s*\(\d+\/\d+\)$/, "");

/** Meses desde o ano zero, para comparar distância entre datas. */
const indiceDoMes = (dataIso: string) => {
  const [ano, mes] = dataIso.split("-").map(Number);
  return ano * 12 + mes;
};

/**
 * O gasto e as outras parcelas da mesma compra, uma por número de parcela, em
 * ordem. Gasto à vista e gasto fixo não têm irmãs: devolve só ele.
 */
export function parcelasDaCompra(gasto: MeuGasto, todos: MeuGasto[]): MeuGasto[] {
  const atual = todos.find((g) => g.id === gasto.id) || gasto;
  const total = atual.num_parcelas || 1;
  if (total <= 1 || atual.categoria === "fixo") return [atual];

  const nome = descricaoSemParcela(atual.descricao);
  // Mês em que a parcela "zero" cairia: igual para todas as irmãs.
  const ancora = indiceDoMes(atual.data) - (atual.parcela_atual || 1);
  const porNumero = new Map<number, MeuGasto>();
  for (const g of todos) {
    if (g.id !== atual.id) {
      if ((g.num_parcelas || 1) !== total || g.categoria === "fixo" || g.tipo !== atual.tipo) continue;
      if (descricaoSemParcela(g.descricao) !== nome) continue;
      if (indiceDoMes(g.data) - (g.parcela_atual || 1) !== ancora) continue;
    }
    const numero = g.parcela_atual || 1;
    // Duas compras iguais no mesmo mês: fica a primeira de cada número, e a
    // parcela aberta sempre é ela mesma.
    if (g.id === atual.id || !porNumero.has(numero)) porNumero.set(numero, g);
  }
  return [...porNumero.values()].sort((a, b) => (a.parcela_atual || 1) - (b.parcela_atual || 1));
}
