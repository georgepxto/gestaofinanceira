# Prompt para o Claude Code — FASE 2: Modais (Hedge)

> Cole no Claude Code na raiz de `gestaofinanceira/`.
> Objetivo: tirar o arco-íris e o cinza cru dos modais, alinhando todos ao **modal-referência já pronto** (`FormMeuGastoModal.tsx`). Fase 1 (gray→zinc) já rodou — aqui é sobre **acentos e estados**. Foco light + desktop, sem quebrar dark mode nem a lógica.

---

## Padrão-referência (copie destes tokens — de `FormMeuGastoModal.tsx`)

- **Overlay:** `fixed inset-0 bg-black/45 backdrop-blur-sm z-modal flex items-center justify-center`.
- **Dialog:** `bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800`.
- **Cabeçalho:** eyebrow `font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400` + título `font-display text-lg font-bold text-zinc-900 dark:text-zinc-100`. Botão X = fantasma `text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600`.
- **Inputs/selects:** `bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 outline-none`. Valores em R$/número: adicionar `font-mono tabular-nums`.
- **Segmentado (chips de escolha):**
  - Selecionado: `bg-emerald-600 border-emerald-600 text-white`.
  - Não selecionado: `bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900`.
- **Botão primário:** `bg-emerald-600 hover:bg-emerald-700 text-white`; loading: `bg-zinc-200 text-zinc-500`.
- **Erro:** `bg-red-100 border border-red-500/50 text-red-600`.

Regra de cor: **um acento (esmeralda)**; `red` = perigo/negativo; `amber` = alerta/pendente. Elimine `blue`, `purple`, `indigo`, `teal`, `orange`, `green` (troque `green-*` por `emerald-*`).

---

## Ordem e o que fazer em cada arquivo

### 1. `ConfirmModal.tsx` — primeiro (compartilhado por vários fluxos)
- `COLOR_MAP` hoje tem `blue`, `indigo`, `purple`. Um modal de confirmação só precisa de **3 semânticos**: `red` (excluir/perigo), `emerald` (confirmar/positivo), `amber` (alerta). Reduza o mapa a esses três e mapeie os antigos: `blue`/`indigo`/`purple` → `amber` (aviso) ou `emerald` (ação positiva), conforme o uso real de cada chamada.
- **Bug latente:** a classe `focus:ring-${color}-500/50` é montada dinamicamente — o Tailwind JIT não gera classe interpolada, então o anel some. Troque por anel estático: `focus:ring-2 focus:ring-emerald-500/50` (ou `focus:ring-red-500/50` quando `color==='red'`, via condição, não interpolação).
- A faixa colorida do topo (`h-2 w-full ${colors.bg}`) pode ficar — só garanta que só usa as 3 cores semânticas.

### 2. `FormGastoModal.tsx` (Novo empréstimo) + `FormDividaModal.tsx` (Nova dívida)
Aplicar o padrão-referência inteiro. Pontos específicos:
- **Segmentados** (tipo de gasto / forma de pagamento): hoje Pessoal=azul, Dividido=rosa, Fixo=âmbar, Débito=verde, Crédito=roxo. Todos → padrão emerald/zinc acima. **Corrija o contraste**: selecionado precisa ser `text-white` (havia texto escuro sobre fundo colorido — ilegível).
- **Foco** dos inputs: `focus:ring-purple-500` / `focus:ring-teal-500` / `focus:ring-blue-500` / `focus:ring-orange-500` → `focus:ring-emerald-500`.
- **Toggle "Gasto fixo mensal"** (`FormGasto`): `bg-teal-500` (ligado) → `bg-emerald-600`; desligado `bg-zinc-400`. Dica `text-teal-400` → `text-zinc-500`.
- **FormDivida**: a caixa de aviso `bg-orange-900/30 border-orange-200 text-orange-600` e o ícone `Clock text-orange-400` → âmbar (`bg-amber-50 border-amber-200 text-amber-700`, ícone `text-amber-500`). Foco e botão laranja → emerald.
- **Botão salvar**: `bg-blue-600`/`bg-orange-600` → `bg-emerald-600 hover:bg-emerald-700`.
- Valores/parcelas/data → `font-mono tabular-nums`.

### 3. Modais menores (passe sistemático)
- `PagamentoModal.tsx`: `focus:ring-green-500` → `emerald`; botão `bg-blue-600` → `bg-emerald-600 hover:bg-emerald-700`.
- `PagamentoParcialModal.tsx`: `focus:ring-green-500` → `emerald`; botão de confirmar → emerald.
- `FecharMesModal.tsx`: caixa/《texto laranja》→ âmbar; `focus:ring-green-500` → emerald; botão confirmar → emerald.
- `ObservacaoModal.tsx`: `focus:ring-yellow-500` → `emerald`; botão salvar → emerald.
- `FeedbackModal.tsx`: para `tipo` **info**, `bg-blue-100 text-blue-600` e botão `bg-blue-600` → emerald (marca); **success** = emerald, **error** = red (preservar). Ícone idem.
- `SuspensaoModal.tsx`: já usa `focus:ring-emerald-500` e zinc — só confira que não sobrou nada azul/verde.

---

## Verificação (rodar ao final)

```bash
# Nenhum acento fora do sistema nos modais:
grep -rnE "(bg|text|border|ring|from|to|via)-(blue|purple|indigo|violet|teal|orange|green|pink)-[0-9]" src/components/modals
# Deve retornar VAZIO (amber/red/emerald são permitidos).

# Anel dinâmico não deve existir mais:
grep -rn "ring-\${" src/components/modals   # VAZIO
```

Abra cada modal no app (light e dark): título em display, valores em mono, chips selecionados em esmeralda com **texto branco**, foco esmeralda. Nada de layout deve mudar — só cor, tipografia dos valores e o fix de contraste.

## Critérios de aceite
- [ ] Zero `blue/purple/indigo/teal/orange/green/pink` em `src/components/modals`.
- [ ] Segmentado selecionado = `bg-emerald-600 text-white` (contraste AA); nenhum texto escuro sobre fundo colorido.
- [ ] ConfirmModal com 3 cores semânticas (red/emerald/amber) e anel de foco estático (bug corrigido).
- [ ] Valores em `font-mono tabular-nums`; títulos em `font-display`.
- [ ] Dark mode e toda a lógica dos modais intactos.
