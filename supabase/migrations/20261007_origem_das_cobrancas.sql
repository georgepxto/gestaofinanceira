-- ═══════════════════════════════════════════════════════════════════════════
-- Origem das cobrancas e mes fechado
--
-- Ate aqui o app ligava uma cobranca de "A receber" ao gasto que a criou pelo
-- TEXTO da descricao ("Mercado - Ana"), e sabia que um mes estava fechado
-- porque existia uma cobranca chamada "Gastos pendentes - outubro de 2026".
-- Dois gastos de mesmo nome, ou uma descricao editada, e a ligacao se perdia.
--
--   gastos.origem_id              id do gasto (meus_gastos) que criou a cobranca;
--                                 na compra parcelada, o da primeira parcela.
--   saldos_devedores.mes_fechado  o mes fechado ("2026-10") da cobranca que
--                                 nasceu de um fechamento.
--
-- Depois de criar as colunas, preenche o que ja existe usando a regra antiga
-- (o nome), uma ultima vez. O que nao casar fica com a coluna vazia, e o app
-- ainda acha essas pelo nome.
--
-- RODE ANTES DE PUBLICAR O BUILD NOVO: ele grava nessas colunas.
-- Rode no SQL Editor do Supabase. Pode rodar de novo sem problema: so toca em
-- linha que ainda esta com a coluna vazia.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE gastos ADD COLUMN IF NOT EXISTS origem_id TEXT;
ALTER TABLE saldos_devedores ADD COLUMN IF NOT EXISTS mes_fechado TEXT;
CREATE INDEX IF NOT EXISTS gastos_origem_id_idx ON gastos (origem_id);

-- ─── 1. Meses fechados ─────────────────────────────────────────────────────
-- "Gastos pendentes - outubro de 2026" -> "2026-10"
UPDATE saldos_devedores s
   SET mes_fechado = m.ano || '-' || m.num
  FROM (
    SELECT id,
           substring(descricao from '([0-9]{4})$') AS ano,
           CASE lower(substring(descricao from '^Gastos pendentes - (.+) de [0-9]{4}$'))
             WHEN 'janeiro'   THEN '01'
             WHEN 'fevereiro' THEN '02'
             WHEN 'março'     THEN '03'
             WHEN 'abril'     THEN '04'
             WHEN 'maio'      THEN '05'
             WHEN 'junho'     THEN '06'
             WHEN 'julho'     THEN '07'
             WHEN 'agosto'    THEN '08'
             WHEN 'setembro'  THEN '09'
             WHEN 'outubro'   THEN '10'
             WHEN 'novembro'  THEN '11'
             WHEN 'dezembro'  THEN '12'
           END AS num
      FROM saldos_devedores
     WHERE descricao ~ '^Gastos pendentes - .+ de [0-9]{4}$'
  ) m
 WHERE s.id = m.id
   AND s.mes_fechado IS NULL
   AND m.num IS NOT NULL;

-- ─── 2. Cobrancas de gasto dividido ────────────────────────────────────────
-- A cobranca se chama "<descricao> - <pessoa>" (com " (N parcelas)" quando
-- parcelada) e comeca no dia da compra ou um mes depois (a fatura seguinte).
-- As datas sao comparadas como texto: no banco elas podem ser DATE ou TEXT.
-- Entre as parcelas que casam, fica a de menor numero.
UPDATE gastos g
   SET origem_id = x.origem
  FROM (
    SELECT DISTINCT ON (c.id) c.id AS cobranca, m.id::text AS origem
      FROM gastos c
      JOIN meus_gastos m
        ON m.user_id = c.user_id
       AND m.categoria = 'dividido'
       AND m.data::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
       AND (m.dividido_com = c.pessoa OR m.dividido_com LIKE '%"' || c.pessoa || '"%')
       AND c.descricao =
             regexp_replace(m.descricao, '\s*\([0-9]+/[0-9]+\)$', '')
             || CASE WHEN coalesce(m.num_parcelas, 1) > 1
                     THEN ' (' || m.num_parcelas || ' parcelas)'
                     ELSE '' END
             || ' - ' || c.pessoa
       AND left(c.data_inicio::text, 10) IN (
             left(m.data::text, 10),
             to_char(left(m.data::text, 10)::date + interval '1 month', 'YYYY-MM-DD')
           )
     WHERE c.origem_id IS NULL
     ORDER BY c.id, coalesce(m.parcela_atual, 1), m.data::text
  ) x
 WHERE g.id = x.cobranca
   AND g.origem_id IS NULL;

-- ─── 3. Cobrancas de gasto fixo dividido ───────────────────────────────────
-- "<descricao do fixo> - <pessoa>", para as pessoas com quem o fixo e dividido.
-- Vem depois do passo 2, para nao pegar a cobranca de um gasto comum de mesmo
-- nome.
UPDATE gastos g
   SET origem_id = x.origem
  FROM (
    SELECT DISTINCT ON (c.id) c.id AS cobranca, m.id::text AS origem
      FROM gastos c
      JOIN meus_gastos m
        ON m.user_id = c.user_id
       AND m.categoria = 'fixo'
       AND (m.dividido_com = c.pessoa OR m.dividido_com LIKE '%"' || c.pessoa || '"%')
       AND c.descricao = m.descricao || ' - ' || c.pessoa
     WHERE c.origem_id IS NULL
     ORDER BY c.id, m.id::text
  ) x
 WHERE g.id = x.cobranca
   AND g.origem_id IS NULL;

-- ─── Conferencia ───────────────────────────────────────────────────────────
-- Quantas cobrancas ficaram ligadas, e quantos meses fechados foram marcados:
SELECT
  (SELECT count(*) FROM gastos WHERE origem_id IS NOT NULL)            AS cobrancas_ligadas,
  (SELECT count(*) FROM gastos WHERE origem_id IS NULL)                AS cobrancas_sem_origem,
  (SELECT count(*) FROM saldos_devedores WHERE mes_fechado IS NOT NULL) AS meses_fechados_marcados,
  (SELECT count(*) FROM saldos_devedores
    WHERE mes_fechado IS NULL AND descricao LIKE 'Gastos pendentes - %') AS fechamentos_nao_marcados;
