-- ═══════════════════════════════════════════════════════════════════════════
-- Pagamento recebido entra no saldo da conta
--
-- Quando alguém te paga a parte de um gasto do mês (A receber, Do mês), o app
-- pergunta em qual conta o dinheiro caiu. Esta coluna guarda a resposta, e o
-- saldo da conta passa a somar o pagamento.
--
-- O pagamento de cobrança em aberto (Em aberto) já guarda a conta dentro do
-- histórico da cobrança e não precisa de mudança no banco.
--
-- Sem esta coluna o app segue funcionando: o pagamento é registrado, só não
-- entra no saldo. Pode rodar de novo sem problema.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE pagamentos_parciais
  ADD COLUMN IF NOT EXISTS conta_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL;
