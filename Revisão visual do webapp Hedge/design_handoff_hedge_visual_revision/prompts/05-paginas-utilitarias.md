# Prompt para o Claude Code — FASE 5: Páginas utilitárias (Hedge)

> Cole no Claude Code na raiz de `gestaofinanceira/`.
> Alvo: `src/pages/ResetPasswordPage.tsx`, `src/pages/ConfiguracoesPage.tsx`, `src/pages/AdminPage.tsx`.
> Fases 1–4 já rodaram. Foco light + desktop. **Não altere lógica, queries, handlers ou nomes de props** — é cor, tipografia e 3 bugs.

---

## Sistema (referência: Dashboard + Login)

- **Acento único: esmeralda** — `emerald-600` (#059669) primário, `emerald-500` detalhes.
- **Semânticos:** `red` = perigo/destrutivo · `amber` = alerta/inativo · `emerald` = positivo/marca. **Sem** `blue`, `indigo`, `purple`, `orange`.
- **Neutros:** `zinc`. Cartões `bg-white border-zinc-200 rounded-2xl shadow-sm`.
- **Tipografia:** títulos `font-display font-bold tracking-tight`; **todo número/contagem/data** `font-mono tabular-nums`; eyebrow `font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400`.
- **Foco:** `focus:ring-emerald-500` (exceto campos destrutivos, que ficam `red`).

---

## ⚠ 3 bugs a corrigir junto

1. **`ResetPasswordPage` — degradê azul→verde** no botão de submit: `bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700`. Degradê chamativo em botão é assinatura de template gerado por IA, **e** essa página é irmã do Login (que usa esmeralda sólido). Troque por `bg-emerald-600 hover:bg-emerald-700`.
2. **`ConfiguracoesPage` — toggle de tema com cor inline e foco azul**: `style={{ backgroundColor: theme === "dark" ? "#3B82F6" : "#D1D5DB" }}` + `focus:ring-blue-500`. Troque o inline por classes (`bg-emerald-600` ligado / `bg-zinc-300 dark:bg-zinc-600` desligado) e o foco por `focus:ring-emerald-500`. Além disso o botão **não expõe estado a leitores de tela** — adicione `role="switch"` + `aria-checked={theme === "dark"}` + `aria-label="Alternar tema"`.
3. **`AdminPage` — emoji como ícone**: o mapa `ACTION_LABELS` usa `🟢 ⚪ 🟡 🔴 🔵` no campo `icon`, renderizados em `<LogRow>` (`<span className="text-base">{actionInfo.icon}</span>`), e há um `🎉` no empty state de inativos. Troque por **dots monocromáticos ou ícones Lucide** (ver item 3 abaixo) e remova o `🎉`.

---

## 1. `ResetPasswordPage.tsx`

- **Botão de submit:** ver bug 1 → `bg-emerald-600 hover:bg-emerald-700`.
- **Foco dos dois inputs de senha:** `focus:ring-blue-500` → `focus:ring-emerald-500` (2 ocorrências).
- **Fundo da página:** `bg-zinc-100` → `bg-zinc-50` (alinha com o resto do app; dark `#0B0F19` fica).
- **Título "Atualizar Senha":** `text-2xl font-bold` → adicionar `font-display tracking-tight`.
- **Botão "Voltar para o App":** `text-zinc-400 hover:text-zinc-200` — no light o hover fica **mais claro** que o normal (invisível). Corrija para `text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200`.

## 2. `ConfiguracoesPage.tsx`

- **Cabeçalho da página:** hoje é ícone + `<h1>` solto. **Adote o `PageHeader`** usado pelas abas-mãe (com o risco `Pista`), para Configurações não parecer uma tela de outro app. Título "Configurações" com uma palavra em destaque, como nas outras.
- **Seção Aparência:** ícone `Moon` `text-blue-500` → `text-zinc-400` (decorativo; o `Sun` amber pode ficar como sinal de estado ou virar zinc — prefira `text-zinc-400` para ambos e deixe a cor só no toggle). Toggle: ver bug 2. O `Moon` dentro do knob: `text-blue-600` → `text-emerald-600`.
- **Seção Perfil:** ícone `User` `text-blue-500` → `text-zinc-400`. Input de nome: `focus:ring-blue-500 focus:border-blue-500` → `emerald`. Botão "Salvar": `bg-blue-600 hover:bg-blue-700` → `bg-emerald-600 hover:bg-emerald-700`.
- **Zona de Perigo — "Resetar Conta":** todo o laranja → **âmbar** (`bg-amber-50 dark:bg-amber-950/30`, `border-amber-300 dark:border-amber-800`, `text-amber-700 dark:text-amber-400`); botão "Confirmar" `bg-orange-600 hover:bg-orange-700` → `bg-amber-600 hover:bg-amber-700`; input `focus:ring-orange-500 focus:border-orange-500` → `focus:ring-amber-500`; o `<strong>RESETAR</strong>` → `text-amber-700 dark:text-amber-400` **+ `font-mono`** (é uma palavra que o usuário digita literalmente).
- **"Excluir Conta":** já em vermelho ✓ — só coloque o `<strong>EXCLUIR</strong>` e o placeholder em `font-mono` (mesma razão) e mantenha `focus:ring-red-500`.
- **Títulos de seção** (`h2`/`h3`): adicionar `font-display`.

## 3. `AdminPage.tsx` — a tela mais "AI slop" hoje

É ferramenta interna: deve ser a **mais sóbria** do app — zinc + esmeralda, sem paleta decorativa.

- **Índigo → zinc/esmeralda** (é a cor dominante da tela, ~15 ocorrências):
  - Header: avatar `bg-indigo-100 dark:bg-indigo-950/30` + `Shield text-indigo-600` → `bg-zinc-100 dark:bg-zinc-800` + `text-zinc-500`.
  - **Tabs** (Usuários/Dashboard/Inativos/Atividade): ativo `bg-indigo-100 text-indigo-700` → `bg-emerald-600 text-white` (padrão de segmentado do app); inativo fica neutro.
  - **Filtros de status** e **filtros de log**: ativo `bg-indigo-100 text-indigo-700` → `bg-emerald-600 text-white`.
  - Busca: `focus:ring-indigo-500 focus:border-indigo-500` → `emerald`.
  - Badge "Admin": `bg-indigo-100 text-indigo-700` → `bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`.
  - Avatar de admin na lista: `bg-indigo-100` + `Shield text-indigo-600` → `bg-zinc-100` + `text-zinc-500`.
  - Spinners `text-indigo-500` → `text-emerald-600` (3 ocorrências).
  - Botão "Salvar Alterações": `bg-indigo-600 hover:bg-indigo-700` → `bg-emerald-600 hover:bg-emerald-700`.
  - Barras do gráfico de logins: `bg-indigo-500 dark:bg-indigo-400 hover:bg-indigo-600` → `bg-emerald-500 dark:bg-emerald-400 hover:bg-emerald-600`. Ícone `BarChart3 text-indigo-500` → `text-zinc-400`.
  - "Taxa de retenção" `text-indigo-600` → `text-zinc-900 dark:text-zinc-100` (é um número, não um alerta).
- **Azul → esmeralda/zinc:**
  - Botão "Resetar senha" na linha do usuário: `hover:bg-blue-50 text-blue-500` → `hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-zinc-400 hover:text-emerald-600` (ícone fantasma, cor só no hover — padrão do app).
  - Preset "Apenas Pessoal": `bg-blue-100 text-blue-700` → neutro `bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300` (o preset "Completo" fica emerald, "Desabilitar Tudo" fica red — os três já se distinguem).
  - `Activity` icon `text-blue-500` → `text-zinc-400`.
  - `ACTION_LABELS.password_reset` color `text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30` → `text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800`.
- **`StatCard` (auxiliar no fim do arquivo):** o `colorMap` tem `indigo`, `blue`, `purple`. Reduza a `emerald`, `amber`, `red`, `zinc` e atualize as 4 chamadas: "Total Usuários" → `zinc`, "Ativos Hoje" → `emerald`, "Ativos 7 dias" → `zinc`, "Ativos 30 dias" → `zinc`. Valor do card → `font-mono tabular-nums`.
- **Emoji → ícone** (bug 3): em `ACTION_LABELS`, troque o campo `icon: "🟢"` por um **dot de cor** renderizado no `LogRow` — ex.: guarde `dot: "bg-emerald-500"` (login), `bg-zinc-300` (logout), `bg-amber-500` (falhou), `bg-red-500` (bloqueado), `bg-zinc-400` (reset senha), e no `LogRow` renderize `<span className={\`w-2 h-2 rounded-full flex-shrink-0 ${actionInfo.dot}\`} />` em vez do `<span className="text-base">{icon}</span>`. Remova o `🎉` do empty state ("Todos os usuários estão ativos!" basta).
- **Tipografia:** `h1` "Painel Admin" e os `h3` de seção → `font-display`. Todas as contagens/estatísticas (`totalUsers`, `activeUsers`, `logins_*`, `new_users_*`, `days_inactive`, `{d.total}`) → `font-mono tabular-nums`. Datas (`formatDate`/`formatDateShort`) → `font-mono text-xs`.
- **Inativos:** o âmbar já está correto ✓ (alerta) — só passe números/datas para mono.

---

## Verificação

```bash
# Nenhum acento fora do sistema nas três páginas:
grep -nE "(bg|text|border|ring|from|to|via)-(blue|indigo|purple|violet|teal|orange|green|pink)-[0-9]" \
  src/pages/ResetPasswordPage.tsx src/pages/ConfiguracoesPage.tsx src/pages/AdminPage.tsx
# VAZIO (amber/red/emerald/zinc permitidos).

# Degradê e hex inline não devem sobrar:
grep -n "gradient" src/pages/ResetPasswordPage.tsx        # VAZIO
grep -n "3B82F6\|D1D5DB" src/pages/ConfiguracoesPage.tsx  # VAZIO

# Nenhum emoji como ícone:
grep -nE "🟢|⚪|🟡|🔴|🔵|🎉" src/pages/AdminPage.tsx        # VAZIO
```

## Critérios de aceite
- [ ] Zero `blue/indigo/purple/orange/green` nas três páginas; Admin em zinc + esmeralda.
- [ ] Reset de senha sem degradê, botão esmeralda sólido, foco esmeralda, hover do "Voltar" visível no light.
- [ ] Toggle de tema em classes esmeralda + `role="switch"`/`aria-checked`; sem hex inline.
- [ ] Configurações usando `PageHeader` (com Pista) como as abas-mãe.
- [ ] Nenhum emoji como ícone no Admin (dots/Lucide); logs legíveis.
- [ ] Números, contagens e datas em `font-mono tabular-nums`; títulos em `font-display`.
- [ ] Palavras de confirmação (RESETAR/EXCLUIR) em `font-mono`.
- [ ] Lógica, queries e handlers intactos; dark mode funcionando.
