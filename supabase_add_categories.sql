-- Migração: Adicionar categoria aos gastos
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna de categoria
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Outras Despesas';

-- 2. Atualizar gastos existentes (sem categoria) para categoria padrão
UPDATE gastos 
SET categoria = 'Outras Despesas' 
WHERE categoria IS NULL OR categoria = '';
