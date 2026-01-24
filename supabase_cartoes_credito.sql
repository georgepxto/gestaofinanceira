-- =====================================================
-- Migração: Criar tabela cartoes_credito
-- Execute no Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS cartoes_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  conta_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  dia_vencimento INTEGER NOT NULL DEFAULT 10,
  limite DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE cartoes_credito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios cartões"
  ON cartoes_credito FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios cartões"
  ON cartoes_credito FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios cartões"
  ON cartoes_credito FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios cartões"
  ON cartoes_credito FOR DELETE
  USING (auth.uid() = user_id);
