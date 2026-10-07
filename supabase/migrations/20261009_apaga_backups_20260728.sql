-- ═══════════════════════════════════════════════════════════════════════════
-- Apaga as cópias de segurança de 28/07/2026
--
-- As três tabelas foram criadas antes da consolidação de categorias
-- (20260726) e ficaram em `public`. O app não lê nenhuma delas, e elas já
-- cumpriram o papel. Apagar acaba de vez com o risco de exposição.
--
-- Rode no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- ═══════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.gastos_backup_20260728;
DROP TABLE IF EXISTS public.meus_gastos_backup_20260728;
DROP TABLE IF EXISTS public.metas_gasto_backup_20260728;
