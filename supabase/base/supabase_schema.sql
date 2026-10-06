-- =====================================================
-- HEDGE — Schema Completo do Supabase
-- Execute no Supabase SQL Editor (apenas uma vez)
-- Criado em: 25/02/2026
-- =====================================================
-- Este arquivo contém TODAS as tabelas, colunas, RLS
-- policies e índices do projeto, consolidados.
-- Use "IF NOT EXISTS" / "IF EXISTS" para segurança.
-- =====================================================


-- =====================================================
-- 1. TABELA: gastos (gastos compartilhados)
-- =====================================================
CREATE TABLE IF NOT EXISTS gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  pessoa TEXT NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  num_parcelas INTEGER DEFAULT 1,
  data_inicio TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'debito',       -- 'credito' | 'debito'
  categoria TEXT DEFAULT 'Outras Despesas',
  recorrente BOOLEAN DEFAULT FALSE,
  cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE SET NULL,
  conta_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own gastos" ON gastos;
CREATE POLICY "Users manage own gastos" ON gastos
  FOR ALL USING (auth.uid() = user_id);


-- =====================================================
-- 2. TABELA: pessoas
-- =====================================================
CREATE TABLE IF NOT EXISTS pessoas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own pessoas" ON pessoas;
CREATE POLICY "Users manage own pessoas" ON pessoas
  FOR ALL USING (auth.uid() = user_id);


-- =====================================================
-- 3. TABELA: saldos_devedores
-- =====================================================
CREATE TABLE IF NOT EXISTS saldos_devedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pessoa TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor_original DECIMAL(15,2) NOT NULL,
  valor_atual DECIMAL(15,2) NOT NULL,
  data_criacao TEXT NOT NULL,
  historico JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE saldos_devedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own saldos" ON saldos_devedores;
CREATE POLICY "Users manage own saldos" ON saldos_devedores
  FOR ALL USING (auth.uid() = user_id);


-- =====================================================
-- 4. TABELA: meus_gastos (gastos pessoais)
-- =====================================================
CREATE TABLE IF NOT EXISTS meus_gastos (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'debito',         -- 'credito' | 'debito'
  categoria TEXT NOT NULL DEFAULT 'pessoal',   -- 'pessoal' | 'dividido' | 'fixo'
  categoria_gasto TEXT,                        -- ex: 'Alimentação', 'Transporte'
  data TEXT NOT NULL,
  pago BOOLEAN DEFAULT FALSE,
  data_pagamento TEXT,
  dividido_com TEXT,
  minha_parte DECIMAL(15,2),
  dia_vencimento INTEGER,
  ativo BOOLEAN DEFAULT TRUE,
  num_parcelas INTEGER DEFAULT 1,
  parcela_atual INTEGER DEFAULT 1,
  cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE SET NULL,
  conta_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meus_gastos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own meus_gastos" ON meus_gastos;
CREATE POLICY "Users manage own meus_gastos" ON meus_gastos
  FOR ALL USING (auth.uid() = user_id);


-- =====================================================
-- 5. TABELA: observacoes_mes
-- =====================================================
CREATE TABLE IF NOT EXISTS observacoes_mes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pessoa TEXT NOT NULL,
  mes TEXT NOT NULL,
  observacao TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pessoa, mes)
);

ALTER TABLE observacoes_mes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own observacoes" ON observacoes_mes;
CREATE POLICY "Users manage own observacoes" ON observacoes_mes
  FOR ALL USING (auth.uid() = user_id);


-- =====================================================
-- 6. TABELA: pagamentos_parciais
-- =====================================================
CREATE TABLE IF NOT EXISTS pagamentos_parciais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pessoa TEXT NOT NULL,
  mes TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data_pagamento TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pagamentos_parciais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own pagamentos_parciais" ON pagamentos_parciais;
CREATE POLICY "Users manage own pagamentos_parciais" ON pagamentos_parciais
  FOR ALL USING (auth.uid() = user_id);


-- =====================================================
-- 7. TABELA: contas_bancarias
-- =====================================================
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  banco TEXT,
  saldo_inicial DECIMAL(15,2) DEFAULT 0,
  saldo_atual DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inicializar saldo_atual com saldo_inicial para contas existentes
UPDATE contas_bancarias SET saldo_atual = saldo_inicial WHERE saldo_atual IS NULL;

ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver suas próprias contas" ON contas_bancarias;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias contas" ON contas_bancarias;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias contas" ON contas_bancarias;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias contas" ON contas_bancarias;

CREATE POLICY "Usuários podem ver suas próprias contas"
  ON contas_bancarias FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir suas próprias contas"
  ON contas_bancarias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas próprias contas"
  ON contas_bancarias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar suas próprias contas"
  ON contas_bancarias FOR DELETE USING (auth.uid() = user_id);


-- =====================================================
-- 8. TABELA: receitas
-- =====================================================
CREATE TABLE IF NOT EXISTS receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outras Receitas',
  tipo TEXT NOT NULL DEFAULT 'fixo',           -- 'fixo' | 'recorrente' | 'avulso'
  dia_recebimento INTEGER DEFAULT 1,
  num_meses INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver suas próprias receitas" ON receitas;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias receitas" ON receitas;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias receitas" ON receitas;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias receitas" ON receitas;
DROP POLICY IF EXISTS "Users can manage their own receipts" ON receitas;

CREATE POLICY "Users manage own receitas" ON receitas
  FOR ALL USING (auth.uid() = user_id);


-- =====================================================
-- 9. TABELA: cartoes_credito
-- =====================================================
CREATE TABLE IF NOT EXISTS cartoes_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  conta_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  dia_vencimento INTEGER NOT NULL DEFAULT 10,
  melhor_dia_compra INTEGER,
  limite DECIMAL(15,2) DEFAULT 0,
  divida_inicial DECIMAL(15,2) DEFAULT 0,
  cor TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que limite não é nulo
UPDATE cartoes_credito SET limite = 0 WHERE limite IS NULL;

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


-- =====================================================
-- 10. TABELA: transacoes_cartao
-- =====================================================
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

ALTER TABLE transacoes_cartao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver suas próprias transações" ON transacoes_cartao;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias transações" ON transacoes_cartao;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias transações" ON transacoes_cartao;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias transações" ON transacoes_cartao;

CREATE POLICY "Usuários podem ver suas próprias transações"
  ON transacoes_cartao FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir suas próprias transações"
  ON transacoes_cartao FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas próprias transações"
  ON transacoes_cartao FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar suas próprias transações"
  ON transacoes_cartao FOR DELETE USING (auth.uid() = user_id);


-- =====================================================
-- 11. TABELA: pagamentos_fatura
-- =====================================================
CREATE TABLE IF NOT EXISTS pagamentos_fatura (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID NOT NULL REFERENCES cartoes_credito(id) ON DELETE CASCADE,
  mes TEXT NOT NULL,                           -- formato: "yyyy-MM" ex: "2026-01"
  valor_pago DECIMAL(12,2) NOT NULL,
  conta_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pagamento_fatura_unico
  ON pagamentos_fatura(cartao_id, mes);

ALTER TABLE pagamentos_fatura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own payment records" ON pagamentos_fatura;
CREATE POLICY "Users can manage their own payment records" ON pagamentos_fatura
  FOR ALL USING (auth.uid() = user_id);


-- =====================================================
-- 12. TABELA: metas_gasto
-- =====================================================
CREATE TABLE IF NOT EXISTS metas_gasto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  limite DECIMAL(15,2) NOT NULL,
  UNIQUE(user_id, categoria)
);

ALTER TABLE metas_gasto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own metas" ON metas_gasto;
CREATE POLICY "Users manage own metas" ON metas_gasto
  FOR ALL USING (auth.uid() = user_id);


-- =====================================================
-- 13. TABELA: categorias_usuario
-- Categorias personalizadas de gasto e de receita.
-- Vazia = usuário nunca personalizou; o app usa a lista
-- padrão do código. Ver a migração
-- 20260805_categorias_personalizadas.sql.
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('gasto', 'receita')),
  nome TEXT NOT NULL CHECK (btrim(nome) <> ''),
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS categorias_usuario_unicas
  ON categorias_usuario (user_id, tipo, lower(btrim(nome)));
CREATE INDEX IF NOT EXISTS categorias_usuario_por_tipo
  ON categorias_usuario (user_id, tipo, ordem);

ALTER TABLE categorias_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own categorias" ON categorias_usuario;
CREATE POLICY "Users manage own categorias" ON categorias_usuario
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- =====================================================
-- 14. FUNÇÃO: delete_user_account
-- Permite que o próprio usuário exclua sua conta
-- e todos os dados associados.
-- =====================================================
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar dados de todas as tabelas (ordem: dependentes primeiro)
  DELETE FROM pagamentos_fatura WHERE user_id = auth.uid();
  DELETE FROM transacoes_cartao WHERE user_id = auth.uid();
  DELETE FROM metas_gasto WHERE user_id = auth.uid();
  DELETE FROM meus_gastos WHERE user_id = auth.uid();
  DELETE FROM gastos WHERE user_id = auth.uid();
  DELETE FROM saldos_devedores WHERE user_id = auth.uid();
  DELETE FROM observacoes_mes WHERE user_id = auth.uid();
  DELETE FROM pagamentos_parciais WHERE user_id = auth.uid();
  DELETE FROM receitas WHERE user_id = auth.uid();
  DELETE FROM cartoes_credito WHERE user_id = auth.uid();
  DELETE FROM contas_bancarias WHERE user_id = auth.uid();
  DELETE FROM categorias_usuario WHERE user_id = auth.uid();
  DELETE FROM pessoas WHERE user_id = auth.uid();

  -- Deletar o usuário da tabela auth.users
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
