-- =====================================================
-- MIGRAÇÃO COMPLETA - Execute no Supabase SQL Editor
-- =====================================================

-- 1. Adicionar coluna cartao_id na tabela meus_gastos
ALTER TABLE meus_gastos ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE SET NULL;

-- 2. Adicionar coluna categoria_gasto na tabela meus_gastos
ALTER TABLE meus_gastos ADD COLUMN IF NOT EXISTS categoria_gasto TEXT;
