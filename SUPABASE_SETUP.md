# 🔐 Configuração do Supabase para Sincronização Cross-Device

## Passo 1: Executar o Schema SQL no Supabase

1. Acesse sua dashboard do Supabase: https://app.supabase.com
2. Selecione seu projeto
3. Vá para **SQL Editor** (Ícone de banco de dados no menu esquerdo)
4. Clique em **New Query**
5. Copie TODO o conteúdo do arquivo `supabase_schema_complete.sql`
6. Cole na janela de query
7. Clique em **Run** (ou pressione `Ctrl + Enter`)

### ✅ Esperado:
- Criar tabelas: `pessoas`, `gastos`, `saldos_devedores`
- Criar índices e triggers
- Habilitar RLS (Row Level Security)

---

## Passo 2: Configurar Variáveis de Ambiente

### Localmente (.env.local)
1. Abra na raiz do projeto: `.env.local`
2. Adicione suas credenciais do Supabase:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

### Como obter as credenciais:
1. Na dashboard do Supabase, vá para **Settings** (ícone de engrenagem)
2. Selecione **API** no menu lateral
3. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

### No Vercel (Produção)
1. Acesse seu projeto no Vercel: https://vercel.com
2. Vá para **Settings** → **Environment Variables**
3. Adicione as mesmas variáveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automático será acionado

---

## Passo 3: Sincronizar Dados Existentes (Opcional)

Se você já tem dados no localStorage, eles serão sincronizados automaticamente na primeira carga.

**Manual sync via SQL:**
```sql
-- Exemplo: Adicionar pessoas existentes
INSERT INTO pessoas (id, nome) VALUES
  ('pessoa-1', 'Pai'),
  ('pessoa-2', 'Mãe')
ON CONFLICT (id) DO NOTHING;
```

---

## Passo 4: Testar Cross-Device Sync

1. **PC/Navegador 1:**
   - Abra: http://localhost:5174 (ou sua URL Vercel)
   - Crie um novo gasto ou saldo devedor
   - Observe sincronização em tempo real

2. **Celular/Navegador 2:**
   - Abra a mesma URL
   - Você verá os mesmos dados criados no Passo 1
   - Crie um novo registro no celular
   - Volte ao PC e recarregue - verá os dados do celular

3. **Verificação no Supabase:**
   - Dashboard → **Table Editor**
   - Abra `gastos`, `saldos_devedores`, ou `pessoas`
   - Veja todos os registros criados em qualquer dispositivo

---

## 🚨 Possíveis Problemas

### ❌ "Erro de conexão com Supabase"
- Verifique as variáveis de ambiente
- Confirme que `.env.local` existe e tem as chaves corretas
- Reinicie o servidor de desenvolvimento: `npm run dev`

### ❌ "Tabelas não existem"
- Execute novamente o SQL schema completo
- Confirme que não há erros na execução

### ❌ "Dados não sincronizam entre dispositivos"
- Verifique se está usando a mesma conta/projeto Supabase
- Recarregue a página (Ctrl+F5)
- Limpe cache do navegador se necessário

### ❌ "localhost não funciona no celular"
- Use a URL do Vercel ao invés de localhost
- Ou use tunnel tools como `ngrok` para expor localhost

---

## 📱 Fluxo de Sincronização

```
Dispositivo A (PC)
      ↓
   React App
      ↓
  Supabase Client
      ↓
  PostgreSQL Database
      ↑
  Supabase Client
      ↑
   React App
      ↑
Dispositivo B (Celular)
```

**Benefícios:**
- ✅ Dados em tempo real
- ✅ Funciona offline (localStorage como fallback)
- ✅ Seguro com RLS
- ✅ Sem necessidade de servidor próprio

---

## 🔄 Próximos Passos

1. Execute `supabase_schema_complete.sql` no Supabase SQL Editor
2. Adicione as variáveis de ambiente no `.env.local` e Vercel
3. Teste com `npm run dev`
4. Abra em múltiplos dispositivos
5. Crie registros e veja a sincronização

**Tudo pronto! Seus dados agora serão sincronizados automaticamente entre PC, celular e outros dispositivos.** 🎉
