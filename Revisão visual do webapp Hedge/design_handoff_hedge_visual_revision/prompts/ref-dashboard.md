# Prompt para o Claude Code — Revisão visual da Dashboard (Hedge)

> Cole tudo abaixo no Claude Code, rodando na raiz de `gestaofinanceira/`.
> A referência visual é o mock `Dashboard Hedge.dc.html` (HTML/design ref — **não** copie o código; recrie o look no app real).

---

## Contexto

O app Hedge está com "cara de IA" e desalinhado da landing/login: cada tela usa uma cor de acento diferente (azul/roxo/rosa/laranja/índigo), não usa as fontes da marca e usa `gray` em vez de `zinc`. Sua tarefa é **transportar a identidade da landing/login para a Dashboard e o shell**, sem tocar na LandingPage nem no Login.

**NÃO altere:** `src/pages/LandingPage.tsx`, `src/components/Login.tsx`, `src/components/CursorDot.tsx`. Mantenha dark mode funcionando. Mantenha toda a lógica de dados (`fetchDashboardData`, hooks, cálculos) intacta — as mudanças são **visuais/estruturais**.

**Arquivos a editar:**
- `src/pages/DashboardPage.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Layout.tsx`

---

## 1. Sistema visual (aplicar em TODAS as mudanças abaixo)

**Um único acento: esmeralda.** Cor = significado, nunca decoração.
- Primária / marca / positivo: `emerald-600` (#059669), `emerald-500` (#10B981), fundos `emerald-50`/`emerald-100`.
- Alerta / perto do limite: `amber-500` (#F59E0B).
- Negativo / estourou: `red-500` (#EF4444).
- **Elimine no shell e na Dashboard toda ocorrência de `blue-*`, `purple-*`, `pink-*`, `indigo-*`, `cyan-*`, `orange-*`, `violet-*`, `green-*`** (troque por `emerald-*`, `zinc-*` neutro, ou pela cor semântica correta).

**Neutros: `zinc` (não `gray`).** Substitua `gray-*` → `zinc-*` na Dashboard, Sidebar e Layout (mesmo número: `gray-900`→`zinc-900`, `gray-100`→`zinc-100`, etc.). Fundo de página: `bg-zinc-50` (#FAFAFA); cartões `bg-white`; bordas `border-zinc-200`. Dark mode mantém `#0B0F19` + o "liquid glass" já no `index.css`.

**Ícones decorativos = monocromáticos.** Todo ícone Lucide de cabeçalho de card/label vira `text-zinc-400`. Cor só quando o ícone comunica estado.

**Cantos e sombra:** cartões `rounded-2xl border border-zinc-200 shadow-sm`. Sem degradês decorativos, sem borda-colorida na lateral do card.

---

## 2. Tipografia (o ponto mais importante)

O `tailwind.config.js` já tem `font-display: Syne`, `font-sans: Switzer`, `font-mono: Geist Mono`. Garanta que **Syne e Geist Mono estão carregados no app logado** (o mesmo `<link>`/fonte usado na landing; se só a landing importa, mova o import para um ponto global como `index.html` ou `index.css`).

Regras:
- **Títulos** (`h1`, `h2`, nomes de seção): `font-display font-bold tracking-tight`.
- **Todo valor monetário e numérico** (saída de `formatCurrency`, `%`, contadores, labels de eixo de gráfico): `font-mono tabular-nums`. Este é o traço de marca "números são o conteúdo".
- Corpo/labels: `font-sans` (padrão).
- Eyebrows/rótulos de seção: `font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400`.

---

## 3. Sidebar (`Sidebar.tsx`)

- Item de nav **ativo**: hoje é azul (`bg-blue-50 text-blue-700 ring-blue-100`). Troque por esmeralda: `bg-emerald-50 text-emerald-700` + indicador à esquerda `shadow-[inset_2px_0_0_#059669]` (dark: `dark:bg-emerald-950/30 dark:text-emerald-400`). Hover inativo: `hover:bg-zinc-100 hover:text-zinc-900`.
- Wordmark: mantenha `favicon-light.png`/`favicon-dark.png` + "Hedge" em `font-display font-bold`.
- Avatar do usuário: hoje mistura `emerald-100` com `dark:bg-blue-950/30 dark:text-blue-400`. Unifique em esmeralda (`bg-emerald-100 text-emerald-700`, dark equivalente). Email em `font-mono text-xs text-zinc-500`.
- Botão "Sair": logout **não é erro** — troque o vermelho por neutro (`text-zinc-500 hover:bg-red-50 hover:text-red-600`), vermelho só no hover.
- Todos os `gray-*` → `zinc-*`.

## 4. Layout (`Layout.tsx`)

- Botão de ajuda "?" e header: `gray-*` → `zinc-*`; hover `hover:text-blue-600` → `hover:text-emerald-600`. Fundo `bg-gray-100` → `bg-zinc-50` (dark mantém `#0B0F19`).

---

## 5. Dashboard (`DashboardPage.tsx`) — estrutura + estilo

O objetivo é sair da "parede de 15 cards iguais" para uma hierarquia que responde uma pergunta por bloco (ver mock). Mantenha os mesmos dados; reorganize a apresentação.

**5.1 Header**
- "Olá, {nome}" em `font-display font-bold text-3xl tracking-tight`. Eyebrow acima: `font-mono uppercase tracking-[0.2em] text-emerald-600` com "Painel · {mês}".
- Seletor de mês: chevrons `zinc`, sem azul. Label do mês `capitalize`.

**5.2 Card herói (substitui os 4 cards de resumo do topo)**
Um único cartão `rounded-2xl` em grid 2 colunas:
- Esquerda: eyebrow "SALDO LIVRE · DISPONÍVEL AGORA" + valor grande em `font-display font-extrabold` ~`text-6xl` (`data.saldoLivre`, aplicar `tracking-tighter`; se quiser condensar, `inline-block scale-x-90 origin-left`). Abaixo, tira com 3 mini-stats separados por borda: **Saldo total / A receber / Meus gastos** — labels `text-zinc-400 text-xs`, valores `font-mono`.
- Direita (divisória `border-l border-zinc-100`): "Fluxo do mês" — Receitas fixas (barra emerald cheia) e Gastos fixos (barra `zinc-300`), e no rodapé "Sobra mensal" = `receitasFixasMensais - gastosFixosMensais` em `font-mono text-emerald-700` (vermelho se negativo).

**5.3 Meus gastos por mês (gráfico de barras)**
- Recharts `<Bar>`: `fill="#3B82F6"` → `fill="#059669"`. Barra do mês mais recente pode destacar em `#047857`. Eixos `stroke="#A1A1AA"`, grid `stroke="#F4F4F5"`, ticks `font-mono`. Título "Por mês" em `font-display`.

**5.4 Últimos lançamentos**
- **Remova os emojis de categoria** (🛒🚗🎬💊🏠💳). Troque por um **dot de 8px** colorido por natureza (`emerald-500` para receita/positivo, `zinc-300`/`zinc-500` para neutro, `amber-500` p/ pendente). Nome em `font-medium text-zinc-800`; categoria em `font-mono text-[11px] text-zinc-400`; valor em `font-mono font-semibold` com `−` (negativo).
- Link "Ver todos os gastos" em `text-emerald-600`.

**5.5 Onde o dinheiro foi (categorias) + Metas do mês** (2 colunas)
- Categorias: barras horizontais `bg-emerald-*` (tons decrescentes: 600/500/400/300) sobre trilho `bg-zinc-100`; valor+% em `font-mono`.
- Metas: já usam verde/âmbar/vermelho por estado — só padronize (`emerald-500` ok / `amber-500` ≥80% / `red-500` >100%), trilho `bg-zinc-100`, números `font-mono`, título `font-display`. Remova o ícone `Target` roxo (ou deixe `text-zinc-400`).

**5.6 Tendência · 6 meses**
- **Unifique os dois gráficos de área duplicados (azul + verde) em um só** com duas séries: "Meus gastos" (linha esmeralda `#059669`, área `url()` esmeralda 0.18→0) e "Compartilhados" (linha `#D4D4D8` tracejada). Grid `#F4F4F5`, ticks `font-mono text-zinc-400`. Título `font-display`.

**5.7 Cards de métrica restantes** (Taxa de quitação, Média por pessoa, Economias, Top 5, Parcelas, Fixos×Variáveis)
- Troque TODOS os acentos (`indigo`, `cyan`, `pink`, `purple`, `blue`, `orange`) por `emerald` (primário) ou `zinc` (neutro). Barras de progresso: `bg-indigo-500` → `bg-emerald-500`, trilho `bg-zinc-100`. "Gastos Fixos / Variáveis" (hoje blue/indigo) → esmeralda vs zinc. Todo número em `font-mono`. Considere reduzir/agrupar estes cards para diminuir a densidade (opcional).
- `CORES_GRAFICO` (topo do arquivo): troque a paleta arco-íris por tons de esmeralda + zinc:
  ```ts
  const CORES_GRAFICO = ["#059669","#10B981","#34D399","#6EE7B7","#A7F3D0","#D1FAE5","#A1A1AA","#D4D4D8"];
  ```
- `tooltipStyle`: bordas/raios `zinc` (já ok); mantenha.

---

## 6. Critérios de aceite

- [ ] Zero classes `blue/purple/pink/indigo/cyan/orange/violet/green` na Dashboard, Sidebar e Layout (grep). Único acento = `emerald`; semânticos `amber`/`red` só por estado.
- [ ] Zero `gray-*` (tudo `zinc-*`).
- [ ] Nenhum emoji como ícone.
- [ ] Todo valor em R$/%/número usa `font-mono tabular-nums`; títulos usam `font-display`.
- [ ] Nav ativo é esmeralda; logout neutro.
- [ ] Dark mode e todos os dados continuam funcionando; landing e login intocados.
- [ ] Contraste AA mantido (texto secundário mínimo `zinc-500`).

Comece pela Sidebar + Layout (shell), depois o header e o card herói, depois os gráficos. Rode o app e me mostre a Dashboard antes e depois.
