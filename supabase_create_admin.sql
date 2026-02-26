-- =====================================================
-- HEDGE — Criar Usuário Admin (MÉTODO CORRETO)
-- =====================================================
-- 
-- ⚠️  NÃO insira manualmente na auth.users!
--     Inserções manuais quebram o GoTrue (auth server).
--
-- INSTRUÇÕES (2 passos):
--
-- PASSO 1: Crie o usuário pelo Supabase Dashboard:
--   → Vá em Authentication → Users → "Add User"
--   → Email: admin@hedge.com
--   → Password: H3dg3@Adm1n!2026#
--   → Marque "Auto Confirm User"
--   → Clique "Create User"
--
-- PASSO 2: Execute ESTE SQL abaixo para promover a admin:
-- =====================================================

-- Atribuir role de admin
INSERT INTO user_roles (user_id, role, is_active)
SELECT id, 'admin', TRUE
FROM auth.users
WHERE email = 'admin@hedge.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', is_active = TRUE;

-- Dar todas as features habilitadas
INSERT INTO user_features (user_id)
SELECT id FROM auth.users WHERE email = 'admin@hedge.com'
ON CONFLICT (user_id) DO NOTHING;

-- Verificação
SELECT 
  u.email,
  ur.role,
  ur.is_active,
  'Admin criado com sucesso! ✓' AS status
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'admin@hedge.com';
