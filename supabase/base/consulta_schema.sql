-- Retrato da estrutura do banco, numa celula so. So le estrutura (tabelas,
-- colunas, tipos, restricoes, indices e regras de acesso); nao traz dado de
-- ninguem. Serve de entrada para scripts/gerar-schema.py.
select json_build_object(
  'colunas', (
    select json_agg(json_build_object(
      'tabela', table_name, 'coluna', column_name, 'tipo', data_type,
      'udt', udt_name, 'nulo', is_nullable, 'padrao', column_default,
      'posicao', ordinal_position) order by table_name, ordinal_position)
    from information_schema.columns where table_schema = 'public'),
  'restricoes', (
    select json_agg(json_build_object(
      'tabela', conrelid::regclass::text, 'nome', conname,
      'definicao', pg_get_constraintdef(oid)) order by conrelid::regclass::text, conname)
    from pg_constraint where connamespace = 'public'::regnamespace),
  'indices', (
    select json_agg(json_build_object('tabela', tablename, 'definicao', indexdef) order by tablename, indexname)
    from pg_indexes where schemaname = 'public'),
  'rls', (
    select json_agg(json_build_object('tabela', relname, 'ativa', relrowsecurity) order by relname)
    from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'),
  'politicas', (
    select json_agg(json_build_object(
      'tabela', tablename, 'nome', policyname, 'comando', cmd,
      'usando', qual, 'checando', with_check) order by tablename, policyname)
    from pg_policies where schemaname = 'public')
) as schema;
