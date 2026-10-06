-- ═══════════════════════════════════════════════════════════════════════════
-- Origem das cobrancas: as parceladas que a 20261007 nao ligou
--
-- A 20261007 exige que a cobranca comece no MESMO dia do gasto (ou um mes
-- depois). Sobraram cobrancas de compra parcelada no credito em que o nome e a
-- pessoa batem, mas a data fica 1 ou 2 dias depois da parcela: ate 30/09/2026
-- o app lia a data em UTC ao criar as parcelas e gravava a vespera, enquanto a
-- cobranca saia com o dia certo.
--
-- Esta migracao liga so esse caso: compra parcelada, nome exato, pessoa certa
-- e a cobranca 1 ou 2 dias depois da parcela (ou da parcela mais um mes).
-- Fica a parcela de menor numero, que e a que o app usa como origem. Se duas
-- cobrancas da mesma pessoa disputarem o mesmo gasto, liga so a mais proxima:
-- um gasto nunca fica com duas cobrancas da mesma pessoa.
--
-- Rode no SQL Editor do Supabase, depois da 20261007. Pode rodar de novo sem
-- problema: so toca em cobranca que ainda esta sem origem.
-- ═══════════════════════════════════════════════════════════════════════════

WITH candidatas AS (
  SELECT DISTINCT ON (c.id)
         c.id          AS cobranca,
         c.pessoa      AS pessoa,
         m.id::text    AS origem,
         LEAST(
           abs(left(c.data_inicio::text, 10)::date - left(m.data::text, 10)::date),
           abs(left(c.data_inicio::text, 10)::date
               - (left(m.data::text, 10)::date + interval '1 month')::date)
         )             AS distancia
    FROM gastos c
    JOIN meus_gastos m
      ON m.user_id = c.user_id
     AND m.categoria = 'dividido'
     AND coalesce(m.num_parcelas, 1) > 1
     AND (m.dividido_com = c.pessoa OR m.dividido_com LIKE '%"' || c.pessoa || '"%')
     AND c.descricao =
           regexp_replace(m.descricao, '\s*\([0-9]+/[0-9]+\)$', '')
           || ' (' || m.num_parcelas || ' parcelas)'
           || ' - ' || c.pessoa
     AND (
           left(c.data_inicio::text, 10)::date - left(m.data::text, 10)::date BETWEEN 1 AND 2
        OR left(c.data_inicio::text, 10)::date
           - (left(m.data::text, 10)::date + interval '1 month')::date BETWEEN 1 AND 2
         )
   WHERE c.origem_id IS NULL
   ORDER BY c.id, coalesce(m.parcela_atual, 1), m.data::text
),
sem_disputa AS (
  SELECT cobranca, origem,
         row_number() OVER (PARTITION BY origem, pessoa ORDER BY distancia, cobranca::text) AS ordem
    FROM candidatas k
   WHERE NOT EXISTS (
           SELECT 1 FROM gastos ja
            WHERE ja.origem_id = k.origem AND ja.pessoa = k.pessoa
         )
)
UPDATE gastos g
   SET origem_id = s.origem
  FROM sem_disputa s
 WHERE g.id = s.cobranca
   AND s.ordem = 1
   AND g.origem_id IS NULL;

-- ─── Conferencia ───────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM gastos WHERE origem_id IS NOT NULL) AS cobrancas_ligadas,
  (SELECT count(*) FROM gastos
    WHERE origem_id IS NULL AND descricao LIKE '% - ' || pessoa) AS parecem_espelho_sem_origem;
