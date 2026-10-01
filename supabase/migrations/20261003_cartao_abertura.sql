-- ═══════════════════════════════════════════════════════════════════════════
-- Cartão conferido com o banco
--
-- A antiga "dívida inicial" era um número só e não dizia se era a fatura ou o
-- limite usado. Agora o cartão guarda o retrato do dia em que a pessoa o
-- conferiu com o app do banco:
--   { "em": "2026-10-01", "mes": "2026-10", "fatura": 3550.74, "usado": 11313.07 }
-- em     dia da conferência
-- mes    a próxima fatura a pagar naquele dia
-- fatura o que faltava pagar dela
-- usado  o limite usado (a fatura + as parcelas das próximas)
--
-- Compras lançadas com data até esse dia já estão dentro do retrato e não somam
-- de novo. Sem esta coluna o app guarda o retrato no perfil do usuário e segue
-- funcionando. Pode rodar de novo sem problema.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE cartoes_credito
  ADD COLUMN IF NOT EXISTS abertura JSONB;
