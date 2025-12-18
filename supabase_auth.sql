-- ===========================================
-- CONFIGURAÇÃO DE AUTENTICAÇÃO NO SUPABASE
-- Execute este SQL no Supabase SQL Editor
-- ===========================================

-- 1. HABILITAR AUTENTICAÇÃO
-- No painel do Supabase, vá em: Authentication > Settings
-- Email Auth já vem habilitado por padrão

-- 2. CRIAR USUÁRIO INICIAL
-- Você pode criar diretamente pelo painel do Supabase:
-- Authentication > Users > Add User
-- Email: gpx711@gmail.com
-- Password: George123!

-- OU usar a API (recomendado criar pelo painel)

-- 3. ADICIONAR COLUNA user_id NAS TABELAS (para multi-usuário futuro)
-- Por enquanto, vamos manter sem RLS para simplicidade
-- já que é uso pessoal

-- ===========================================
-- INSTRUÇÕES PARA CRIAR O USUÁRIO:
-- ===========================================
-- 
-- 1. Acesse o painel do Supabase
-- 2. Vá em "Authentication" no menu lateral
-- 3. Clique na aba "Users"
-- 4. Clique em "Add User" > "Create new user"
-- 5. Preencha:
--    - Email: gpx711@gmail.com
--    - Password: George123!
--    - Marque "Auto Confirm User" para não precisar confirmar email
-- 6. Clique em "Create User"
--
-- Pronto! Agora você pode fazer login no app.
-- ===========================================
