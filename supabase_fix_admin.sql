-- =====================================================
-- HEDGE — FIX: Corrigir problema de login admin
-- Execute no Supabase SQL Editor
-- Ordem: Execute ESTE arquivo primeiro, depois recrie o admin
-- =====================================================

-- =====================================================
-- PASSO 1: Remover o registro de admin criado manualmente
-- (ele está malformado e quebra o GoTrue)
-- =====================================================
DELETE FROM user_features
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@hedge.com');

DELETE FROM user_roles
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@hedge.com');

DELETE FROM auth.identities
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@hedge.com');

DELETE FROM auth.sessions
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@hedge.com');

DELETE FROM auth.refresh_tokens
WHERE session_id IN (
  SELECT id FROM auth.sessions 
  WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@hedge.com')
);

DELETE FROM auth.users WHERE email = 'admin@hedge.com';


-- =====================================================
-- PASSO 2: Corrigir as políticas RLS com auto-referência
-- As policies de user_roles faziam subquery na própria 
-- tabela, causando recursão infinita.
-- Agora usam is_admin() que é SECURITY DEFINER.
-- =====================================================

-- Recriar policies de user_roles
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles" ON user_roles
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert roles" ON user_roles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update roles" ON user_roles
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete roles" ON user_roles
  FOR DELETE USING (is_admin());

-- Recriar policies de user_features  
DROP POLICY IF EXISTS "Users can read own features" ON user_features;
DROP POLICY IF EXISTS "Admins can manage features" ON user_features;

CREATE POLICY "Users can read own features" ON user_features
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all features" ON user_features
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert features" ON user_features
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update features" ON user_features
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete features" ON user_features
  FOR DELETE USING (is_admin());


-- =====================================================
-- PASSO 3: Garantir que is_admin() existe corretamente
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;


-- =====================================================
-- VERIFICAÇÃO: Confirme que tudo está limpo
-- =====================================================
SELECT 'Registros de admin@hedge.com removidos: ' || 
  CASE WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@hedge.com')
    THEN 'OK ✓'
    ELSE 'ERRO - ainda existe!'
  END AS status;
