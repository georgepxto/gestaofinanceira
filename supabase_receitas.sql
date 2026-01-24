-- =====================================================
-- MIGRAÇÃO: Criar tabela de receitas
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Criar tabela receitas
CREATE TABLE IF NOT EXISTS receitas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outras Receitas',
  tipo TEXT NOT NULL DEFAULT 'fixo', -- 'fixo', 'recorrente', 'avulso'
  dia_recebimento INTEGER DEFAULT 1,
  num_meses INTEGER,
  conta_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;

-- 3. Criar política de RLS
CREATE POLICY "Users can manage their own receipts" ON receitas
  FOR ALL USING (auth.uid() = user_id);

-- 4. Adicionar saldo_atual à tabela contas_bancarias (se não existir)
ALTER TABLE contas_bancarias ADD COLUMN IF NOT EXISTS saldo_atual DECIMAL(12,2);
UPDATE contas_bancarias SET saldo_atual = saldo_inicial WHERE saldo_atual IS NULL;
