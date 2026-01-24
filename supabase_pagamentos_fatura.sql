-- =====================================================
-- MIGRAÇÃO: Criar tabela de pagamentos de fatura
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Criar tabela pagamentos_fatura
CREATE TABLE IF NOT EXISTS pagamentos_fatura (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID NOT NULL REFERENCES cartoes_credito(id) ON DELETE CASCADE,
  mes TEXT NOT NULL, -- formato: "yyyy-MM" ex: "2026-01"
  valor_pago DECIMAL(12,2) NOT NULL,
  conta_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índice único para evitar pagamentos duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_pagamento_fatura_unico ON pagamentos_fatura(cartao_id, mes);

-- 3. Habilitar RLS
ALTER TABLE pagamentos_fatura ENABLE ROW LEVEL SECURITY;

-- 4. Criar política de RLS
CREATE POLICY "Users can manage their own payment records" ON pagamentos_fatura
  FOR ALL USING (auth.uid() = user_id);

-- 5. Adicionar saldo_atual na tabela contas_bancarias (se não existir)
ALTER TABLE contas_bancarias ADD COLUMN IF NOT EXISTS saldo_atual DECIMAL(12,2);
UPDATE contas_bancarias SET saldo_atual = saldo_inicial WHERE saldo_atual IS NULL;
