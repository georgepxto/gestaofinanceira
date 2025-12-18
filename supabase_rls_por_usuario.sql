-- ===========================================
-- CONFIGURAR DADOS POR USUÁRIO NO SUPABASE
-- Execute este SQL no Supabase SQL Editor
-- ===========================================

-- IMPORTANTE: Execute ANTES de criar novos dados
-- Os dados existentes serão associados ao primeiro usuário que fizer login

-- 1. ADICIONAR COLUNA user_id EM TODAS AS TABELAS

-- Tabela gastos
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Tabela saldos_devedores
ALTER TABLE saldos_devedores ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Tabela pessoas
ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Tabela meus_gastos (se existir)
ALTER TABLE meus_gastos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. ATUALIZAR DADOS EXISTENTES PARA SEU USUÁRIO
-- Substitua 'SEU_USER_ID' pelo ID do seu usuário (você encontra em Authentication > Users)
-- Exemplo: UPDATE gastos SET user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' WHERE user_id IS NULL;

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)

-- Gastos
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own gastos" ON gastos;
CREATE POLICY "Users can view own gastos" ON gastos
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own gastos" ON gastos;
CREATE POLICY "Users can insert own gastos" ON gastos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own gastos" ON gastos;
CREATE POLICY "Users can update own gastos" ON gastos
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own gastos" ON gastos;
CREATE POLICY "Users can delete own gastos" ON gastos
    FOR DELETE USING (auth.uid() = user_id);

-- Saldos Devedores
ALTER TABLE saldos_devedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saldos" ON saldos_devedores;
CREATE POLICY "Users can view own saldos" ON saldos_devedores
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saldos" ON saldos_devedores;
CREATE POLICY "Users can insert own saldos" ON saldos_devedores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saldos" ON saldos_devedores;
CREATE POLICY "Users can update own saldos" ON saldos_devedores
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saldos" ON saldos_devedores;
CREATE POLICY "Users can delete own saldos" ON saldos_devedores
    FOR DELETE USING (auth.uid() = user_id);

-- Pessoas
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own pessoas" ON pessoas;
CREATE POLICY "Users can view own pessoas" ON pessoas
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own pessoas" ON pessoas;
CREATE POLICY "Users can insert own pessoas" ON pessoas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pessoas" ON pessoas;
CREATE POLICY "Users can update own pessoas" ON pessoas
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pessoas" ON pessoas;
CREATE POLICY "Users can delete own pessoas" ON pessoas
    FOR DELETE USING (auth.uid() = user_id);

-- Meus Gastos
ALTER TABLE meus_gastos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meus_gastos" ON meus_gastos;
CREATE POLICY "Users can view own meus_gastos" ON meus_gastos
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meus_gastos" ON meus_gastos;
CREATE POLICY "Users can insert own meus_gastos" ON meus_gastos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meus_gastos" ON meus_gastos;
CREATE POLICY "Users can update own meus_gastos" ON meus_gastos
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meus_gastos" ON meus_gastos;
CREATE POLICY "Users can delete own meus_gastos" ON meus_gastos
    FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- APÓS EXECUTAR O SQL ACIMA, FAÇA ISSO:
-- ===========================================
-- 
-- 1. Vá em Authentication > Users e copie o ID do seu usuário
-- 2. Execute este comando para associar seus dados atuais:
--
-- UPDATE gastos SET user_id = 'COLE_SEU_USER_ID_AQUI' WHERE user_id IS NULL;
-- UPDATE saldos_devedores SET user_id = 'COLE_SEU_USER_ID_AQUI' WHERE user_id IS NULL;
-- UPDATE pessoas SET user_id = 'COLE_SEU_USER_ID_AQUI' WHERE user_id IS NULL;
-- UPDATE meus_gastos SET user_id = 'COLE_SEU_USER_ID_AQUI' WHERE user_id IS NULL;
--
-- ===========================================
