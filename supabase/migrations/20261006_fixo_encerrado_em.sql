-- ═══════════════════════════════════════════════════════════════════════════
-- Dia em que um gasto fixo foi desativado
--
-- Desativar um fixo no cartão tirava ele de todas as faturas, inclusive das
-- que já tinham sido pagas — e o limite usado ficava menor que o real.
-- `encerrado_em` guarda o dia em que o fixo parou: até ali ele continua nas
-- faturas que cobrou. Sem esta coluna, o app desativa do mesmo jeito, só não
-- guarda o dia (e o fixo desativado sai das faturas antigas, como antes).
--
-- Rode no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE meus_gastos ADD COLUMN IF NOT EXISTS encerrado_em DATE;
