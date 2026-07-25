# Prompt para o Claude Code — FASE 7: Dark mode em todas as telas (Hedge)

> Cole no Claude Code na raiz de `gestaofinanceira/`.
> Referência visual: `Dark Hedge.dc.html` (spec do dark). Fases 1–6 cuidaram do **light**; esta fecha o **dark** em todo o app.
> O dark já existe ("liquid glass" no `index.css`) — não reinvente. Aqui é **1 troca de base + consistência + 5 correções**.

---

## ⚠ Troca de base (fazer primeiro): `#0B0F19` → `#0A0A0B`

A base atual é um preto **azulado**, mas todos os cartões e neutros são `zinc` (neutro) — a dissonância aparece nas bordas do vidro. Decisão: **neutralizar**, deixando o esmeralda como única cor da tela.

Em `src/index.css`, troque nas **duas** regras que usam o valor:
```css
.dark body, html.dark body { background-color: #0A0A0B; }   /* era #0B0F19 */
html.dark ::-webkit-scrollbar-track { background: #0A0A0B; }  /* era #0B0F19 */
```
Depois procure o hex no resto do projeto e troque também (há pelo menos um `dark:bg-[#0B0F19]` em página de autenticação):
```bash
grep -rn "0B0F19" src/
```
O bloco liquid-glass **não muda** — as opacidades e blurs continuam iguais; só a base fica neutra.

---

## O sistema dark (siga à risca)

**Superfícies — três níveis, só isso:**
- Base da página: `#0A0A0B` (preto neutro).
- Cartão de conteúdo: classe **exatamente** `dark:bg-zinc-900` → a regra global do `index.css` aplica vidro (55% + blur 14px + brilho interno).
- Barra lateral: `aside` com `dark:bg-zinc-900` → vidro denso (70% + blur 20px).
- Bordas: `dark:border-zinc-800` → a regra global troca por branco a 6%.

**Texto (4 níveis):** primário `dark:text-zinc-50` · corpo `dark:text-zinc-100` · secundário `dark:text-zinc-400` · terciário `dark:text-zinc-500`. **Nunca** `dark:text-zinc-600` para texto — desaparece sobre o vidro.

**Acento — a regra que resolve 90%:**
- **Preenchimento** mantém o tom 600 com texto branco: `bg-emerald-600 text-white` (idem `amber-600`, `red-600`).
- **Texto e ícone** coloridos sobem para o tom 400: `dark:text-emerald-400`, `dark:text-amber-400`, `dark:text-red-400`.
- Fundos tênues de estado: `dark:bg-emerald-950/30`, `dark:bg-amber-950/30`, `dark:bg-red-950/20`.

**Superfícies internas (dentro de um cartão de vidro):** use branco translúcido, não zinc sólido —
linha de lista `dark:bg-white/[0.025]`, hover `dark:hover:bg-white/[0.06]`, trilho de barra `dark:bg-white/[0.07]`, campo de formulário `dark:bg-white/[0.04]` com borda `dark:border-white/[0.09]`.

**Estados atenuados (pago, quitado, suspenso, desabilitado) — um só recurso:** atenue **ou** pela cor do texto **ou** por `opacity`, nunca os dois. Empilhar `opacity-*` com um texto já apagado derruba o contraste abaixo do mínimo legível. Padrão: texto `dark:text-zinc-400` + `line-through` (e ícone de check em `emerald-400`), **sem** `opacity` no container. Se precisar de `opacity`, não passe de `0.8` e mantenha o texto em `zinc-400`. Vale para as linhas de lançamento pago em `TabMeuGasto`/`TabGastos`, cobranças quitadas em `TabDividas`, gastos fixos suspensos e cards de usuário inativo no Admin.

---

## ⚠ As 5 correções

### 1. Hover do dark quebrado (~12 ocorrências) — prioridade
O padrão abaixo aparece nas Tabs e em várias páginas:
```
hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-700
```
O `dark:bg-zinc-700` **sem** `hover:` define o estado normal como já-claro, então o hover não muda nada (e o `dark:bg-zinc-800` que deveria valer é sobrescrito). Corrija todas para:
```
hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-white/[0.06]
```
Busque também variações do mesmo erro: qualquer `dark:text-*` ou `dark:bg-*` **sem prefixo de estado** dentro de uma cadeia de `hover:`/`focus:` (ex.: em `NotificationBell.tsx`, `hover:text-zinc-600 dark:text-zinc-400` → `hover:text-zinc-600 dark:hover:text-zinc-300`).

### 2. Regra global vazando: `dark:bg-zinc-800` a 50%
No fim do `src/index.css`:
```css
html.dark .dark\:bg-zinc-800 { --tw-bg-opacity: 0.5; }
```
Foi escrita para o painel de notificações, mas atinge **todo elemento** com essa classe no app — chips, badges e campos que deveriam ser sólidos ficam translúcidos sobre o vidro e perdem legibilidade. **Restrinja ao painel**: dê uma classe própria ao painel de notificações (ex.: `data-glass="panel"` ou `.notification-panel`) e troque o seletor para ela. Mantenha o resto do bloco liquid-glass como está.

### 3. Acentos sem par `dark:`
Faça uma varredura: todo `text-emerald-600`, `text-amber-600`, `text-red-600`, `text-emerald-700`, `text-amber-700`, `text-red-700` usado como **texto/ícone** precisa de par `dark:text-*-400`. Casos que já vi:
- `PageHeader.tsx` usa `dark:text-emerald-500` no eyebrow → padronize em `dark:text-emerald-400`.
- Valores de "restante", "Falta:", totais e badges nas Tabs e nas páginas de Contas/Cartões/Devedores.
- Não mexa nos **preenchimentos** (`bg-emerald-600 text-white` está correto nos dois temas).

### 4. Gráficos com hex de tema claro
Os `<CartesianGrid>`, `<XAxis>`, `<YAxis>` e `tooltipStyle` do Recharts recebem hex fixos (`#F4F4F5` na grade, `#A1A1AA` nos eixos) — no escuro a grade fica mais forte que os dados. Derive do tema:
- Leia o tema (o hook `useTheme` já existe) e defina:
  - grade: light `#F4F4F5` · dark `rgba(255,255,255,0.06)`
  - eixos/ticks: light `#A1A1AA` · dark `#71717A`
  - série principal: light `#059669` · dark `#34D399`
  - série secundária: light `#D4D4D8` · dark `rgba(255,255,255,0.22)`
  - tooltip: dark = fundo `#18181B`, borda `rgba(255,255,255,0.1)`, texto `#F4F4F5`
- Arquivos com gráficos: `DashboardPage.tsx` e `AdminPage.tsx` (as barras de logins/cadastros já usam classes Tailwind — só garanta `dark:bg-emerald-400`).

### 5. Áreas que provavelmente nunca foram vistas no escuro
Abra e ajuste cada uma no dark (são as menos exercitadas):
- **`ResetPasswordPage`**: fundo é `bg-zinc-50` + `dark:bg-[#0A0A0B]`? Garanta o par (e que o hex foi trocado na etapa da base). O texto "Voltar para o App" e o cartão devem seguir a escala de texto.
- **`ConfiguracoesPage`**: a Zona de Perigo usa `bg-red-50`/`bg-amber-50` — precisa de `dark:bg-red-950/20` e `dark:bg-amber-950/20`, com texto no tom 400.
- **`AdminPage`**: tabela de logs, cards de estatística e o empty state — confira contraste dos badges de ação sobre vidro.
- **Modais**: overlay `bg-black/45` no light → no dark use `dark:bg-black/65` (o vidro do corpo precisa de mais separação). Corpo do modal = vidro denso.
- **Skeleton/Toaster/AsyncState**: já usam `dark:bg-white/[0.06]` ✓ — só confirme que o Toaster não usa zinc sólido.

---

## Verificação

```bash
# Base neutralizada — nenhum azulado restante:
grep -rn "0B0F19" src/                                       # VAZIO

# Cadeia de hover quebrada (dark: sem prefixo de estado dentro de hover):
grep -rn "hover:bg-zinc-200 dark:bg-zinc-700" src/          # VAZIO
grep -rn "hover:text-zinc-600 dark:text-zinc-400" src/      # VAZIO

# Texto colorido sem par dark (inspeção manual do resultado):
grep -rnE "text-(emerald|amber|red)-(600|700)" src/ | grep -v "dark:"

# Cartões que saíram do sistema de vidro:
grep -rnE "dark:bg-zinc-900/[0-9]|dark:bg-\[#" src/         # deve ser VAZIO ou justificado

# Regra global restrita ao painel:
grep -n "dark\\\\:bg-zinc-800" src/index.css                 # deve estar sob seletor específico

# Hex de grade clara nos gráficos:
grep -rn "#F4F4F5" src/pages/DashboardPage.tsx              # VAZIO (agora vem do tema)
```

Teste manual (alterne o tema em Configurações e percorra **todas** as telas): nenhum cartão opaco no meio dos de vidro; nenhum texto colorido apagado; hover perceptível em todo item de lista e chip; grade dos gráficos discreta; modais com separação clara do fundo.

## Critérios de aceite
- [ ] Base dark = `#0A0A0B` (body + scrollbar + qualquer hex no `src/`); nenhum `#0B0F19` restante.
- [ ] Todo cartão de conteúdo usa `dark:bg-zinc-900` (vidro aplicado); nenhum hex ou opacidade avulsa.
- [ ] Escala de texto dark respeitada (50/100/400/500); nenhum `dark:text-zinc-600` em texto.
- [ ] Preenchimentos no tom 600 + `text-white`; texto/ícone colorido no tom 400 com par `dark:`.
- [ ] Superfícies internas em branco translúcido (lista 2,5% · hover 6% · trilho 7% · campo 4%).
- [ ] As 5 correções aplicadas (hover chain · regra vazando · acentos sem par · gráficos · telas pouco vistas).
- [ ] Light **inalterado** — nenhuma regressão nas fases 1–6.
