# Prompt para o Claude Code — FASE 1: Base compartilhada (Hedge)

> Cole no Claude Code na raiz de `gestaofinanceira/`.
> Objetivo: matar o "cinza de IA" em todas as telas de uma vez, migrando os neutros para a marca e restilizando os primitivos compartilhados. **Não** redesenha telas — é só troca de tokens e primitivos. Foco: light + desktop, **sem quebrar o dark mode**.

---

## Contexto

O app já usa esmeralda como acento e `zinc` nas telas convertidas (Dashboard, Sidebar, Contas, Devedores…). Mas centenas de classes ainda usam o cinza genérico `gray-*` do Tailwind, e o `<body>` tem fundo `gray-100`. `gray` e `zinc` compartilham a MESMA escala numérica no Tailwind, então a troca é 1:1 e visualmente segura.

**NÃO altere:** `src/pages/LandingPage.tsx`, `src/components/Login.tsx`, `src/components/CursorDot.tsx` (landing e login ficam intactos por decisão do projeto).

---

## 1. Migração global `gray-*` → `zinc-*`

Em **todos os `.tsx` de `src/`, EXCETO** `LandingPage.tsx`, `Login.tsx` e `CursorDot.tsx`:

Substitua toda classe utilitária de cor cinza por zinc, preservando o prefixo (`dark:`, `hover:`, `focus:`, `disabled:`, `placeholder-`, etc.) e o número:

- `bg-gray-N` → `bg-zinc-N`
- `text-gray-N` → `text-zinc-N`
- `border-gray-N` → `border-zinc-N`
- `ring-gray-N` → `ring-zinc-N`
- `divide-gray-N` → `divide-zinc-N`
- `from-/via-/to-gray-N` → idem em zinc
- idem para os prefixados: `dark:bg-gray-800` → `dark:bg-zinc-800`, `hover:bg-gray-100` → `hover:bg-zinc-100`, `placeholder-gray-400` → `placeholder-zinc-400`, `disabled:bg-gray-300` → `disabled:bg-zinc-300`, etc.

Regra segura: troque a substring `gray-` por `zinc-` **apenas dentro de `className`** (não em nomes de variáveis, comentários ou strings de dados). Depois rode a verificação do item 5.

## 2. `src/index.css`

- **Body (light):** `background-color: #f3f4f6; /* gray-100 */` → `background-color: #FAFAFA; /* zinc-50 */`. Texto light: `#1f2937` → `#18181B` (zinc-900). **Não** toque nas regras `.dark body` / `#0B0F19`.
- **Scrollbar light:** track `#f3f4f6` → `#FAFAFA`; thumb `#d1d5db` → `#D4D4D8`; thumb hover `#9ca3af` → `#A1A1AA`.
- **Liquid glass (dark):** o bloco já mira tanto `.dark\:bg-gray-900` quanto `.dark\:bg-zinc-900` (e o mesmo para bordas/hover/sidebar/notification). Como a migração passa tudo para `zinc`, os seletores `gray` viram inertes — **pode removê-los**, deixando só as variantes `zinc`. Confira que cada regra tem a versão `zinc` antes de apagar a `gray` (todas têm). Isso mantém o vidro fosco do dark intacto.

## 3. Primitivos compartilhados (restilizar para zinc)

Já cobertos pela migração do item 1, mas confira o resultado nestes — são usados em toda tela:
- `src/components/ui/Skeleton.tsx` — `bg-gray-200` → `bg-zinc-200` (dark já é `white/[0.06]`).
- `src/components/ui/Toaster.tsx` — card, texto e botão de fechar em zinc.
- `src/components/ui/AsyncState.tsx` — ícone, título, descrição, botão e `colorClass` do empty em zinc.
- `src/components/layout/AppShellSkeleton.tsx` — `bg-gray-100` → `bg-zinc-50`; bordas/blocos em zinc.

## 4. Foco padrão → esmeralda (só os genéricos)

Onde o anel de foco é **neutro/genérico** e não comunica estado, unifique para esmeralda:
- `focus:ring-gray-*` / `focus:ring-zinc-*` (recém-migrado) em inputs e botões neutros → `focus:ring-emerald-500`.
- **Preserve** anéis semânticos: `focus:ring-red-500` em campos destrutivos (ex.: excluir conta no Configurações) fica como está.
- Não mexa ainda nos focos azul/roxo/teal dos modais/tabs — isso é Fase 2/3.

## 5. Verificação (rodar ao final)

```bash
# Não deve sobrar nenhum gray- fora de landing/login:
grep -rn "gray-" src --include=*.tsx | grep -v "LandingPage.tsx" | grep -v "Login.tsx" | grep -v "CursorDot.tsx"
# Deve retornar VAZIO.

# Body deve estar zinc:
grep -n "FAFAFA\|f3f4f6" src/index.css
```

Suba o app e confira **light e dark**: nenhuma tela deve ficar "sem fundo", o vidro fosco do dark continua, e os cards/skeletons agora têm o mesmo cinza-marca (zinc). Nada de layout deve mudar — só o tom dos neutros.

## Critérios de aceite
- [ ] Zero `gray-*` em `src/` (exceto landing/login/CursorDot).
- [ ] Body light = `zinc-50`; dark inalterado; vidro fosco do dark preservado.
- [ ] Skeleton, Toaster, AsyncState e AppShellSkeleton em zinc.
- [ ] Foco neutro = `ring-emerald-500`; foco de perigo (vermelho) preservado.
- [ ] Nenhuma mudança de layout — apenas tokens de cor.
