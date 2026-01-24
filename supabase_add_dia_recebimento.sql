-- =====================================================
-- Migração: Adicionar coluna dia_recebimento na tabela receitas
-- Execute se a tabela já existe
-- =====================================================

-- Mudar coluna data para dia_recebimento (número de 1-31)
ALTER TABLE receitas ADD COLUMN IF NOT EXISTS dia_recebimento INTEGER DEFAULT 1;

-- Se a tabela tinha coluna 'data', pode remover:
-- ALTER TABLE receitas DROP COLUMN IF EXISTS data;
