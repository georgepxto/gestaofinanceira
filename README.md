# Hedge — Controlador Financeiro Pessoal e Colaborativo

Hedge registra gastos pessoais, divide contas entre amigos com rastreio de quem pagou, gerencia cartões de crédito, contas bancárias e metas de gasto, e entrega dashboards e relatórios em PDF. Construído com **React**, **Vite**, **TypeScript**, **Tailwind CSS** e **Supabase**.

> Ver [`PRODUCT.md`](PRODUCT.md) para o produto (público-alvo, princípios de design, tom de voz).

## 🎯 Funcionalidades

### 📊 Dashboard
Visão geral do mês: saldo, gastos por categoria, evolução, alertas (parcelas acabando, gasto fora do padrão).

### 💰 Orçamento
- **Lançamentos** — gastos pessoais, crédito ou débito, parcelados em até 24x, com categorias personalizáveis.
- **Gastos fixos** — despesas recorrentes, com toggle de habilitar/desabilitar.
- **Metas de gasto** — limite mensal por categoria, comparado ao realizado.

### 🤝 A Receber
- **Pessoas** — cadastro de quem divide gastos com você.
- **Gastos Compartilhados (por mês)** — lançamentos parcelados divididos entre pessoas, com fechamento de mês por pessoa (o que não foi pago vira saldo devedor).
- **Saldo Devedor (em aberto)** — dívidas em aberto, histórico de pagamentos (inclusive parciais), reversão de pagamento, filtro por status e por pessoa.

### 💳 Carteira
- **Contas bancárias** — saldo por conta, histórico.
- **Cartões de crédito** — fatura por cartão, limite consolidado, transações por categoria.

### ⚙️ Configurações
- **Categorias personalizáveis** — cada usuário cria, renomeia e exclui suas próprias categorias de gasto e receita; renomear/excluir propaga para os lançamentos já gravados.
- **Tema claro/escuro**.
- **Exportar para PDF**.
- **Notificações push**.
- **Exclusão de conta** — apaga a conta e todos os dados associados.

### 🔐 Admin
Papéis de usuário e feature flags por conta (habilitar/desabilitar abas individualmente por usuário).

## 🛠️ Tecnologias Utilizadas

- **React 18** + **React Router 7** — UI e navegação por rotas
- **Vite 5** — build tool e dev server
- **TypeScript** — tipagem estática
- **Tailwind CSS** — estilização (`Syne` para títulos, `Geist Mono` para valores, `Switzer` para corpo — ver `design_handoff_hedge_visual_revision/`)
- **Supabase** — banco de dados, autenticação e Row Level Security (**obrigatório**, ver abaixo)
- **Recharts** — gráficos do Dashboard
- **jsPDF** — exportação de relatórios em PDF
- **lucide-react** — ícones
- **date-fns** — manipulação de datas
- **web-vitals** — Core Web Vitals no cliente
- **Playwright** — testes E2E visuais

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+
- npm
- Um projeto Supabase (o app **não funciona sem ele** — ver [Banco de dados](#-banco-de-dados))

### Passos

1. **Clone o repositório**

```bash
git clone https://github.com/georgepxto/gestaofinanceira.git
cd gestaofinanceira
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure o Supabase**
   Copie `.env.local.example` para `.env.local` e preencha:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

Sem essas duas variáveis o app exibe a tela "Configuração Necessária" e não carrega — não há mais modo demo/localStorage.

4. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

## 🗄️ Banco de dados

O Supabase é obrigatório: autenticação, dados e Row Level Security (cada usuário só vê o que é seu) vivem lá.

- **`supabase_schema.sql`** — schema principal (gastos, pessoas, saldos devedores, meus gastos, contas bancárias, cartões, categorias personalizadas, etc.).
- **`supabase_admin_schema.sql`**, **`supabase_admin_v2.sql`** — papéis de usuário e feature flags (usados pelo Admin).
- **`supabase_web_vitals.sql`** — tabela de Core Web Vitals (opcional, ver [Performance](#-performance-em-produção)).
- **`supabase/migrations/`** — migrations incrementais mais recentes, aplicadas por cima do schema acima.

> ⚠️ **Conhecido:** o schema ainda está espalhado entre esses arquivos soltos na raiz e a pasta `supabase/migrations/`, sem um fluxo único de setup. Ao provisionar um projeto novo, rode os arquivos na raiz primeiro (nas versões `_v2`/`fix_*` mais recentes) e depois as migrations em ordem cronológica pelo nome do arquivo. Consolidar isso em um histórico de migrations único é uma pendência conhecida.

### Segredo da Edge Function de Push

Para evitar chamadas públicas à função `send-push-notifications`, configure um segredo no Supabase:

```bash
supabase secrets set PUSH_CRON_SECRET="<seu-segredo-forte>"
```

Ao invocar a função (cron/manual), envie **um** dos headers abaixo:

- `Authorization: Bearer <seu-segredo-forte>`
- `x-cron-secret: <seu-segredo-forte>`

## 📁 Estrutura do Projeto

```
src/
├── App.tsx                  # Rotas, portões de auth/feature-flags, boot splash
├── main.tsx                 # Entry point
├── index.css                # Estilos globais e tokens de design
├── context/
│   └── AppContext.tsx       # Estado compartilhado (mês em visualização, pessoas, modais)
├── hooks/                   # Um hook por domínio (useGastos, useMeusGastos,
│                             # useCategorias, useCartoes, useContasBancarias,
│                             # useSaldosDevedores, useFeatureFlags, useAuth, ...)
├── lib/
│   └── supabase.ts          # Cliente Supabase + funções de acesso a dados por domínio
├── pages/                   # Uma página por rota (DashboardPage, GastosPage,
│                             # MetasPage, DividasPage, PessoasPage,
│                             # ContasBancariasPage, CartoesCreditoPage,
│                             # ConfiguracoesPage, AdminPage, ...)
├── components/
│   ├── modals/               # Modais de formulário e confirmação
│   ├── Tabs/                 # Componentes de abas legadas (gastos/dívidas/meus gastos)
│   ├── layout/                # Sidebar, Layout, NotificationBell, BootSplash
│   └── ui/                    # Primitivos (Card, Toaster, AsyncState, Valor, PageHeader, ...)
├── types/
│   └── index.ts              # Tipos TypeScript
└── utils/                   # Cálculos, categorias, PDF, formatação
```

### Arquitetura

- **Roteamento por página**, agrupado em 4 abas-mãe com sub-navegação: Dashboard · Orçamento · A Receber · Carteira.
- **Estado por domínio em hooks**, não em um componente central — cada página consome os hooks de que precisa.
- **`AppContext`** guarda apenas o que é realmente compartilhado entre páginas (mês em visualização, lista de pessoas, modais globais).
- **Feature flags por usuário** controlam quais rotas existem para cada conta (`useFeatureFlags`), geridas no Admin.

## 🎨 Design

Sistema de design com um único acento (`emerald`), paleta `zinc`, tipografia `Syne`/`Geist Mono`/`Switzer` e suporte completo a modo claro/escuro. Documentado em detalhe em [`design_handoff_hedge_visual_revision/README.md`](design_handoff_hedge_visual_revision/README.md).

Um script de guarda (`npm run check:ds`, rodado no `prebuild` e no CI) varre o código em busca de violações do sistema visual (cores fora da paleta, texto sem par `dark:`, etc.).

## ⚡ Performance em Produção

### Metas mínimas de Core Web Vitals

- **LCP <= 2500ms**
- **INP <= 200ms**
- **CLS <= 0.1**

### Como medir neste projeto

- O app registra **LCP**, **INP** e **CLS** automaticamente no cliente.
- Os valores são exibidos no console com o prefixo `[web-vitals]`.
- Se `VITE_WEB_VITALS_ENDPOINT` estiver configurado, os dados também são enviados via `sendBeacon/fetch`.

```env
# Opcional — para coletar Core Web Vitals em um endpoint seu
VITE_WEB_VITALS_ENDPOINT=https://seu-endpoint.com/web-vitals
```

### Coleta no Supabase (produção)

1. Execute o SQL em `supabase_web_vitals.sql` no SQL Editor do Supabase.
2. Faça deploy da Edge Function:

```bash
supabase functions deploy collect-web-vitals
```

3. Configure `VITE_WEB_VITALS_ENDPOINT` apontando para a function:

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

As rotas principais usam `React.lazy` + `Suspense` em `src/App.tsx`. `Layout` e `DashboardPage` (a casca e a rota de entrada de todo mundo) são pré-carregados assim que o boot começa, para que download e verificação de sessão corram em paralelo.

## 🧪 Scripts Disponíveis

```bash
npm run dev            # Servidor de desenvolvimento
npm run build          # Checagem de tipos + guarda de design + build de produção
npm run lint           # ESLint
npm run preview        # Preview do build local
npm run check:ds       # Guarda do sistema visual (roda sozinho, sem build)

npm run test:e2e       # Testes E2E (Playwright) — landing e login
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:auth  # Requer E2E_EMAIL e E2E_PASSWORD no ambiente
```

## 🧪 Testes E2E Visuais (Playwright)

Abre navegador real e gera evidências visuais (screenshots, trace e relatório HTML).

Para testar páginas internas autenticadas, defina credenciais válidas antes de executar:

```bash
export E2E_EMAIL="seu-email"
export E2E_PASSWORD="sua-senha"
npm run test:e2e:auth
```

Se `E2E_EMAIL` e `E2E_PASSWORD` não estiverem definidos, o teste autenticado é ignorado automaticamente.

Ver relatório após executar os testes:

```bash
npx playwright show-report
```

> Não há suíte de testes unitários no momento — a cobertura automatizada é só E2E (Playwright) + checagem de tipos (`tsc`) + guarda de design (`check:ds`).

## 📄 Licença

Este projeto é de uso pessoal.

## 👨‍💻 Autor

George - [GitHub](https://github.com/georgepxto)
