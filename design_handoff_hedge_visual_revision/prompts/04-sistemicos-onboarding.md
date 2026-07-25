# Prompt para o Claude Code — FASE 4: Sistêmicos & onboarding (Hedge)

> Cole no Claude Code na raiz de `gestaofinanceira/`.
> Alvo: `src/components/GuidedTourOverlay.tsx` (tour guiado) e `src/components/layout/NotificationBell.tsx` (sino).
> São os dois componentes que aparecem **sobre qualquer tela** — o tour é a primeira impressão de quem acaba de criar conta. Fases 1–3 já rodaram. Foco light + desktop. **Não altere lógica, props, posicionamento ou o cálculo do highlight** — é cor e tipografia.

---

## Sistema (referência: Dashboard)

- **Acento único: esmeralda** — `emerald-600` (#059669) primário, `emerald-500` (#10B981) detalhes.
- **Semânticos:** `red` = perigo · `amber` = alerta · `emerald` = positivo/marca. **Sem** `blue`.
- **Neutros:** `zinc`.
- **Tipografia:** título `font-display font-bold`; rótulo de passo/contador `font-mono`; corpo `font-sans`.

---

## 1. `GuidedTourOverlay.tsx` — está inteiro em azul

Ordem visual: o anel de destaque, a seta e o cabeçalho do tooltip são o que o usuário novo vê primeiro.

- **Anel de destaque** (`border-2 border-blue-300` + `boxShadow` azul):
  - `border-blue-300` → `border-emerald-300`.
  - `boxShadow: "0 0 0 2px rgba(96,165,250,0.55), 0 0 24px rgba(59,130,246,0.18)"` → esmeralda: `"0 0 0 2px rgba(52,211,153,0.55), 0 0 24px rgba(16,185,129,0.20)"`.
- **Seta do tooltip:** `borderTop`/`borderBottom` `12px solid #2563EB` → `#059669` (as duas ocorrências).
- **Container do tooltip:** `border-blue-200 dark:border-blue-900` → `border-zinc-200 dark:border-zinc-800`.
- **Cabeçalho:** `bg-blue-600 dark:bg-blue-700` → `bg-emerald-600 dark:bg-emerald-700`; borda inferior `border-blue-200 dark:border-blue-900` → `border-emerald-700/40`. Rótulo "{tutorialTitle} • Passo X de Y" `text-blue-50 dark:text-blue-100` → `text-emerald-50` **+ `font-mono text-[11px]`** (número em mono é assinatura da marca). Título → `font-display font-bold`. Botão X: `hover:bg-blue-700 dark:hover:bg-blue-800` → `hover:bg-emerald-700 dark:hover:bg-emerald-800`.
- **Chip do alvo** (`currentStep.alvo`): `bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-900` → `bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900`. Adicione `font-mono text-[10px] uppercase tracking-[0.14em]` — combina com os eyebrows do resto do app.
- **Barra de progresso (dots):** `bg-blue-500` (preenchido) → `bg-emerald-500`; vazio `bg-zinc-200 dark:bg-zinc-700` fica.
- **Botão "Próximo/Concluir":** `bg-blue-600 hover:bg-blue-700` → `bg-emerald-600 hover:bg-emerald-700`. Botão "Voltar" já é neutro ✓.

## 2. `NotificationBell.tsx` — só sobrou o "info" azul

O componente já está em zinc/amber/red. Só falta tirar o azul, que é o estado **informativo** — e info deve usar a cor da marca.

- **`AlertIcon`:** `PartyPopper` (parcela) `text-blue-600` → `text-emerald-600`; fallback `Info` `text-blue-500` → `text-emerald-600`. Os demais (amber/red) ficam.
- **Título do alerta:** o ramo `else` `text-blue-700 dark:text-blue-400` → `text-emerald-700 dark:text-emerald-400`.
- **Fundo do item info:** hoje `bg-transparent`; pode ficar transparente (correto — só danger/warning recebem tinta).
- **Contador do badge** (`{totalCount}`) e o `({totalCount})` no cabeçalho: adicionar `font-mono tabular-nums`.
- **Bug menor a corrigir:** no botão "Limpar tudo" a classe é `hover:text-zinc-600 dark:text-zinc-400` — o `dark:text-zinc-400` sem `hover:` anula o hover no dark. Corrija para `hover:text-zinc-600 dark:hover:text-zinc-300`.

---

## Verificação

```bash
# Nenhum azul nos dois componentes:
grep -nE "(bg|text|border|ring)-blue-[0-9]" \
  src/components/GuidedTourOverlay.tsx src/components/layout/NotificationBell.tsx
# VAZIO.

# Hex azuis do tour não devem sobrar:
grep -nE "2563EB|60A5FA|3B82F6|96,165,250|59,130,246" src/components/GuidedTourOverlay.tsx
# VAZIO.
```

Rode o tour do início (Dashboard) e abra o sino com alertas dos 3 tipos, em light e dark: anel, seta e cabeçalho em esmeralda; passo em mono; info em esmeralda; danger/warning inalterados.

## Critérios de aceite
- [ ] Zero `blue-*` e zero hex azul nos dois arquivos.
- [ ] Anel de destaque, seta, cabeçalho, chip, dots e CTA do tour em esmeralda.
- [ ] "Passo X de Y", chip do alvo e contadores em `font-mono`; título do tooltip em `font-display`.
- [ ] Alertas info em esmeralda; danger (red) e warning (amber) preservados.
- [ ] Hover do "Limpar tudo" corrigido no dark.
- [ ] Posicionamento/lógica do tour e do sino intactos; dark mode funcionando.
