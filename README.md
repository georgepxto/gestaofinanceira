# Controle Financeiro Parcelado

Aplicação web para controle de finanças parceladas desenvolvida com React, Vite, Tailwind CSS e Supabase.

## 🚀 Tecnologias

- **React 18** - Biblioteca para interfaces
- **Vite** - Build tool e dev server
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework de CSS utilitário
- **Supabase** - Backend as a Service (banco de dados PostgreSQL)
- **date-fns** - Manipulação de datas
- **lucide-react** - Ícones

## 📋 Funcionalidades

- ✅ Cadastro de gastos parcelados
- ✅ Navegação entre meses (Anterior/Próximo)
- ✅ Cálculo dinâmico de parcelas ativas por mês
- ✅ Cards de resumo por pessoa
- ✅ Lista de lançamentos com indicador de parcela (ex: 2/4)
- ✅ Máscara monetária no input de valor
- ✅ Seletor de parcelas de 1x a 24x
- ✅ Diferenciação entre Crédito e Débito
- ✅ Interface Mobile-Friendly

## 🛠️ Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Execute o SQL do arquivo `supabase_schema.sql` no SQL Editor do Supabase
4. Copie a URL e a Anon Key do projeto (Settings > API)
5. Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

### 3. Executar em desenvolvimento

```bash
npm run dev
```

### 4. Build para produção

```bash
npm run build
```

## 📊 Estrutura do Banco de Dados

```sql
CREATE TABLE gastos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    pessoa VARCHAR(100) NOT NULL,
    valor_total DECIMAL(10, 2) NOT NULL,
    num_parcelas INTEGER NOT NULL DEFAULT 1,
    data_inicio DATE NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('credito', 'debito')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 📁 Estrutura de Pastas

```
src/
├── lib/
│   └── supabase.ts      # Cliente Supabase
├── types/
│   └── index.ts         # Interfaces TypeScript
├── utils/
│   └── calculations.ts  # Funções de cálculo de parcelas
├── App.tsx              # Componente principal
├── main.tsx             # Entry point
└── index.css            # Estilos globais + Tailwind
```

## 🧮 Lógica de Parcelas

A aplicação calcula dinamicamente quais parcelas estão ativas em determinado mês:

- **Exemplo**: Compra em Outubro/2023 em 5x aparece em:
  - Outubro/2023 (1/5)
  - Novembro/2023 (2/5)
  - Dezembro/2023 (3/5)
  - Janeiro/2024 (4/5)
  - Fevereiro/2024 (5/5)

A função `isGastoAtivoNoMes()` verifica se o mês de visualização está dentro do período de parcelas do gasto.

## 📱 Interface

- **Header**: Título + botão "Novo Gasto"
- **Navegação de Meses**: Botões Anterior/Próximo com nome do mês
- **Cards de Resumo**: Total do mês + total por pessoa
- **Lista de Lançamentos**: Descrição, tipo, parcela atual, valor
- **Modal de Formulário**: Form responsivo para novo lançamento

## 📄 Licença

MIT
