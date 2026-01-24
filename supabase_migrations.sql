-- =====================================================
-- MIGRAÇÃO: Adicionar colunas para funcionalidades de pagamento
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Adicionar saldo_atual na tabela contas_bancarias
ALTER TABLE contas_bancarias ADD COLUMN IF NOT EXISTS saldo_atual DECIMAL(12,2);

-- Inicializar saldo_atual com saldo_inicial para contas existentes
UPDATE contas_bancarias SET saldo_atual = saldo_inicial WHERE saldo_atual IS NULL;

-- 2. Adicionar cartao_id na tabela gastos (gastos compartilhados)
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE SET NULL;

-- 3. Adicionar cartao_id na tabela meus_gastos
ALTER TABLE meus_gastos ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE SET NULL;

-- 4. Adicionar categoria_gasto na tabela meus_gastos
ALTER TABLE meus_gastos ADD COLUMN IF NOT EXISTS categoria_gasto TEXT;
