"""Gera supabase/base/schema_atual.sql a partir do retrato do banco.

1. Rode supabase/base/consulta_schema.sql no SQL Editor do Supabase.
2. Salve a celula do resultado num arquivo (por exemplo screenshots/schema.json,
   que fica fora do git).
3. python scripts/gerar-schema.py screenshots/schema.json
"""
import datetime, json, re, sys

origem = sys.argv[1] if len(sys.argv) > 1 else 'screenshots/schema.json'
d = json.loads(open(origem, encoding='utf-8-sig').read())
if isinstance(d, list): d = d[0]
if 'schema' in d: d = d['schema']
if isinstance(d, str): d = json.loads(d)

BACKUP = re.compile(r'_backup_\d+$')
tabelas = {}
for c in d['colunas']:
    if not BACKUP.search(c['tabela']):
        tabelas.setdefault(c['tabela'], []).append(c)

TIPOS = {
    'character varying': 'VARCHAR', 'timestamp with time zone': 'TIMESTAMPTZ',
    'timestamp without time zone': 'TIMESTAMP', 'double precision': 'DOUBLE PRECISION',
    'time without time zone': 'TIME',
}
def tipo(c):
    t = c['tipo']
    if t == 'ARRAY':
        return TIPOS.get(c['udt'].lstrip('_'), c['udt'].lstrip('_')).upper() + '[]'
    if t == 'USER-DEFINED':
        return c['udt']
    return TIPOS.get(t, t.upper())

def limpa(tabela):
    return tabela.replace('public.', '').strip('"')

restricoes = {}
for r in d['restricoes'] or []:
    t = limpa(r['tabela'])
    if t in tabelas:
        restricoes.setdefault(t, []).append(r)

nomes_de_restricao = {r['nome'] for rs in restricoes.values() for r in rs}
L = []
w = L.append
w('-- ═══════════════════════════════════════════════════════════════════════════')
w('-- Hedge — o schema como está no banco')
w('--')
w(f"-- Gerado a partir do banco de produção em {datetime.date.today():%d/%m/%Y} (information_schema,")
w('-- pg_constraint, pg_indexes e pg_policies). É a referência fiel de tabelas,')
w('-- colunas, tipos, restrições, índices e regras de acesso (RLS).')
w('--')
w('-- NÃO é para rodar por cima de um banco que já existe. Os outros arquivos')
w('-- desta pasta contam como o banco foi montado; este diz como ele ficou.')
w('--')
w('-- O que este retrato não traz: funções e RPCs (check_login_blocked,')
w('-- record_login_attempt, delete_user_account e as do painel de admin),')
w('-- gatilhos, a precisão dos campos NUMERIC e os papéis de cada política.')
w('-- As tabelas *_backup_20260728 ficaram de fora de propósito: são cópias')
w('-- soltas, não fazem parte do app.')
w('--')
w('-- Para atualizar: siga os passos no topo de scripts/gerar-schema.py.')
w('-- ═══════════════════════════════════════════════════════════════════════════')
w('')

fks = []
for t in sorted(tabelas):
    cols = sorted(tabelas[t], key=lambda c: c['posicao'])
    linhas = []
    largura = max(len(c['coluna']) for c in cols)
    for c in cols:
        s = f"  {c['coluna'].ljust(largura)}  {tipo(c)}"
        if c['padrao'] is not None: s += f" DEFAULT {c['padrao']}"
        if c['nulo'] == 'NO': s += ' NOT NULL'
        linhas.append(s)
    for r in sorted(restricoes.get(t, []), key=lambda r: (not r['definicao'].startswith('PRIMARY'), r['nome'])):
        if r['definicao'].startswith('FOREIGN KEY'):
            fks.append((t, r))
        else:
            linhas.append(f"  CONSTRAINT {r['nome']} {r['definicao']}")
    w(f'-- ─── {t} ' + '─' * max(3, 70 - len(t)))
    w(f'CREATE TABLE {t} (')
    w(',\n'.join(linhas))
    w(');')
    w('')

w('-- ═══ Chaves estrangeiras ════════════════════════════════════════════════════')
for t, r in sorted(fks, key=lambda x: (x[0], x[1]['nome'])):
    w(f"ALTER TABLE {t} ADD CONSTRAINT {r['nome']} {r['definicao']};")
w('')

w('-- ═══ Índices (além dos que as restrições já criam) ═════════════════════════')
for i in sorted(d['indices'] or [], key=lambda i: i['definicao']):
    if BACKUP.search(i['tabela']): continue
    m = re.search(r'INDEX (\S+) ON', i['definicao'])
    if m and m.group(1) in nomes_de_restricao: continue
    w(i['definicao'].replace(' ON public.', ' ON ') + ';')
w('')

w('-- ═══ Regras de acesso (RLS) ════════════════════════════════════════════════')
sem_rls = []
for r in d['rls']:
    if BACKUP.search(r['tabela']): continue
    if r['ativa']: w(f"ALTER TABLE {r['tabela']} ENABLE ROW LEVEL SECURITY;")
    else: sem_rls.append(r['tabela'])
w('')
for p in sorted(d['politicas'] or [], key=lambda p: (p['tabela'], p['nome'])):
    if BACKUP.search(p['tabela']): continue
    s = f"CREATE POLICY \"{p['nome']}\" ON {p['tabela']} FOR {p['comando']}"
    if p['usando']: s += f"\n  USING ({p['usando']})"
    if p['checando']: s += f"\n  WITH CHECK ({p['checando']})"
    w(s + ';')
w('')

open('supabase/base/schema_atual.sql', 'w', encoding='utf-8', newline='').write('\r\n'.join(L))
print('tabelas:', len(tabelas), '| fks:', len(fks), '| sem RLS (fora backups):', sem_rls)
