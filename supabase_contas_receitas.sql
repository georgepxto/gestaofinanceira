-- Migração: Criar tabelas para Contas Bancárias e Receitas
-- Execute este SQL no Supabase SQL Editor


-- =====================================================
-- IMPORTANTE: Execute ANTES de testar a página de Contas
-- =====================================================


-- 1. Tabela de Contas Bancárias
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  banco TEXT,
  saldo_inicial DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Receitas/Ganhos
CREATE TABLE IF NOT EXISTS receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outras Receitas',
  tipo TEXT NOT NULL DEFAULT 'avulso', -- fixo, recorrente, avulso
  data TEXT NOT NULL,
  num_meses INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS (Row Level Security)
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;

-- Políticas para contas_bancarias
CREATE POLICY "Usuários podem ver suas próprias contas"
  ON contas_bancarias FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias contas"
  ON contas_bancarias FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias contas"
  ON contas_bancarias FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias contas"
  ON contas_bancarias FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para receitas
CREATE POLICY "Usuários podem ver suas próprias receitas"
  ON receitas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias receitas"
  ON receitas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias receitas"
  ON receitas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias receitas"
  ON receitas FOR DELETE
  USING (auth.uid() = user_id);


-- =====================================================
-- E também a coluna categoria na tabela gastos
-- =====================================================
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Outras Despesas';
UPDATE gastos SET categoria = 'Outras Despesas' WHERE categoria IS NULL;
