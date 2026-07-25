# Prompt para o Claude Code — FASE 3: Corpos de tela legados (Hedge)

> Cole no Claude Code na raiz de `gestaofinanceira/`.
> Alvo: as duas telas de **"Na Rua"** que ainda não foram convertidas — `src/components/Tabs/TabGastos.tsx` (Por mês) e `src/components/Tabs/TabDividas.tsx` (Em aberto).
> Fases 1 e 2 já rodaram. Foco light + desktop. **Não altere lógica, props, handlers ou `data-tour`** — é cor, tipografia e 4 bugs.

---

## Sistema (referência: Dashboard + FormMeuGastoModal)

- **Acento único: esmeralda.** `emerald-600` (#059669) primário, `emerald-500` barras/detalhes.
- **Semânticos:** `amber` = em aberto/alerta · `red` = excluir/negativo · `emerald` = pago/positivo. **Sem** `blue`, `purple`, `teal`, `orange`, `green`, `pink`.
- **Neutros:** `zinc`. Cartões `bg-white border-zinc-200 rounded-2xl shadow-sm`.
- **Tipografia:** títulos `font-display font-bold tracking-tight`; **todo valor R$/%/número** `font-mono tabular-nums`; eyebrow `font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400`.
- **Chip/segmentado:** ativo `bg-emerald-600 text-white` · inativo `bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900`.
- **Ações de item:** ícone fantasma `text-zinc-400`, cor só no hover (`hover:text-emerald-600`, excluir `hover:bg-red-50 hover:text-red-600`).

---

## ⚠ 4 bugs a corrigir junto (achados no código atual)

1. **Cadeia de hover quebrada pelo replace da Fase 1** — o padrão `hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-700` aparece em ~12 lugares nos dois arquivos. O `dark:bg-zinc-700` solto (sem `hover:`) força o fundo escuro **sempre**, matando o `dark:bg-zinc-800` do estado normal. Corrija para: `hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700`.
2. **`[color-scheme:dark]` fixo no input de data** (`TabGastos`, filtro por dia) — força o date-picker escuro **no light mode**. Troque por `dark:[color-scheme:dark]`.
3. **Texto escuro sobre fundo colorido/escuro** (contraste): em `TabGastos` os chips de tipo (`bg-amber-600 text-zinc-900` e `bg-teal-600 text-zinc-900`) e o botão "Limpar" (`bg-zinc-600 text-zinc-900`). Ao migrar para o padrão de chip, garanta `text-white` no ativo e `bg-zinc-100 text-zinc-600` no neutro.
4. **`divide-zinc-700` na lista de dívidas** (`TabDividas`, `<ul>`) — divisor escuro no light. Troque por `divide-zinc-200 dark:divide-zinc-800`.

---

## 1. `TabGastos.tsx` — "Por mês"

- **Navegação de mês:** "Ir para hoje" `text-blue-600 hover:text-blue-300` → `text-emerald-600 hover:text-emerald-700`. Título `capitalize` → adicionar `font-display`.
- **Card "Total do Mês":** label `text-sm text-blue-600` → eyebrow mono zinc-400 (padrão acima). Valor → `font-mono tabular-nums`. Contagem de lançamentos em `font-mono text-xs`.
- **Avatares por pessoa:** `CORES_CARDS[index % CORES_CARDS.length]` é arco-íris → use um só tom: `bg-emerald-50 text-emerald-700` (dark: `bg-emerald-950/30 text-emerald-400`). A pessoa se distingue pela inicial + nome, não pela cor.
- **Badges de estado:** "◉ Fechado" `bg-blue-50 text-blue-600 border-blue-200` → neutro `bg-zinc-100 text-zinc-600 border-zinc-200`. **Troque os glifos `◉` e `✓` por ícones Lucide** (`CircleDot`, `Check` — 11px) — glifo/emoji como ícone é marca de "cara de IA". "Quitado" continua emerald.
- **Bloco de pagamentos parciais:** já emerald ✓ — só passe os valores para `font-mono` e mantenha o "Falta:" em `amber-600`.
- **Filtros por devedor:** ativo `bg-blue-600` → `bg-emerald-600 text-white`; inativos ao padrão neutro.
- **Filtros por tipo:** "Todos" ativo `bg-zinc-200 text-zinc-900` → `bg-emerald-600 text-white`; Crédito `bg-amber-600 text-zinc-900` e Débito `bg-teal-600 text-zinc-900` → **ambos** ao padrão (ativo emerald + `text-white`) — ver bug 3. O ícone (`CreditCard`/`Banknote`) herda `currentColor`.
- **Input de dia:** `focus:ring-blue-500` → `focus:ring-emerald-500`; ícone `Calendar` `text-blue-600` → `text-emerald-600`; valor em `font-mono`; ver bug 2. Botão "Limpar" → chip neutro (`bg-zinc-100 text-zinc-600 hover:bg-zinc-200`).
- **Cabeçalho do dia:** ícone e texto `text-blue-600` → `text-emerald-600`, com `font-mono uppercase tracking-wider text-xs`. Hairline `bg-zinc-200`.
- **Badges do item:** Crédito `bg-purple-100 text-purple-800 border-purple-200` e Débito `bg-green-100 text-green-800 border-green-200` → **neutros** `bg-zinc-100 text-zinc-600 border-zinc-200 font-mono text-[10px]` (o ícone já diferencia). "Fixo" `bg-teal-100 text-teal-800 border-teal-200` → neutro igual. "Mensal" `text-teal-400` → `text-zinc-500`.
- **Valores do item:** parcela e total → `font-mono tabular-nums`.
- **Ações:** editar `hover:text-blue-600` → `hover:text-emerald-600`; excluir mantém `hover:text-red-600`. Ambos base `text-zinc-400`.

## 2. `TabDividas.tsx` — "Em aberto"

- **Card de total:** `text-orange-600 / dark:text-orange-400` → `text-amber-600 / dark:text-amber-400` (pendentes); quitado continua emerald. Valor `text-3xl font-bold` → `font-display font-extrabold` + `tabular-nums` (ou `font-mono` se preferir consistência com os outros números — escolha `font-mono` para valores de lista e `font-display` só para este número-herói). Link "Ver todos" `text-blue-600` → `text-emerald-600`.
- **Filtro de status (Pendentes/Pagos):** hoje ativo é `bg-orange-600` / `bg-green-600`. Faça um **segmentado único**: trilho `bg-zinc-100 p-1 rounded-xl`, botão ativo `bg-emerald-600 text-white`, inativo transparente `text-zinc-600 hover:bg-white`. Badge de contagem: no ativo `bg-white/25 text-white`, no inativo `bg-zinc-200 text-zinc-600`, sempre `font-mono`.
- **Filtro por pessoa:** chips `bg-orange-600`/`bg-green-600` → `bg-emerald-600 text-white` (ativo) e neutro (inativo). O valor entre parênteses em `font-mono`; no ativo use `text-white/70` (hoje é `text-orange-200`/`text-green-200`).
- **Cabeçalho da lista:** ícone `History text-orange-400` → `text-zinc-400`. Título → `font-display`. **Copy:** o título é fixo "Cobranças em Aberto" mesmo quando o filtro está em *Pagos* — torne condicional ("Cobranças em Aberto" / "Cobranças Quitadas").
- **Badge da pessoa no item:** `bg-orange-50 text-orange-600 border-orange-200` → neutro `bg-zinc-100 text-zinc-600 border-zinc-200`. Badge "✓ Quitado": troque o glifo `✓` por `<Check className="w-3 h-3" />`, mantendo emerald.
- **Original / Criado em:** em `font-mono text-xs text-zinc-400`.
- **Barra de progresso:** `bg-green-500` → `bg-emerald-500`; trilho `bg-zinc-100 dark:bg-zinc-800`. Números "Pago / %" em `font-mono`.
- **Histórico:** `summary` em `font-mono text-xs text-zinc-400`; valores já emerald ✓ → `font-mono`; botão desfazer `hover:text-orange-400` → `hover:text-amber-600`.
- **Valor restante:** `text-orange-400` → `text-amber-600` (o 400 não passa contraste em fundo branco); quitado `text-emerald-700`. Ambos `font-mono`. Label "restante" em `font-mono text-[10px] text-zinc-400`.
- **Ações:** "Registrar pagamento" `bg-green-600 hover:bg-green-700` → `bg-emerald-600 hover:bg-emerald-700` (pode virar botão com rótulo "Pagamento", como no mock). Excluir → ícone fantasma `text-zinc-400 hover:bg-red-50 hover:text-red-600`. "Limpar filtro" `text-orange-500` → `text-emerald-600`.
- **Lista `<ul>`:** ver bug 4.

---

## Verificação

```bash
# Nenhum acento fora do sistema nas duas telas:
grep -nE "(bg|text|border|ring|divide)-(blue|purple|indigo|violet|teal|orange|green|pink)-[0-9]" \
  src/components/Tabs/TabGastos.tsx src/components/Tabs/TabDividas.tsx
# VAZIO (amber/red/emerald/zinc são permitidos).

# Cadeia de hover quebrada não deve existir:
grep -rn "hover:bg-zinc-200 dark:bg-zinc-700" src/components/Tabs   # VAZIO

# color-scheme não deve ser fixo:
grep -rn "\[color-scheme:dark\]" src/components/Tabs   # só com prefixo dark:
```

## Critérios de aceite
- [ ] Zero `blue/purple/teal/orange/green/pink` nas duas telas.
- [ ] Chips/segmentados: ativo `bg-emerald-600 text-white`; nenhum texto escuro sobre fundo colorido ou `zinc-600`.
- [ ] Avatares em tom único (sem `CORES_CARDS`); nenhum glifo `◉`/`✓` como ícone (só Lucide).
- [ ] Todo valor em `font-mono tabular-nums`; títulos em `font-display`.
- [ ] Os 4 bugs corrigidos (hover chain, color-scheme, contraste, divide-zinc-700).
- [ ] Título da lista de dívidas muda entre Aberto/Quitadas.
- [ ] Lógica, props e `data-tour` intactos; dark mode funcionando.
