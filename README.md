# 💰 Gestão Financeira - Controle de Finanças Parceladas

Uma aplicação web moderna para controlar gastos parcelados e saldos devedores com múltiplos usuários. Construída com **React**, **Vite**, **TypeScript** e **Tailwind CSS**.

## 🎯 Características Principais

### 📊 Aba Gastos

- **Navegação por mês** - Veja os gastos de qualquer mês
- **Resumo mensal** - Total de gastos e por pessoa
- **Lançamentos com parcelas** - Registre gastos com até 24 parcelas
- **Tipos de gasto** - Crédito (parcelado) ou Débito (à vista)
- **Modo demo** - Funciona sem Supabase (dados em localStorage)

### 💳 Aba Saldo Devedor

- **Rastreamento de dívidas** - Mantenha controle de dívidas antigas
- **Histórico de pagamentos** - Veja todos os pagamentos realizados
- **Desfazer pagamentos** - Reverta pagamentos acidentais
- **Filtro por status** - Veja pendentes ou já quitados
- **Filtro por pessoa** - Filtre dívidas por usuário
- **Barra de progresso** - Visualize o andamento do pagamento

### ⏹️ Fechar Mês

- **Botão por pessoa** - Feche o mês de cada pessoa individualmente
- **Transferência automática** - Gastos não pagos viram saldo devedor
- **Confirmação visual** - Veja quanto fica de dívida antes de confirmar

### 👥 Gerenciamento de Pessoas

- **Pessoas dinâmicas** - Adicione pessoas além de "Pai" e "Mãe"
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
   Crie um arquivo `.env` na raiz do projeto:

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

### Registrando um Gasto

1. Clique em **"+ Novo Lançamento"**
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
2. Digite o valor pago (em centavos, ex: `10050` = R$ 100,50)
3. Adicione observação (opcional)
4. Clique em **"Confirmar Pagamento"**

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
├── App.tsx                    # Componente principal
├── main.tsx                   # Entry point
├── index.css                  # Estilos globais
├── types/
│   └── index.ts               # Tipos TypeScript
├── lib/
│   └── supabase.ts            # Cliente Supabase
└── utils/
    └── calculations.ts        # Funções de cálculo
```

## 🎨 Design

- **Tema escuro** - Confortável para os olhos
- **Responsivo** - Funciona em mobile e desktop
- **Modais intuitivos** - Confirmações e feedbacks visuais
- **Ícones informativos** - Lucide icons para melhor UX

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
```

Se não configurado, a app usa modo demo com localStorage.

## 📊 Dados de Demonstração

Quando sem Supabase, a app vem com dados de exemplo:

- iPhone 15 Pro (Pai) - 12 parcelas
- Geladeira (Mãe) - 10 parcelas
- Curso de Inglês (Mãe) - 6 parcelas
- TV 55" (Pai) - 5 parcelas
- Supermercado (Pai) - à vista

## 🐛 Troubleshooting

### "Nenhum lançamento para este mês"

- Verifique a data de início dos gastos
- Use o botão "Ir para hoje" para voltar ao mês atual

### Valor não aceita decimais

- Digite em centavos: `10050` = R$ 100,50

### Dados desaparecem ao fechar

- Verifique se localStorage está habilitado

## 📄 Licença

Este projeto é de uso pessoal.

## 👨‍💻 Autor

George Pinto - [GitHub](https://github.com/georgepxto)

---

**Desenvolvido com ❤️ para melhorar a gestão financeira em família**
