-- =====================================================
-- MIGRAÇÃO: Adicionar cartao_id às tabelas de gastos
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Adicionar cartao_id na tabela gastos (gastos compartilhados)
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE SET NULL;

-- 2. Adicionar cartao_id na tabela meus_gastos (já feito anteriormente)
ALTER TABLE meus_gastos ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE SET NULL;

-- 3. Adicionar categoria_gasto na tabela meus_gastos (já feito anteriormente)
ALTER TABLE meus_gastos ADD COLUMN IF NOT EXISTS categoria_gasto TEXT;
