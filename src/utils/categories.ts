/**
 * Categorias de gasto — lista curta e mutuamente exclusiva.
 *
 * A lista antiga tinha 18 entradas com sobreposição: Alimentação / Delivery /
 * Restaurante / Supermercado disputavam o mesmo lançamento, Aluguel / Moradia /
 * Contas idem, e "Compras Online" descrevia canal de compra, não natureza de
 * gasto. Com a escolha virando aleatória a cada lançamento, o gráfico por
 * categoria — que é o produto — perdia sentido.
 *
 * Cada gasto agora cai em uma categoria só. Onde comprou e como pagou já são
 * registrados em outros campos.
 */

export const CATEGORIAS = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Lazer",
  "Assinaturas",
  "Educação",
  "Outros",
];

// Categoria padrão
export const CATEGORIA_PADRAO = "Outros";

/**
 * De categoria antiga para a nova. Espelha exatamente o mapeamento aplicado em
 * `supabase/migrations/20260726_categorias_consolidacao.sql` — se um dos dois
 * mudar, o outro muda junto.
 *
 * "Empréstimo" vira "Outros" porque o app já trata empréstimo como entidade
 * própria (Dívidas / Saldos Devedores); como categoria de gasto era redundante.
 */
export const CATEGORIAS_LEGADAS: Record<string, string> = {
  "Aluguel": "Moradia",
  "Contas": "Moradia",
  "Delivery": "Alimentação",
  "Restaurante": "Alimentação",
  "Supermercado": "Alimentação",
  "Combustível": "Transporte",
  "Farmácia": "Saúde",
  "Compras Online": "Outros",
  "Roupas": "Outros",
  "Empréstimo": "Outros",
  "Outras Despesas": "Outros",
};

/**
 * Rede de segurança de leitura: registro gravado antes da migração (ou por um
 * cliente desatualizado) continua exibindo a categoria certa em vez de cair num
 * select vazio. Valor desconhecido é devolvido intacto — nada some silenciosamente.
 */
export function normalizarCategoria(categoria?: string | null): string {
  if (!categoria) return "";
  return CATEGORIAS_LEGADAS[categoria] ?? categoria;
}

/**
 * Único jeito de ler a categoria de gasto de uma linha.
 *
 * `meus_gastos` tem duas colunas de nome parecido: `categoria_gasto` (a
 * categoria — Alimentação, Moradia…) e `categoria` (o tipo do lançamento —
 * ds-ok: o idioma abaixo aparece citado, não usado — é o bug que esta função corrige.
 * "pessoal" / "dividido" / "fixo" / "divida"). Ler `categoria_gasto || categoria`
 * fazia o tipo vazar para o gráfico como se fosse categoria: uma fatia chamada
 * "dividido". Aqui a linha de `meus_gastos` nunca cai no `categoria` — quem tem
 * a chave `categoria_gasto` responde só por ela. A linha de `gastos`, que não
 * tem essa chave, segue lendo `categoria`, que ali é a categoria mesmo.
 *
 * Aplica `normalizarCategoria` de graça — registro gravado antes da migração
 * agrega junto com o resto em vez de virar fatia separada.
 */
export function categoriaDeGasto(row: {
  categoria_gasto?: string | null;
  categoria?: string | null;
}): string {
  const bruta = "categoria_gasto" in row ? row.categoria_gasto : row.categoria;
  return normalizarCategoria(bruta) || CATEGORIA_PADRAO;
}
