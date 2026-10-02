-- ═══════════════════════════════════════════════════════════════════════════
-- Motivo da diferença numa entrada confirmada ("Caiu outro valor")
--
-- O salário veio R$ 300 menor por causa do vale? Meses depois ninguém lembra.
-- `motivo` guarda a explicação curta que a pessoa escreveu ao confirmar um
-- valor diferente do previsto. Sem esta coluna, o app confirma do mesmo jeito,
-- só não guarda o motivo.
--
-- Rode no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE receitas_confirmacoes ADD COLUMN IF NOT EXISTS motivo TEXT;
