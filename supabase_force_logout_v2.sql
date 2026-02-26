-- =====================================================
-- FIX: Forçar Logout sem Edge Function
-- Abordagem: force_logout_at na tabela user_roles
-- O cliente checa periodicamente e se desconecta
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Adicionar coluna force_logout_at na user_roles
ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS force_logout_at TIMESTAMPTZ;


-- 2. Função que o ADMIN chama para forçar logout
--    (simples UPDATE na tabela user_roles)
DROP FUNCTION IF EXISTS admin_force_logout(UUID);
CREATE OR REPLACE FUNCTION admin_force_logout(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = target_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Marcar que este usuário deve ser deslogado
  INSERT INTO user_roles (user_id, role, is_active, force_logout_at)
  VALUES (target_user_id, 'user', TRUE, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET force_logout_at = NOW();

  -- Registrar no log de atividades
  INSERT INTO activity_logs (user_id, email, action, details)
  VALUES (
    target_user_id,
    v_email,
    'forced_logout',
    jsonb_build_object('admin_id', auth.uid()::TEXT)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_force_logout(UUID) TO authenticated;


-- 3. Função que o CLIENTE chama para verificar se deve deslogar
--    Compara force_logout_at com o last_sign_in_at do usuário atual
CREATE OR REPLACE FUNCTION check_force_logout()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_force_logout_at TIMESTAMPTZ;
  v_last_sign_in    TIMESTAMPTZ;
BEGIN
  -- Pegar o force_logout_at do usuário atual
  SELECT force_logout_at INTO v_force_logout_at
  FROM user_roles
  WHERE user_id = auth.uid();

  -- Se não tiver marcação, não precisa deslogar
  IF v_force_logout_at IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Pegar o último login do usuário atual
  SELECT last_sign_in_at INTO v_last_sign_in
  FROM auth.users
  WHERE id = auth.uid();

  -- Se o force_logout_at for DEPOIS do último login, deslogar
  RETURN v_force_logout_at > COALESCE(v_last_sign_in, '1970-01-01'::TIMESTAMPTZ);
END;
$$;

GRANT EXECUTE ON FUNCTION check_force_logout() TO authenticated;


-- 4. Verificação
SELECT 'Forçar logout configurado com sucesso! ✓' AS status;
