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

BEGIN;

CREATE TEMP TABLE cat_map (antiga text PRIMARY KEY, nova text NOT NULL) ON COMMIT DROP;
INSERT INTO cat_map (antiga, nova) VALUES
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
  ('Outras Despesas', 'Outros');
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
  FROM cat_map m
 WHERE g.categoria = m.antiga;

-- ─── 2. Gastos pessoais ────────────────────────────────────────────────────
UPDATE meus_gastos g
   SET categoria_gasto = m.nova
  FROM cat_map m
 WHERE g.categoria_gasto = m.antiga;

-- ─── 3. Metas ──────────────────────────────────────────────────────────────
-- Fundir categorias pode colidir: quem tinha meta de Delivery E de Alimentação
-- termina com duas metas de Alimentação. Consolidamos antes de renomear —
-- sobrevive uma linha por (usuário, categoria nova) com a SOMA dos limites,
-- que preserva o orçamento total que a pessoa tinha definido.

CREATE TEMP TABLE meta_destino ON COMMIT DROP AS
SELECT mg.id,
       mg.user_id,
       COALESCE(cm.nova, mg.categoria) AS nova,
       mg.limite
  FROM metas_gasto mg
  LEFT JOIN cat_map cm ON cm.antiga = mg.categoria;

CREATE TEMP TABLE meta_mantida ON COMMIT DROP AS
SELECT user_id,
       nova,
       (array_agg(id ORDER BY id))[1] AS id_mantido,
       sum(limite)                    AS limite_total
  FROM meta_destino
 GROUP BY user_id, nova;

DELETE FROM metas_gasto
 WHERE id IN (
   SELECT d.id
     FROM meta_destino d
     JOIN meta_mantida k
       ON k.user_id IS NOT DISTINCT FROM d.user_id
      AND k.nova = d.nova
    WHERE d.id <> k.id_mantido
 );

UPDATE metas_gasto mg
   SET categoria = k.nova,
       limite    = k.limite_total
  FROM meta_mantida k
 WHERE mg.id = k.id_mantido
   AND (mg.categoria IS DISTINCT FROM k.nova OR mg.limite IS DISTINCT FROM k.limite_total);

COMMIT;

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
