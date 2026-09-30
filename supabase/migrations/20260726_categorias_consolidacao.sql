-- ═══════════════════════════════════════════════════════════════════════════
-- Consolidação das categorias de gasto: 18 → 8 mutuamente exclusivas
--
-- RODE ESTA MIGRAÇÃO ANTES DE PUBLICAR O BUILD NOVO.
-- O select do formulário passa a oferecer só as 8 categorias novas. Um usuário
-- abrindo o app antes da migração veria os gastos dele com categoria que não
-- existe mais no select — pior que a inconsistência que estamos resolvendo.
--
-- O mapeamento aqui é o mesmo de `src/utils/categories.ts` (CATEGORIAS_LEGADAS).
-- Se um mudar, o outro muda junto.
--
-- Tabelas afetadas:
--   gastos.categoria             (gastos compartilhados / parcelados)
--   meus_gastos.categoria_gasto  (gastos pessoais)
--   metas_gasto.categoria        (limite por categoria)
--
-- É idempotente: rodar duas vezes não muda nada na segunda.
-- ═══════════════════════════════════════════════════════════════════════════

-- Sem tabela temporária nem BEGIN/COMMIT: o SQL Editor do Supabase não
-- segura a transação entre comandos, e uma tabela ON COMMIT DROP sumia antes
-- de ser usada ("relation cat_map does not exist"). Cada comando traz o mapa
-- inteiro e é atômico sozinho.
--
-- Moradia, Alimentação, Transporte, Saúde, Lazer, Assinaturas e Educação já se
-- chamam do jeito certo — não aparecem no mapa de propósito.
--
-- 'Empréstimo' vira 'Outros' porque o app trata empréstimo como entidade própria
-- (Dívidas / Saldos Devedores); a parcela já é registrada lá. Como categoria de
-- gasto era duplicata.

-- ─── Auditoria antes ───────────────────────────────────────────────────────
-- Descomente para ver o que vai ser tocado, sem alterar nada:
-- SELECT categoria, count(*) FROM gastos GROUP BY 1 ORDER BY 2 DESC;
-- SELECT categoria_gasto, count(*) FROM meus_gastos GROUP BY 1 ORDER BY 2 DESC;
-- SELECT categoria, count(*) FROM metas_gasto GROUP BY 1 ORDER BY 2 DESC;

-- ─── 1. Gastos compartilhados ──────────────────────────────────────────────
UPDATE gastos g
   SET categoria = m.nova
  FROM
  (VALUES
    ('Aluguel',         'Moradia'),
    ('Contas',          'Moradia'),
    ('Delivery',        'Alimentação'),
    ('Restaurante',     'Alimentação'),
    ('Supermercado',    'Alimentação'),
    ('Combustível',     'Transporte'),
    ('Farmácia',        'Saúde'),
    ('Compras Online',  'Outros'),
    ('Roupas',          'Outros'),
    ('Empréstimo',      'Outros'),
    ('Outras Despesas', 'Outros')
  ) AS m(antiga, nova)
 WHERE g.categoria = m.antiga;

-- ─── 2. Gastos pessoais ────────────────────────────────────────────────────
UPDATE meus_gastos g
   SET categoria_gasto = m.nova
  FROM
  (VALUES
    ('Aluguel',         'Moradia'),
    ('Contas',          'Moradia'),
    ('Delivery',        'Alimentação'),
    ('Restaurante',     'Alimentação'),
    ('Supermercado',    'Alimentação'),
    ('Combustível',     'Transporte'),
    ('Farmácia',        'Saúde'),
    ('Compras Online',  'Outros'),
    ('Roupas',          'Outros'),
    ('Empréstimo',      'Outros'),
    ('Outras Despesas', 'Outros')
  ) AS m(antiga, nova)
 WHERE g.categoria_gasto = m.antiga;

-- ─── 3. Metas ──────────────────────────────────────────────────────────────
-- Fundir categorias pode colidir: quem tinha meta de Delivery E de Alimentação
-- termina com duas metas de Alimentação. Sobrevive uma linha por (usuário,
-- categoria nova) com a SOMA dos limites, que preserva o orçamento total.
-- Um comando só: o DELETE e o UPDATE enxergam a mesma foto da tabela.
WITH destino AS (
  SELECT mg.id, mg.user_id, COALESCE(m.nova, mg.categoria) AS nova, mg.limite
    FROM metas_gasto mg
    LEFT JOIN
    (VALUES
      ('Aluguel',         'Moradia'),
      ('Contas',          'Moradia'),
      ('Delivery',        'Alimentação'),
      ('Restaurante',     'Alimentação'),
      ('Supermercado',    'Alimentação'),
      ('Combustível',     'Transporte'),
      ('Farmácia',        'Saúde'),
      ('Compras Online',  'Outros'),
      ('Roupas',          'Outros'),
      ('Empréstimo',      'Outros'),
      ('Outras Despesas', 'Outros')
    ) AS m(antiga, nova)
      ON m.antiga = mg.categoria
),
mantida AS (
  SELECT user_id, nova,
         (array_agg(id ORDER BY id))[1] AS id_mantido,
         sum(limite)                    AS limite_total
    FROM destino
   GROUP BY user_id, nova
),
removidas AS (
  DELETE FROM metas_gasto
   WHERE id IN (
     SELECT d.id
       FROM destino d
       JOIN mantida k
         ON k.user_id IS NOT DISTINCT FROM d.user_id
        AND k.nova = d.nova
      WHERE d.id <> k.id_mantido
   )
  RETURNING id
)
UPDATE metas_gasto mg
   SET categoria = k.nova,
       limite    = k.limite_total
  FROM mantida k
 WHERE mg.id = k.id_mantido
   AND (mg.categoria IS DISTINCT FROM k.nova OR mg.limite IS DISTINCT FROM k.limite_total);

-- ─── Verificação depois ────────────────────────────────────────────────────
-- Cada consulta abaixo tem que voltar VAZIA. Se voltar linha, é uma categoria
-- que não estava nem na lista nova nem no mapa — decida o destino dela à mão,
-- não deixe cair em "Outros" por omissão.
--
-- WITH validas(c) AS (VALUES
--   ('Moradia'),('Alimentação'),('Transporte'),('Saúde'),
--   ('Lazer'),('Assinaturas'),('Educação'),('Outros'))
-- SELECT 'gastos' AS tabela, categoria, count(*)
--   FROM gastos
--  WHERE categoria IS NOT NULL AND categoria <> ''
--    AND categoria NOT IN (SELECT c FROM validas)
--  GROUP BY 1, 2
-- UNION ALL
-- SELECT 'meus_gastos', categoria_gasto, count(*)
--   FROM meus_gastos
--  WHERE categoria_gasto IS NOT NULL AND categoria_gasto <> ''
--    AND categoria_gasto NOT IN (SELECT c FROM validas)
--  GROUP BY 1, 2
-- UNION ALL
-- SELECT 'metas_gasto', categoria, count(*)
--   FROM metas_gasto
--  WHERE categoria NOT IN (SELECT c FROM validas)
--  GROUP BY 1, 2;
