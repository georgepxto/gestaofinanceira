-- =====================================================
-- FIX: Corrigir Activity Logs não aparecendo
-- Execute no Supabase SQL Editor
-- =====================================================

-- NOTA: admin_force_logout agora é feito via Edge Function
-- (supabase/functions/admin-force-logout/index.ts)
-- O SQL abaixo apenas corrige permissões e policies.


-- 1. Adicionar INSERT policies nas tabelas de log
-- (RLS estava ativo sem policy de INSERT - bloqueava os logs)
DROP POLICY IF EXISTS "Allow inserts on login_attempts" ON login_attempts;
CREATE POLICY "Allow inserts on login_attempts" ON login_attempts
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow inserts on activity_logs" ON activity_logs;
CREATE POLICY "Allow inserts on activity_logs" ON activity_logs
  FOR INSERT WITH CHECK (TRUE);


-- 2. GRANT EXECUTE nas funções de login (anon precisa chamar ANTES de autenticar)
GRANT EXECUTE ON FUNCTION check_login_blocked(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_login_attempt(TEXT, BOOLEAN, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_log_password_reset(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_inactive_users(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_activity_logs(INT, INT, TEXT, UUID) TO authenticated;


-- 3. Dropar a antiga admin_force_logout (não é mais usada - Edge Function faz isso)
DROP FUNCTION IF EXISTS admin_force_logout(UUID);


-- 4. Verificação
SELECT 'login_attempts' AS tabela, COUNT(*) AS registros FROM login_attempts
UNION ALL
SELECT 'activity_logs' AS tabela, COUNT(*) AS registros FROM activity_logs;

SELECT '✅ Fix aplicado com sucesso!' AS status;
