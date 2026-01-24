-- =====================================================
-- MIGRAÇÃO COMPLETA - Execute tudo no Supabase SQL Editor
-- =====================================================

-- 1. POLÍTICAS RLS PARA CARTÕES (se deu erro na criação)
ALTER TABLE cartoes_credito ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus próprios cartões" ON cartoes_credito;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios cartões" ON cartoes_credito;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios cartões" ON cartoes_credito;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios cartões" ON cartoes_credito;

CREATE POLICY "Usuários podem ver seus próprios cartões"
  ON cartoes_credito FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios cartões"
  ON cartoes_credito FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios cartões"
  ON cartoes_credito FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios cartões"
  ON cartoes_credito FOR DELETE USING (auth.uid() = user_id);


-- 2. ADICIONAR COLUNA cartao_id NA TABELA meus_gastos
ALTER TABLE meus_gastos ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE SET NULL;
