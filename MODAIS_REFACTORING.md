# Estrutura de Separação de Modais

A partir de agora, os componentes modais foram separados em arquivos individuais para melhor organização e manutenibilidade do projeto.

## Novos Arquivos Criados

### `/src/types/extended.ts`

Tipos customizados específicos da aplicação:

- `PagamentoParcial` - Interface para pagamentos parciais
- `AbaAtiva` - Type para as três abas (gastos, dividas, eu)
- `ModalFeedback` - Interface para modal de feedback
- `ModalConfirm` - Interface para modal de confirmação

### `/src/utils/constants.ts`

Constantes usadas em toda a aplicação:

- `PARCELAS_OPTIONS` - Array de opções de parcelas (1-24)
- `CORES_CARDS` - Array de cores para cards de resumo

### `/src/components/modals/`

Pasta com todos os componentes de modais separados:

#### Modais de Formulário

- **FormGastoModal.tsx** - Modal para adicionar/editar gastos (crédito/débito)
- **FormDividaModal.tsx** - Modal para adicionar dívidas pendentes
- **FormMeuGastoModal.tsx** - Modal para adicionar/editar gastos pessoais

#### Modais de Ação

- **PagamentoModal.tsx** - Modal inline para registrar pagamento de dívida
- **PagamentoParcialModal.tsx** - Modal para pagamento parcial do mês
- **FecharMesModal.tsx** - Modal para fechar mês com resumo
- **ObservacaoModal.tsx** - Modal para adicionar observações por pessoa/mês

#### Modais de Feedback

- **ConfirmModal.tsx** - Modal de confirmação para exclusões
- **FeedbackModal.tsx** - Modal de feedback (sucesso/info)

#### Arquivo de Índice

- **index.ts** - Reexporta todos os modais para fácil importação

## Como Usar

### Antes (App.tsx monolítico)

```tsx
// Tudo em um arquivo gigante
```

### Agora (Modular)

```tsx
import {
  FormGastoModal,
  FormDividaModal,
  ConfirmModal,
  FeedbackModal,
} from "@/components/modals";
```

## Estrutura de Diretórios

```
src/
├── components/
│   ├── Login.tsx
│   └── modals/
│       ├── FormGastoModal.tsx
│       ├── FormDividaModal.tsx
│       ├── FormMeuGastoModal.tsx
│       ├── PagamentoModal.tsx
│       ├── PagamentoParcialModal.tsx
│       ├── FecharMesModal.tsx
│       ├── ObservacaoModal.tsx
│       ├── ConfirmModal.tsx
│       ├── FeedbackModal.tsx
│       └── index.ts
├── types/
│   ├── index.ts (original)
│   └── extended.ts (novo)
├── utils/
│   ├── calculations.ts
│   └── constants.ts (novo)
├── App.tsx (ainda com toda lógica)
└── ...
```

## Benefícios

✅ **Melhor Organização** - Cada modal em seu próprio arquivo
✅ **Fácil Manutenção** - Modificar um modal não afeta outros
✅ **Reutilização** - Modais podem ser importados em outros componentes
✅ **Escalabilidade** - Pronto para crescer com novos modais
✅ **Sem Mudanças Funcionais** - O App.tsx continua idêntico em comportamento

## Próximas Etapas (Opcional)

Se quiser refatorar ainda mais (extrair hooks, separar abas em componentes), é possível:

- Criar hooks customizados para cada lógica de estado
- Separar as três abas (gastos, dívidas, eu) em componentes
- Extrair lógica de API para serviços separados
- Dividir App.tsx em componentes menores

## Nota Importante

O App.tsx continua funcionando exatamente como antes. Nenhuma funcionalidade foi alterada, apenas organização de arquivos. Se desejar usar os novos modais modulares no App.tsx, você precisaria:

1. Importar os modais do novo caminho
2. Passar as props necessárias
3. Remover o código de renderização dos modais inline

Porém, isso não é necessário neste momento. Os modais continuam funcionando como estavam.
