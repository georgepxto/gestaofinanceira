# 💰 Gestão Financeira - Controle de Finanças Parceladas

Uma aplicação web moderna para controlar gastos parcelados, saldos devedores e despesas pessoais com múltiplos usuários. Construída com **React**, **Vite**, **TypeScript** e **Tailwind CSS**.

## 🎯 Características Principais

### 📊 Aba Gastos (Gastos Conjuntos)

- **Navegação por mês** - Veja os gastos de qualquer mês
- **Resumo mensal** - Total de gastos e por pessoa
- **Lançamentos com parcelas** - Registre gastos com até 24 parcelas
- **Tipos de gasto** - Crédito (parcelado) ou Débito (à vista)
- **Pagamento parcial** - Registre pagamentos parciais antes de fechar o mês
- **Observações de mês** - Adicione notas para cada mês
- **Modo demo** - Funciona sem Supabase (dados em localStorage)

### 💳 Aba Saldo Devedor

- **Rastreamento de dívidas** - Mantenha controle de dívidas antigas
- **Histórico de pagamentos** - Veja todos os pagamentos realizados
- **Registrar pagamento** - Clique no botão ➖ para registrar novos pagamentos
- **Desfazer pagamentos** - Reverta pagamentos acidentais
- **Filtro por status** - Veja pendentes ou já quitadas
- **Filtro por pessoa** - Filtre dívidas por usuário
- **Barra de progresso** - Visualize o andamento do pagamento
- **Observações de pagamento** - Adicione notas ao registrar pagamentos

### 👤 Aba Meus Gastos (Despesas Pessoais)

- **Gastos pessoais** - Registre suas próprias despesas
- **Tipos de gasto** - Crédito ou Débito
- **Categorias** - Pessoal ou Dividido com outros
- **Gastos fixos** - Configure despesas recorrentes
- **Habilitar/desabilitar fixos** - Ative ou desative gastos fixos
- **Resumo de gastos** - Veja totais de crédito, débito, pagos e fixos
- **Marcar como pago** - Indique quais gastos já foram quitados

### ⏹️ Fechar Mês

- **Botão por pessoa** - Feche o mês de cada pessoa individualmente
- **Transferência automática** - Gastos não pagos viram saldo devedor
- **Confirmação visual** - Veja quanto fica de dívida antes de confirmar

### 👥 Gerenciamento de Pessoas

- **Pessoas dinâmicas** - Adicione pessoas
- **Adicionar novos usuários** - Crie usuários conforme necessário
- **Remover usuários** - Delete usuários que não precisa mais

## 🚀 Instalação

### Pré-requisitos

- Node.js 16+
- npm ou yarn

### Passos

1. **Clone o repositório**

```bash
git clone https://github.com/georgepxto/gestaofinanceira.git
cd gestao
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure o Supabase (opcional)**
   Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

4. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

A aplicação abrirá em `http://localhost:5174`

## 📱 Como Usar

### Registrando um Gasto Conjunto

1. Na aba **Gastos**, clique em **"+ Novo Lançamento"**
2. Preencha os dados:
   - **Descrição** - Nome do item
   - **Pessoa** - Quem vai pagar
   - **Valor** - Valor total do gasto
   - **Parcelas** - Quantas parcelas (1-24)
   - **Data** - Quando começa
   - **Tipo** - Crédito (parcelado) ou Débito (à vista)
3. Clique em **"Salvar"**

### Fechando o Mês

1. Na aba **Gastos**, clique no botão ✓ no card da pessoa
2. Digite quanto a pessoa **pagou**
3. Clique em **"Tudo"** para preencher com o valor total
4. Veja o resumo:
   - Se pagou tudo → "Quitado"
   - Se pagou parcial → mostra quanto vai para Saldo Devedor
5. Clique em **"Fechar Mês"**

### Pagando uma Dívida

1. Na aba **Saldo Devedor**, clique no botão ➖ na dívida
2. Digite o valor que quer pagar
3. Clique em **"Tudo"** para pagar a dívida completa (opcional)
4. Adicione observação (opcional)
5. Clique em **"Confirmar Pagamento"**

### Registrando Gastos Pessoais

1. Na aba **Meus Gastos**, clique em **"+ Novo Lançamento"**
2. Preencha os dados:
   - **Descrição** - Nome do gasto
   - **Valor** - Valor do gasto
   - **Tipo** - Crédito ou Débito
   - **Categoria** - Pessoal ou Dividido
   - **Data** - Quando foi o gasto
3. Clique em **"Salvar"**

### Gerenciando Gastos Fixos

1. Na aba **Meus Gastos**, veja a seção "Gastos Fixos"
2. Use o botão **toggle** para habilitar/desabilitar cada gasto fixo
3. Os gastos fixos habilitados aparecem no topo da lista

### Desfazendo um Pagamento

1. Na dívida, clique em **"Ver histórico"**
2. Clique no botão ↩️ ao lado do pagamento
3. Confirme a reversão no modal
4. O valor volta para a dívida

### Filtrando Dívidas

**Por Status:**

- **Pendentes** - Dívidas ativas (mostradas por padrão)
- **Pagos** - Dívidas já quitadas (histórico)

**Por Pessoa:**

- Use o filtro "Filtrar por pessoa" para ver apenas de uma pessoa
- Clique em "Todos" para remover o filtro

## 🛠️ Tecnologias Utilizadas

- **React 18** - Biblioteca UI
- **Vite 5** - Build tool e dev server
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização (tema escuro)
- **Supabase** - Backend opcional
- **lucide-react** - Ícones
- **date-fns** - Manipulação de datas

## 📁 Estrutura do Projeto

```
src/
├── App.tsx                         # Componente principal com lógica
├── main.tsx                        # Entry point
├── index.css                       # Estilos globais
├── components/
│   ├── modals/                     # 8 componentes de modais
│   │   ├── FormGastoModal.tsx
│   │   ├── FormDividaModal.tsx
│   │   ├── FormMeuGastoModal.tsx
│   │   ├── PagamentoModal.tsx      # Novo: modal de pagamento de dívida
│   │   ├── PagamentoParcialModal.tsx
│   │   ├── ConfirmModal.tsx
│   │   ├── FeedbackModal.tsx
│   │   ├── ObservacaoModal.tsx
│   │   └── FecharMesModal.tsx
│   └── Tabs/                       # 3 componentes de abas
│       ├── TabGastos.tsx           # Aba de gastos conjuntos
│       ├── TabDividas.tsx          # Aba de saldo devedor
│       └── TabMeuGasto.tsx         # Aba de gastos pessoais
├── types/
│   └── index.ts                    # Tipos TypeScript
├── lib/
│   └── supabase.ts                 # Cliente Supabase
└── utils/
    └── calculations.ts             # Funções de cálculo
```

### Arquitetura

- **App.tsx**: Gerencia todo o estado e lógica da aplicação (~1,800 linhas)
- **Components/Tabs**: Componentes apresentacionais reutilizáveis
- **Components/Modals**: Modais isolados e reutilizáveis
- **Separação de preocupações**: Lógica em App.tsx, apresentação nos componentes

## 🎨 Design

- **Tema escuro** - Confortável para os olhos
- **Responsivo** - Funciona em mobile e desktop
- **Modais intuitivos** - Confirmações e feedbacks visuais
- **Ícones informativos** - Lucide icons para melhor UX
- **Componentes reutilizáveis** - Modais e abas bem estruturados

## 🔄 Melhorias Recentes (Refatoração)

A aplicação passou por uma refatoração completa para melhor organização e manutenibilidade:

### ✅ Componentes de Modais (8 total)

- `FormGastoModal` - Criar/editar gastos conjuntos
- `FormDividaModal` - Criar dívidas
- `FormMeuGastoModal` - Criar gastos pessoais
- `PagamentoModal` - **NOVO**: Registrar pagamentos de dívidas
- `PagamentoParcialModal` - Registrar pagamentos parciais antes de fechar mês
- `ConfirmModal` - Confirmações genéricas
- `FeedbackModal` - Mensagens de sucesso/info
- `ObservacaoModal` - Adicionar notas/observações
- `FecharMesModal` - Fechar mês com confirmação

### ✅ Componentes de Abas (3 total)

- `TabGastos` - Gastos conjuntos com navegação por mês (~520 linhas)
- `TabDividas` - Saldo devedor com histórico de pagamentos (~420 linhas)
- `TabMeuGasto` - Gastos pessoais com categorias e fixos (~530 linhas)

### 📊 Redução de Código

- **App.tsx**: Reduzido de 4,352 linhas para ~1,800 linhas (59% de redução)
- **Melhor legibilidade** - Componentes focados em uma responsabilidade
- **Mais reutilizável** - Componentes podem ser usados em outras partes

## 💾 Armazenamento

### Sem Supabase

- Dados salvos em **localStorage** do navegador
- Dados persistem após fechar o navegador

### Com Supabase

- Gastos salvos na tabela `gastos`
- Saldos devedores e pessoas em localStorage

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Opcional - Para usar Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Opcional - Para coletar Core Web Vitals em um endpoint seu
VITE_WEB_VITALS_ENDPOINT=https://seu-endpoint.com/web-vitals
```

### Segredo da Edge Function de Push

Para evitar chamadas públicas à função `send-push-notifications`, configure um segredo no Supabase:

```bash
supabase secrets set PUSH_CRON_SECRET="<seu-segredo-forte>"
```

Ao invocar a função (cron/manual), envie **um** dos headers abaixo:

- `Authorization: Bearer <seu-segredo-forte>`
- `x-cron-secret: <seu-segredo-forte>`

## ⚡ Performance em Produção

### Metas mínimas de Core Web Vitals

- **LCP <= 2500ms**
- **INP <= 200ms**
- **CLS <= 0.1**

### Como medir neste projeto

- O app registra **LCP**, **INP** e **CLS** automaticamente no cliente.
- Os valores são exibidos no console com o prefixo `[web-vitals]`.
- Se `VITE_WEB_VITALS_ENDPOINT` estiver configurado, os dados também são enviados via `sendBeacon/fetch`.

### Coleta no Supabase (produção)

1. Execute o SQL em `supabase_web_vitals.sql` no SQL Editor do Supabase.
2. Faça deploy da Edge Function:

```bash
supabase functions deploy collect-web-vitals
```

3. Configure a variável de ambiente no frontend:

```env
VITE_WEB_VITALS_ENDPOINT=https://<seu-projeto>.supabase.co/functions/v1/collect-web-vitals
```

4. Após deploy, acompanhe no banco:

```sql
select metric, page_path, value, rating, status, collected_at
from public.web_vitals_metrics
order by collected_at desc
limit 100;
```

### Lazy loading por rota

- As rotas principais foram migradas para `React.lazy` + `Suspense` em `src/App.tsx`.
- Isso reduz JS inicial sem separar React/Recharts em chunks manuais arriscados.

## 🧪 Testes E2E Visuais (Playwright)

Esta configuração abre navegador real e gera evidências visuais (screenshots, trace e relatório HTML).

### Rodar testes públicos (landing/login)

```bash
npm run test:e2e
```

### Rodar vendo o navegador

```bash
npm run test:e2e:headed
```

### Rodar no modo UI do Playwright

```bash
npm run test:e2e:ui
```

### Testar páginas internas autenticadas (opcional)

Defina credenciais válidas antes de executar:

```bash
export E2E_EMAIL="seu-email"
export E2E_PASSWORD="sua-senha"
npm run test:e2e:auth
```

Se `E2E_EMAIL` e `E2E_PASSWORD` não estiverem definidos, o teste autenticado é ignorado automaticamente.

### Ver relatório

Após executar os testes:

```bash
npx playwright show-report
```

Se não configurado, a app usa modo demo com localStorage.

## 📊 Dados de Demonstração

Quando sem Supabase, a app vem com dados de exemplo:

- iPhone 15 Pro (Pai) - 12 parcelas
- Geladeira (Mãe) - 10 parcelas
- Curso de Inglês (Mãe) - 6 parcelas
- TV 55" (Pai) - 5 parcelas
- Supermercado (Pai) - à vista

## 🧪 Scripts Disponíveis

```bash
# Inicia servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build local
npm run preview
```

## 📄 Licença

Este projeto é de uso pessoal.

## 👨‍💻 Autor

George - [GitHub](https://github.com/georgepxto)
