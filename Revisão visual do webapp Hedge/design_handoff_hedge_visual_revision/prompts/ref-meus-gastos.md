# Prompt para o Claude Code — Revisão visual: Meus Gastos + modal "Novo gasto" (Hedge)

> Cole no Claude Code na raiz de `gestaofinanceira/`.
> Referência visual: mock `Dashboard Hedge.dc.html` (tela "Meus Gastos" + modal). É design ref — recrie no app real, não copie o HTML.
> O **sistema visual completo** (tokens, fontes, regras) está em `prompt-claude-code-dashboard.md`. Aplique-o aqui também. Abaixo só o específico destas telas.

---

## Sistema (resumo)

- **Acento único: esmeralda** (`emerald-600` #059669 / `emerald-500` #10B981). Cor = significado, nunca decoração.
- **Semânticos:** `amber-500` (alerta/pausado/dívida), `red-500` (excluir/negativo). Nada de `blue/purple/pink/orange/green/teal/indigo`.
- **Neutros:** `zinc-*` (troque todo `gray-*`). Fundo `zinc-50`, cartões `white`, bordas `zinc-200`.
- **Tipografia:** títulos `font-display` (Syne); **todo valor R$/número** `font-mono tabular-nums` (Geist Mono); eyebrows `font-mono uppercase tracking-[0.18em] text-zinc-400`.

**Arquivos a editar:**
- `src/pages/EuPage.tsx`
- `src/components/Tabs/TabMeuGasto.tsx`
- `src/components/modals/FormMeuGastoModal.tsx`

**Não** toque na lógica/hooks/handlers — mudanças são visuais. Mantenha dark mode e `data-tour`.

---

## 1. EuPage.tsx (cabeçalho)

- Header: adicione eyebrow `font-mono uppercase tracking-[0.2em] text-emerald-600` "Meus Gastos · {mês}"; título `font-display font-bold` (`text-2xl`→`text-3xl`), `gray`→`zinc`. Ícone `User` roxo/emerald pode sair (ou `text-zinc-400`).
- Botão **"Pagar Fatura"**: hoje é `bg-purple-100 text-purple-700` → neutro-esmeralda: `bg-emerald-50 text-emerald-700 hover:bg-emerald-100` (dark equivalente). Sem roxo.
- Botão PDF: `gray`→`zinc`. Botão "Novo" já é `emerald-600` ✓ — só trocar `shadow-lg` por `shadow-sm` e manter.

## 2. TabMeuGasto.tsx

**2.1 Navegação de mês:** `gray`→`zinc`; título `font-display`; "Ir para hoje" `text-emerald-400`→`text-emerald-600`.

**2.2 Cards de resumo (Crédito/Débito/Pago/Fixos):** hoje 4 cards com ícones rainbow (`CreditCard` roxo, `Wallet` verde, `CheckCircle` emerald, `Repeat` âmbar). Reescreva como **uma faixa única** (um card, `grid grid-cols-4 divide-x divide-zinc-100`): cada coluna = label `font-mono text-[10px] uppercase tracking-wider text-zinc-400` + valor `font-mono text-2xl font-semibold`. Ícones: remova, ou deixe `text-zinc-400`. **"Pago"** em `text-emerald-700`. Demais em `text-zinc-900`.

**2.3 Filtros (chips):** remova as cores: Pessoal `blue-600`, Dividido `pink-600`, Dívida `orange-600`. Padrão único:
- Ativo: `bg-emerald-600 text-white`.
- Inativo: `bg-zinc-100 text-zinc-600 hover:bg-zinc-200` (dark: `zinc-800`).
Ícone do chip herda `currentColor`. Input de data: foco `focus:ring-emerald-500`, `gray`→`zinc`, valor `font-mono`; ícone `Calendar` `text-emerald-400`→`text-emerald-600`.

**2.4 Lista de Gastos Fixos:** 
- Ícone do item: crédito hoje `bg-purple-100 text-purple-600` → `bg-zinc-100 text-zinc-500`; débito `bg-emerald-100 text-emerald-600` ✓ (mantém).
- Badge "c/ pessoa": `bg-purple-100 text-purple-700` → neutro `bg-zinc-100 text-zinc-600`. Badge "Pausado"/"Inativo": âmbar/zinc (ok), troque o emoji ⏸ por texto "pausado" ou ícone `PauseCircle`.
- **Botões de ação:** hoje são chips preenchidos coloridos (editar `bg-blue-100`, excluir `bg-red-100`, etc.). Troque por **ícones fantasma**: base `text-zinc-400 hover:bg-zinc-100`; excluir `hover:bg-red-50 hover:text-red-600`; pausar `hover:bg-amber-50 hover:text-amber-600`; reativar/ativar `hover:bg-emerald-50 hover:text-emerald-700`. Sem `bg-*-100` fixo.
- Valor `font-mono`.

**2.5 Lista do mês (por dia):**
- Cabeçalho do dia: `text-emerald-400`→`text-emerald-600`, `font-mono uppercase tracking-wider`; hairline `bg-zinc-100`.
- Item: fundo `zinc-50`; **dívida** hoje `bg-orange-50 border-orange-200` → tom âmbar suave `bg-amber-50/60 border-amber-200` (sem borda-lateral colorida).
- Checkbox pago: pago `bg-emerald-100 text-emerald-600` ✓; não-pago `border-2 border-zinc-300` (dívida `border-amber-400`).
- Badges de tipo (Crédito/Débito): `purple`/`emerald` → **neutros** `bg-zinc-100 text-zinc-600 font-mono text-[10px]`. Badge dividido: `purple`→neutro. Badge "Dívida": âmbar (`bg-amber-100 text-amber-700`).
- Ações editar/excluir: ícones fantasma (como 2.4). Valor `font-mono`; pago = `text-zinc-400 line-through`.

## 3. FormMeuGastoModal.tsx — modal "Novo gasto" (inclui **fix de contraste**)

**3.1 Estrutura/estilo geral:** overlay `bg-black/45 backdrop-blur-sm`; dialog `rounded-2xl border-zinc-200`, `gray`→`zinc`. Header: eyebrow mono "Meus Gastos" + título `font-display font-bold` "Novo gasto"; X = ghost `text-zinc-400 hover:bg-zinc-100`. Inputs/selects: `bg-zinc-50 border-zinc-200`, foco **`focus:ring-emerald-500`** (unifique — hoje há `focus:ring-purple-500` e `focus:ring-teal-500`). Valor/parcelas/data em `font-mono`.

**3.2 ⚠ BUG DE CONTRASTE — corrigir:** os segmentados "Tipo de gasto" e "Forma de pagamento" usam, quando **selecionados**, `text-gray-900 dark:text-gray-100` sobre fundo colorido escuro (`bg-blue-600`, `bg-pink-600`, `bg-amber-600`, `bg-green-600`, `bg-purple-600`) → texto quase ilegível. 

Padrão correto para **todo** segmentado:
- Selecionado: `bg-emerald-600 border-emerald-600 text-white`.
- Não selecionado: `bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900` (dark: `zinc-800`).

Aplique em:
- Tipo de gasto: Pessoal (era `blue-600`) · Dividido (`pink-600`) · Fixo (`amber-600`) → todos ao padrão acima.
- Forma de pagamento: Débito (`green-600`) · Crédito (`purple-600`) → padrão acima.

**3.3 Outros no modal:**
- Pills "Dividido com" selecionadas: `bg-emerald-600 text-white`; disponíveis `bg-zinc-100 text-zinc-600 hover:bg-zinc-200`.
- Select "Cartão" com `focus:ring-purple-500` e "Conta" com `focus:ring-teal-500` → `focus:ring-emerald-500`.
- Botão submit: `bg-emerald-600 hover:bg-emerald-700 text-white` (garanta `text-white`, não `text-gray-900`).

---

## Critérios de aceite
- [ ] Nenhuma classe `blue/purple/pink/orange/green/teal/indigo` em EuPage, TabMeuGasto e FormMeuGastoModal.
- [ ] Chips e segmentados: selecionado = esmeralda + `text-white` (contraste AA); nenhum texto escuro sobre fundo colorido.
- [ ] `gray-*`→`zinc-*`; valores em `font-mono`; títulos `font-display`.
- [ ] Ações vira ícone fantasma (cor só no hover). Emojis removidos.
- [ ] Dark mode e lógica intactos.
