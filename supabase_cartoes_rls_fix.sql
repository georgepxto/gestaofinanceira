-- =====================================================
-- EXECUTAR NO SUPABASE SQL EDITOR
-- Criar políticas RLS para cartoes_credito
-- =====================================================

-- Se a tabela já existe, só criar as políticas:

-- Primeiro, ativar RLS se ainda não foi
ALTER TABLE cartoes_credito ENABLE ROW LEVEL SECURITY;

-- Apagar políticas existentes para recriar
DROP POLICY IF EXISTS "Usuários podem ver seus próprios cartões" ON cartoes_credito;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios cartões" ON cartoes_credito;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios cartões" ON cartoes_credito;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios cartões" ON cartoes_credito;

-- Recriar políticas
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
