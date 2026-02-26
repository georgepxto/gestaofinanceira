-- =====================================================
-- HEDGE — Novas Features de Admin (V2)
-- Execute no Supabase SQL Editor DEPOIS do schema base
-- =====================================================


-- =====================================================
-- 1. TABELA: login_attempts
-- Registra tentativas de login para bloqueio por falhas
-- =====================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN DEFAULT FALSE,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por email
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, attempted_at DESC);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Apenas funções SECURITY DEFINER acessam esta tabela
DROP POLICY IF EXISTS "No direct access to login_attempts" ON login_attempts;
CREATE POLICY "No direct access to login_attempts" ON login_attempts
  FOR SELECT USING (FALSE);

-- Admins podem ler (via RPC, mas precisa de policy de leitura)
DROP POLICY IF EXISTS "Admins can read login_attempts" ON login_attempts;
CREATE POLICY "Admins can read login_attempts" ON login_attempts
  FOR SELECT USING (is_admin());


-- =====================================================
-- 2. TABELA: activity_logs
-- Registra ações importantes dos usuários
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  action TEXT NOT NULL,      -- 'login', 'logout', 'login_failed', 'login_blocked', 'password_reset', 'forced_logout'
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action, created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read activity_logs" ON activity_logs;
CREATE POLICY "Admins can read activity_logs" ON activity_logs
  FOR SELECT USING (is_admin());


-- =====================================================
-- 3. FUNÇÃO: record_login_attempt()
-- Chamada pelo frontend ao tentar login
-- =====================================================
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_email TEXT,
  p_success BOOLEAN,
  p_ip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_attempts INT := 5;
  v_lockout_minutes INT := 15;
  v_recent_failures INT;
  v_locked_until TIMESTAMPTZ;
  v_user_id UUID;
BEGIN
  -- Contar falhas recentes
  SELECT COUNT(*) INTO v_recent_failures
  FROM login_attempts
  WHERE email = p_email
    AND success = FALSE
    AND attempted_at > NOW() - (v_lockout_minutes || ' minutes')::INTERVAL;

  -- Se já está bloqueado, retornar info
  IF v_recent_failures >= v_max_attempts AND NOT p_success THEN
    -- Calcular quando desbloqueia
    SELECT attempted_at + (v_lockout_minutes || ' minutes')::INTERVAL INTO v_locked_until
    FROM login_attempts
    WHERE email = p_email AND success = FALSE
    ORDER BY attempted_at DESC
    LIMIT 1;

    -- Registrar tentativa bloqueada
    INSERT INTO login_attempts (email, ip_address, success) VALUES (p_email, p_ip, FALSE);
    
    -- Log de atividade
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    INSERT INTO activity_logs (user_id, email, action, ip_address, details)
    VALUES (v_user_id, p_email, 'login_blocked', p_ip, jsonb_build_object('reason', 'max_attempts_exceeded'));

    RETURN jsonb_build_object(
      'blocked', TRUE,
      'remaining_attempts', 0,
      'locked_until', v_locked_until,
      'message', 'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ' || v_lockout_minutes || ' minutos.'
    );
  END IF;

  -- Registrar tentativa
  INSERT INTO login_attempts (email, ip_address, success) VALUES (p_email, p_ip, p_success);

  -- Se sucesso, logar
  IF p_success THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    INSERT INTO activity_logs (user_id, email, action, ip_address)
    VALUES (v_user_id, p_email, 'login', p_ip);

    RETURN jsonb_build_object('blocked', FALSE, 'remaining_attempts', v_max_attempts);
  END IF;

  -- Se falha, calcular tentativas restantes
  v_recent_failures := v_recent_failures + 1; -- incluir esta tentativa

  -- Log de atividade
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  INSERT INTO activity_logs (user_id, email, action, ip_address, details)
  VALUES (v_user_id, p_email, 'login_failed', p_ip, jsonb_build_object('attempts', v_recent_failures));

  RETURN jsonb_build_object(
    'blocked', v_recent_failures >= v_max_attempts,
    'remaining_attempts', GREATEST(v_max_attempts - v_recent_failures, 0),
    'message', CASE
      WHEN v_recent_failures >= v_max_attempts THEN 'Conta bloqueada por ' || v_lockout_minutes || ' minutos.'
      ELSE 'Tentativas restantes: ' || GREATEST(v_max_attempts - v_recent_failures, 0)
    END
  );
END;
$$;


-- =====================================================
-- 4. FUNÇÃO: check_login_blocked()
-- Verifica se email está bloqueado ANTES de tentar login
-- =====================================================
CREATE OR REPLACE FUNCTION check_login_blocked(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_attempts INT := 5;
  v_lockout_minutes INT := 15;
  v_recent_failures INT;
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*) INTO v_recent_failures
  FROM login_attempts
  WHERE email = p_email
    AND success = FALSE
    AND attempted_at > NOW() - (v_lockout_minutes || ' minutes')::INTERVAL;

  IF v_recent_failures >= v_max_attempts THEN
    SELECT attempted_at + (v_lockout_minutes || ' minutes')::INTERVAL INTO v_locked_until
    FROM login_attempts
    WHERE email = p_email AND success = FALSE
    ORDER BY attempted_at DESC
    LIMIT 1;

    RETURN jsonb_build_object(
      'blocked', TRUE,
      'remaining_attempts', 0,
      'locked_until', v_locked_until,
      'message', 'Conta temporariamente bloqueada. Tente novamente em ' || v_lockout_minutes || ' minutos.'
    );
  END IF;

  RETURN jsonb_build_object(
    'blocked', FALSE,
    'remaining_attempts', v_max_attempts - v_recent_failures
  );
END;
$$;


-- =====================================================
-- 5. FUNÇÃO: admin_force_logout()
-- Invalida TODAS as sessões de um usuário
-- =====================================================
CREATE OR REPLACE FUNCTION admin_force_logout(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_session_count INT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = target_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Contar sessões ativas
  SELECT COUNT(*) INTO v_session_count
  FROM auth.sessions WHERE user_id = target_user_id;

  -- Deletar refresh tokens PRIMEIRO (têm FK para sessions)
  BEGIN
    DELETE FROM auth.refresh_tokens
    WHERE session_id IN (
      SELECT id FROM auth.sessions WHERE user_id = target_user_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Aviso: não foi possível deletar refresh_tokens: %', SQLERRM;
  END;

  -- Depois deletar as sessões
  BEGIN
    DELETE FROM auth.sessions WHERE user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Aviso: não foi possível deletar sessions: %', SQLERRM;
  END;

  -- Registrar no log
  INSERT INTO activity_logs (user_id, email, action, details)
  VALUES (target_user_id, v_email, 'forced_logout',
    jsonb_build_object(
      'admin_id', auth.uid()::text,
      'sessions_removed', v_session_count
    ));
END;
$$;


-- =====================================================
-- 6. FUNÇÃO: admin_reset_password()
-- Gera um link de reset de senha via Supabase
-- (Na prática chamamos supabase.auth.admin.resetPasswordForEmail
--  mas registramos aqui no log)
-- =====================================================
CREATE OR REPLACE FUNCTION admin_log_password_reset(target_user_id UUID)
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

  INSERT INTO activity_logs (user_id, email, action, details)
  VALUES (target_user_id, v_email, 'password_reset',
    jsonb_build_object('initiated_by', 'admin', 'admin_id', auth.uid()::text));
END;
$$;


-- =====================================================
-- 7. FUNÇÃO: admin_get_usage_stats()
-- Retorna estatísticas de uso (logins por dia/semana/mês)
-- =====================================================
CREATE OR REPLACE FUNCTION admin_get_usage_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total_users INT;
  v_active_today INT;
  v_active_7d INT;
  v_active_30d INT;
  v_new_users_7d INT;
  v_new_users_30d INT;
  v_logins_today INT;
  v_logins_7d INT;
  v_logins_30d INT;
  v_daily_logins JSONB;
  v_daily_signups JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  -- Total de usuários (excluindo admin)
  SELECT COUNT(*) INTO v_total_users
  FROM auth.users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  WHERE COALESCE(ur.role, 'user') != 'admin';

  -- Usuários ativos (último login)
  SELECT COUNT(*) INTO v_active_today
  FROM auth.users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  WHERE COALESCE(ur.role, 'user') != 'admin'
    AND u.last_sign_in_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_active_7d
  FROM auth.users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  WHERE COALESCE(ur.role, 'user') != 'admin'
    AND u.last_sign_in_at >= NOW() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_active_30d
  FROM auth.users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  WHERE COALESCE(ur.role, 'user') != 'admin'
    AND u.last_sign_in_at >= NOW() - INTERVAL '30 days';

  -- Novos usuários
  SELECT COUNT(*) INTO v_new_users_7d
  FROM auth.users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  WHERE COALESCE(ur.role, 'user') != 'admin'
    AND u.created_at >= NOW() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_new_users_30d
  FROM auth.users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  WHERE COALESCE(ur.role, 'user') != 'admin'
    AND u.created_at >= NOW() - INTERVAL '30 days';

  -- Logins (da tabela activity_logs)
  SELECT COUNT(*) INTO v_logins_today
  FROM activity_logs WHERE action = 'login' AND created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_logins_7d
  FROM activity_logs WHERE action = 'login' AND created_at >= NOW() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_logins_30d
  FROM activity_logs WHERE action = 'login' AND created_at >= NOW() - INTERVAL '30 days';

  -- Logins por dia (últimos 30 dias)
  SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb) INTO v_daily_logins
  FROM (
    SELECT
      TO_CHAR(created_at::date, 'DD/MM') AS dia,
      COUNT(*) AS total
    FROM activity_logs
    WHERE action = 'login'
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY created_at::date
    ORDER BY created_at::date
  ) d;

  -- Cadastros por dia (últimos 30 dias)
  SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb) INTO v_daily_signups
  FROM (
    SELECT
      TO_CHAR(u.created_at::date, 'DD/MM') AS dia,
      COUNT(*) AS total
    FROM auth.users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    WHERE COALESCE(ur.role, 'user') != 'admin'
      AND u.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY u.created_at::date
    ORDER BY u.created_at::date
  ) d;

  v_result := jsonb_build_object(
    'total_users', v_total_users,
    'active_today', v_active_today,
    'active_7d', v_active_7d,
    'active_30d', v_active_30d,
    'new_users_7d', v_new_users_7d,
    'new_users_30d', v_new_users_30d,
    'logins_today', v_logins_today,
    'logins_7d', v_logins_7d,
    'logins_30d', v_logins_30d,
    'daily_logins', v_daily_logins,
    'daily_signups', v_daily_signups
  );

  RETURN v_result;
END;
$$;


-- =====================================================
-- 8. FUNÇÃO: admin_get_inactive_users()
-- Retorna usuários que não acessam há X dias
-- =====================================================
CREATE OR REPLACE FUNCTION admin_get_inactive_users(p_days INT DEFAULT 30)
RETURNS TABLE (
  id UUID,
  email TEXT,
  nome TEXT,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  days_inactive INT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    (u.raw_user_meta_data->>'nome')::TEXT AS nome,
    u.last_sign_in_at,
    u.created_at,
    EXTRACT(DAY FROM NOW() - COALESCE(u.last_sign_in_at, u.created_at))::INT AS days_inactive,
    COALESCE(ur.is_active, TRUE) AS is_active
  FROM auth.users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  WHERE COALESCE(ur.role, 'user') != 'admin'
    AND COALESCE(u.last_sign_in_at, u.created_at) < NOW() - (p_days || ' days')::INTERVAL
  ORDER BY COALESCE(u.last_sign_in_at, u.created_at) ASC;
END;
$$;


-- =====================================================
-- 9. FUNÇÃO: admin_get_activity_logs()
-- Retorna logs de atividade com paginação
-- =====================================================
CREATE OR REPLACE FUNCTION admin_get_activity_logs(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_action TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  action TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.user_id,
    al.email,
    al.action,
    al.details,
    al.ip_address,
    al.created_at
  FROM activity_logs al
  WHERE (p_action IS NULL OR al.action = p_action)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


-- =====================================================
-- 10. PERMISSÕES: Garantir que anon e authenticated 
-- possam chamar as funções de login
-- (Necessário para o frontend registrar tentativas)
-- =====================================================
GRANT EXECUTE ON FUNCTION check_login_blocked(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_login_attempt(TEXT, BOOLEAN, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_force_logout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_log_password_reset(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_inactive_users(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_activity_logs(INT, INT, TEXT, UUID) TO authenticated;

-- Permitir INSERTs nas tabelas via SECURITY DEFINER functions
-- (As policies SELECT existem, mas precisamos de INSERT para as funções)
DROP POLICY IF EXISTS "Allow SECURITY DEFINER inserts on login_attempts" ON login_attempts;
CREATE POLICY "Allow SECURITY DEFINER inserts on login_attempts" ON login_attempts
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow SECURITY DEFINER inserts on activity_logs" ON activity_logs;
CREATE POLICY "Allow SECURITY DEFINER inserts on activity_logs" ON activity_logs
  FOR INSERT WITH CHECK (TRUE);


-- =====================================================
-- 11. LIMPEZA: Remover tentativas antigas (> 24h)
-- Execute periodicamente ou crie um cron job
-- =====================================================
-- DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours';


-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
SELECT 'Schema Admin V2 criado com sucesso! ✓' AS status;
