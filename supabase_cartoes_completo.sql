-- =====================================================
-- MIGRAÇÃO COMPLETA - Execute tudo no Supabase SQL Editor
-- =====================================================

-- 1. Atualizar tabela cartoes_credito com novos campos
ALTER TABLE cartoes_credito ADD COLUMN IF NOT EXISTS melhor_dia_compra INTEGER;
ALTER TABLE cartoes_credito ADD COLUMN IF NOT EXISTS divida_inicial DECIMAL(15,2) DEFAULT 0;
ALTER TABLE cartoes_credito ADD COLUMN IF NOT EXISTS cor TEXT DEFAULT '#3B82F6';

-- Garantir que limite não é nulo
UPDATE cartoes_credito SET limite = 0 WHERE limite IS NULL;


-- 2. Criar tabela transacoes_cartao
CREATE TABLE IF NOT EXISTS transacoes_cartao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outras Despesas',
  data TEXT NOT NULL,
  num_parcelas INTEGER DEFAULT 1,
  parcela_atual INTEGER DEFAULT 1,
  pago BOOLEAN DEFAULT FALSE,
  recorrente BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS para transacoes_cartao
ALTER TABLE transacoes_cartao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias transações"
  ON transacoes_cartao FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias transações"
  ON transacoes_cartao FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias transações"
  ON transacoes_cartao FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias transações"
  ON transacoes_cartao FOR DELETE USING (auth.uid() = user_id);


-- 4. RLS para cartoes_credito (recriar se necessário)
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
