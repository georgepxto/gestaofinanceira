/**
 * Categorias de gasto — o PADRÃO. Quem quiser outra lista personaliza em
 * Configurações; `useCategorias` é quem decide qual das duas está valendo.
 *
 * A lista antiga tinha 18 entradas com sobreposição: Alimentação / Delivery /
 * Restaurante / Supermercado disputavam o mesmo lançamento, Aluguel / Moradia /
 * Contas idem, e "Compras Online" descrevia canal de compra, não natureza de
 * gasto. Com a escolha virando aleatória a cada lançamento, o gráfico por
 * categoria — que é o produto — perdia sentido.
 *
 * Por isso o padrão é curto e mutuamente exclusivo: cada gasto cai em uma
 * categoria só. Quem sente falta de granularidade agora acrescenta a categoria
 * que quiser — a escolha passa a ser dela, não um acidente da lista.
 */

export const CATEGORIAS_GASTO_PADRAO = [
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

/** Limite de caracteres do nome — cabe no select sem estourar o layout. */
export const CATEGORIA_NOME_MAX = 28;

/**
 * Normaliza o que a pessoa digitou: sem espaço nas pontas, sem espaço duplo no
 * meio, cortado no limite. O nome é gravado exatamente assim nos lançamentos.
 */
export function sanitizarNomeCategoria(nome: string): string {
  return nome.replace(/\s+/g, " ").trim().slice(0, CATEGORIA_NOME_MAX);
}

/**
 * Chave de comparação. "Mercado" e "mercado" são a mesma categoria para quem lê
 * o gráfico — o índice único do banco usa a mesma regra.
 */
export function chaveCategoria(nome: string): string {
  return sanitizarNomeCategoria(nome).toLocaleLowerCase("pt-BR");
}

/**
 * Junta a lista corrente com um valor já gravado que saiu dela (categoria
 * excluída, registro antigo, cliente desatualizado). Sem isto o select abriria
 * vazio no lançamento e a categoria dele viraria outra no primeiro salvamento.
 */
export function comCategoriaAtual(
  categorias: string[],
  atual?: string | null
): string[] {
  const nome = (atual || "").trim();
  if (!nome) return categorias;
  const jaTem = categorias.some((c) => chaveCategoria(c) === chaveCategoria(nome));
  return jaTem ? categorias : [...categorias, nome];
}

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
