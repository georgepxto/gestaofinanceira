-- =====================================================
-- ADICIONAR COLUNA cartao_id NA TABELA meus_gastos
-- Execute no Supabase SQL Editor
-- =====================================================

ALTER TABLE meus_gastos ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE SET NULL;
