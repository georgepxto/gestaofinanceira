-- =====================================================
-- HEDGE — Schema de Admin
-- Execute no Supabase SQL Editor
-- =====================================================


-- =====================================================
-- 0. FUNÇÃO: is_admin() — deve existir ANTES das policies
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
-- 1. TABELA: user_roles
-- Controla quem é admin e quem está ativo/desativado
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',    -- 'admin' | 'user'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário pode ler seu próprio role
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Admins podem ler todos (usa is_admin() SECURITY DEFINER para evitar recursão RLS)
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
CREATE POLICY "Admins can read all roles" ON user_roles
  FOR SELECT USING (is_admin());

-- Admins podem inserir
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
CREATE POLICY "Admins can insert roles" ON user_roles
  FOR INSERT WITH CHECK (is_admin());

-- Admins podem atualizar
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
CREATE POLICY "Admins can update roles" ON user_roles
  FOR UPDATE USING (is_admin());

-- Admins podem deletar
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
CREATE POLICY "Admins can delete roles" ON user_roles
  FOR DELETE USING (is_admin());


-- =====================================================
-- 2. TABELA: user_features
-- Controla quais funcionalidades cada usuário pode usar
-- =====================================================
CREATE TABLE IF NOT EXISTS user_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  dashboard BOOLEAN DEFAULT TRUE,
  meus_gastos BOOLEAN DEFAULT TRUE,
  gastos_compartilhados BOOLEAN DEFAULT TRUE,
  saldo_devedor BOOLEAN DEFAULT TRUE,
  pessoas BOOLEAN DEFAULT TRUE,
  contas_bancarias BOOLEAN DEFAULT TRUE,
  cartoes_credito BOOLEAN DEFAULT TRUE,
  metas BOOLEAN DEFAULT TRUE,
  exportar_pdf BOOLEAN DEFAULT TRUE,
  configuracoes BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_features ENABLE ROW LEVEL SECURITY;

-- Usuário pode ler suas próprias features
DROP POLICY IF EXISTS "Users can read own features" ON user_features;
CREATE POLICY "Users can read own features" ON user_features
  FOR SELECT USING (auth.uid() = user_id);

-- Admins podem ler todas
DROP POLICY IF EXISTS "Admins can read all features" ON user_features;
CREATE POLICY "Admins can read all features" ON user_features
  FOR SELECT USING (is_admin());

-- Admins podem inserir features
DROP POLICY IF EXISTS "Admins can insert features" ON user_features;
CREATE POLICY "Admins can insert features" ON user_features
  FOR INSERT WITH CHECK (is_admin());

-- Admins podem atualizar features
DROP POLICY IF EXISTS "Admins can update features" ON user_features;
CREATE POLICY "Admins can update features" ON user_features
  FOR UPDATE USING (is_admin());

-- Admins podem deletar features
DROP POLICY IF EXISTS "Admins can delete features" ON user_features;
CREATE POLICY "Admins can delete features" ON user_features
  FOR DELETE USING (is_admin());


-- =====================================================
-- 3. TABELA: push_subscriptions (se não existir)
-- =====================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own push subs" ON push_subscriptions;
CREATE POLICY "Users manage own push subs" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);


-- (is_admin() já criada no topo do arquivo)


-- =====================================================
-- 5. FUNÇÃO: admin_get_users()
-- Retorna todos os usuários com seus roles e status
-- (Somente admin pode chamar)
-- =====================================================
CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  nome TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  is_active BOOLEAN,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    (u.raw_user_meta_data->>'nome')::TEXT as nome,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(ur.is_active, TRUE) as is_active,
    COALESCE(ur.role, 'user')::TEXT as role
  FROM auth.users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;


-- =====================================================
-- 6. FUNÇÃO: admin_toggle_user_active()
-- Ativa/desativa um usuário
-- =====================================================
CREATE OR REPLACE FUNCTION admin_toggle_user_active(target_user_id UUID, active BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  INSERT INTO user_roles (user_id, is_active, role)
  VALUES (target_user_id, active, 'user')
  ON CONFLICT (user_id) DO UPDATE SET is_active = active;
END;
$$;


-- =====================================================
-- 7. FUNÇÃO: admin_get_user_features()
-- Retorna as features de um usuário específico
-- =====================================================
CREATE OR REPLACE FUNCTION admin_get_user_features(target_user_id UUID)
RETURNS TABLE (
  dashboard BOOLEAN,
  meus_gastos BOOLEAN,
  gastos_compartilhados BOOLEAN,
  saldo_devedor BOOLEAN,
  pessoas BOOLEAN,
  contas_bancarias BOOLEAN,
  cartoes_credito BOOLEAN,
  metas BOOLEAN,
  exportar_pdf BOOLEAN,
  configuracoes BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Usuário pode ver suas próprias features ou admin pode ver de qualquer um
  IF auth.uid() != target_user_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(uf.dashboard, TRUE),
    COALESCE(uf.meus_gastos, TRUE),
    COALESCE(uf.gastos_compartilhados, TRUE),
    COALESCE(uf.saldo_devedor, TRUE),
    COALESCE(uf.pessoas, TRUE),
    COALESCE(uf.contas_bancarias, TRUE),
    COALESCE(uf.cartoes_credito, TRUE),
    COALESCE(uf.metas, TRUE),
    COALESCE(uf.exportar_pdf, TRUE),
    COALESCE(uf.configuracoes, TRUE)
  FROM (SELECT target_user_id as uid) t
  LEFT JOIN user_features uf ON uf.user_id = t.uid;
END;
$$;


-- =====================================================
-- 8. FUNÇÃO: admin_update_user_features()
-- Atualiza as features de um usuário
-- =====================================================
CREATE OR REPLACE FUNCTION admin_update_user_features(
  target_user_id UUID,
  p_dashboard BOOLEAN DEFAULT TRUE,
  p_meus_gastos BOOLEAN DEFAULT TRUE,
  p_gastos_compartilhados BOOLEAN DEFAULT TRUE,
  p_saldo_devedor BOOLEAN DEFAULT TRUE,
  p_pessoas BOOLEAN DEFAULT TRUE,
  p_contas_bancarias BOOLEAN DEFAULT TRUE,
  p_cartoes_credito BOOLEAN DEFAULT TRUE,
  p_metas BOOLEAN DEFAULT TRUE,
  p_exportar_pdf BOOLEAN DEFAULT TRUE,
  p_configuracoes BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  INSERT INTO user_features (
    user_id, dashboard, meus_gastos, gastos_compartilhados,
    saldo_devedor, pessoas, contas_bancarias, cartoes_credito,
    metas, exportar_pdf, configuracoes, updated_at
  )
  VALUES (
    target_user_id, p_dashboard, p_meus_gastos, p_gastos_compartilhados,
    p_saldo_devedor, p_pessoas, p_contas_bancarias, p_cartoes_credito,
    p_metas, p_exportar_pdf, p_configuracoes, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    dashboard = p_dashboard,
    meus_gastos = p_meus_gastos,
    gastos_compartilhados = p_gastos_compartilhados,
    saldo_devedor = p_saldo_devedor,
    pessoas = p_pessoas,
    contas_bancarias = p_contas_bancarias,
    cartoes_credito = p_cartoes_credito,
    metas = p_metas,
    exportar_pdf = p_exportar_pdf,
    configuracoes = p_configuracoes,
    updated_at = NOW();
END;
$$;


-- =====================================================
-- 9. FUNÇÃO: get_my_role()
-- Retorna o role e status do usuário logado
-- =====================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TABLE (
  role TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ur.role, 'user')::TEXT,
    COALESCE(ur.is_active, TRUE)
  FROM (SELECT auth.uid() as uid) t
  LEFT JOIN user_roles ur ON ur.user_id = t.uid;
END;
$$;


-- =====================================================
-- 10. INSERIR PRIMEIRO ADMIN
-- Troque 'SEU_USER_ID_AQUI' pelo UUID do seu usuário
-- Encontre no Supabase Dashboard → Authentication → Users
-- =====================================================
-- INSERT INTO user_roles (user_id, role, is_active)
-- VALUES ('SEU_USER_ID_AQUI', 'admin', TRUE)
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
