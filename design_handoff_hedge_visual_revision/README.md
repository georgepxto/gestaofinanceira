# Handoff: Revisão visual do webapp Hedge

## Visão geral

Pacote completo da revisão visual do **Hedge** (gestão financeira · React + Vite + Tailwind + Supabase). O objetivo é levar a identidade visual da **landing page** e da **página de login** para dentro do app, tirar a "cara de feito por IA" e resolver inconsistências de organização — mantendo landing e login intactos.

O trabalho está dividido em **8 etapas sequenciais**, cada uma com um prompt pronto para colar no Claude Code, mais 3 mocks navegáveis que servem de referência visual.

**Escopo desta revisão:** desktop. Light **e** dark (o dark é a etapa 07–08).

---

## Sobre os arquivos de design

Os arquivos em `mocks/` são **referências de design criadas em HTML** — protótipos que mostram a aparência e o comportamento pretendidos. **Não são código de produção para copiar.** A tarefa é **recriar essas telas no ambiente já existente do app** (React + Tailwind), usando os padrões e componentes que o projeto já tem.

Os arquivos em `prompts/` são o caminho prático para isso: cada um descreve, arquivo por arquivo e classe por classe, o que mudar no código real — ancorado em nomes e linhas reais do repositório.

**Fidelidade: alta (hi-fi).** Cores, tipografia, espaçamentos e estados são finais. O Dashboard já foi implementado a partir do mock e aprovado — use-o como referência do padrão de qualidade esperado.

---

## O diagnóstico (por que esta revisão existe)

Auditoria de 28 superfícies. Os problemas eram sistêmicos, não pontuais:

1. **Cada tela tinha uma cor de acento diferente** — azul, roxo, rosa, laranja, índigo, ciano. O verde da marca quase não aparecia.
2. **As fontes da marca não eram usadas no app** — `Syne` (títulos) e `Geist Mono` (números) existiam só na landing/login.
3. **`gray-*` genérico do Tailwind** em vez do `zinc` da marca.
4. **Emoji como ícone** (🛒🚗🔵⚪🟢) no Admin e nas listas.
5. **Degradê azul→verde** no botão do reset de senha.
6. **Paredes de cards de mesmo peso**, sem hierarquia.
7. **Peças que não conversam** — raios e sombras misturados, e **cinco seletores de mês** diferentes.

---

## Design tokens

### Cor — regra central

**Um único acento: esmeralda.** Cor comunica significado, nunca decoração. Não existe `blue`, `purple`, `indigo`, `violet`, `teal`, `orange`, `pink` ou `green` no app.

| Papel | Light | Dark |
|---|---|---|
| Acento / marca / positivo (preenchimento) | `emerald-600` `#059669` | `emerald-600` `#059669` + `text-white` |
| Acento (texto e ícone) | `emerald-600` `#059669` | `emerald-400` `#34D399` |
| Detalhe / barra de progresso | `emerald-500` `#10B981` | `emerald-500` `#10B981` |
| Alerta / em aberto / perto do limite | `amber-500/600` | texto `amber-400` `#FBBF24` |
| Perigo / excedido / excluir | `red-500/600` | texto `red-400` `#F87171` |
| Fundo tênue de estado | `emerald-50` `#ECFDF5` | `emerald-950/30` |

**A regra que resolve 90% do dark:** preenchimento mantém o tom 600 com texto branco; texto e ícone coloridos sobem para o tom 400.

### Neutros e superfícies

| | Light | Dark |
|---|---|---|
| Base da página | `zinc-50` `#FAFAFA` | `#0A0A0B` (preto neutro) |
| Cartão de conteúdo | `white` | `dark:bg-zinc-900` → vidro 55% + `blur(14px)` |
| Barra lateral | `white` | `dark:bg-zinc-900` em `aside` → vidro 70% + `blur(20px)` |
| Borda | `zinc-200` `#E4E4E7` | branco a 6% |
| Divisória fina | `zinc-100` `#F4F4F5` | branco a 5% |
| Superfície interna (linha de lista) | `zinc-50` / `#FCFCFC` | branco a 2,5% |
| Hover de item | `zinc-100` | branco a 6% |
| Trilho de barra | `zinc-100` | branco a 7% |
| Campo de formulário | `zinc-50` + borda `zinc-200` | branco a 4% + borda a 9% |

> **Vidro é só para cartão de conteúdo.** Nenhum controle (pílula, chip, badge, botão, input) deve usar `dark:bg-zinc-900` — a regra global do `index.css` intercepta essa classe e aplica blur, criando vidro dentro de vidro.

### Texto

| Nível | Light | Dark |
|---|---|---|
| Primário (título, valor herói) | `zinc-900` `#18181B` | `zinc-50` `#FAFAFA` |
| Corpo | `zinc-800` `#27272A` | `zinc-100` `#F4F4F5` |
| Secundário | `zinc-500` `#71717A` | `zinc-400` `#A1A1AA` |
| Terciário (eyebrow, ícone decorativo) | `zinc-400` `#A1A1AA` | `zinc-500` `#71717A` |

Nunca `zinc-600` para texto no dark — desaparece sobre o vidro.

### Tipografia

Já configurada no `tailwind.config.js`:

- **`font-display`** = `Syne` — títulos (`font-bold tracking-tight`).
- **`font-sans`** = `Switzer` — corpo, rótulos.
- **`font-mono`** = `Geist Mono` — **todo valor em R$, %, contagem, data e parcela** (`tabular-nums`). É a assinatura de marca mais forte: "números são o conteúdo".
- **Eyebrow:** `font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400` (ou `text-emerald-600` no cabeçalho de página).

Garanta que Syne e Geist Mono estão carregadas no app logado, não só na landing.

### Forma e elevação

- Cartão de conteúdo: `rounded-2xl border shadow-sm`.
- Controle (pílula, input, botão, chip): `rounded-xl` ou `rounded-lg`, sem sombra.
- Ícone de ação em item de lista: **fantasma** — base `text-zinc-400`, cor só no hover (`hover:text-emerald-600`; excluir `hover:bg-red-50 hover:text-red-600`).
- Chip/segmentado: ativo `bg-emerald-600 text-white` · inativo `bg-zinc-100 text-zinc-600 hover:bg-zinc-200`.
- Foco: `focus:ring-2 focus:ring-emerald-500` (campos destrutivos mantêm `red`).
- **Estados atenuados** (pago, quitado, suspenso): **um só recurso** — texto `zinc-400` + `line-through`, **sem** `opacity` por cima. Empilhar as duas coisas derruba o contraste abaixo do legível.
- Ritmo vertical: o `space-y-6` do `PAGE_CONTAINER_CLASS` é o único espaçamento entre blocos.

### Assinatura da marca

O **`Pista`** — risco esmeralda desenhado à mão sob uma palavra do título, herdado do hero da landing e do login. Já existe em `src/components/ui/PageHeader.tsx`. Curva:

```
d="M0,6 C12,4 22,7 35,5 C48,3 58,6 72,4 C82,3 92,5 100,2"
viewBox="0 0 100 8"  preserveAspectRatio="none"
strokeWidth="1.6"  strokeLinecap="round"  fill="none"
className="stroke-emerald-500 dark:stroke-emerald-400"
```

---

## Ordem de execução

Cada arquivo em `prompts/` é autossuficiente: cole no Claude Code na raiz de `gestaofinanceira/`. **Siga a ordem** — as etapas foram desenhadas do compartilhado (conserta uma vez, propaga) ao especializado.

| # | Prompt | O que faz | Status |
|---|---|---|---|
| 01 | `01-base-compartilhada.md` | `gray→zinc` global, body, scrollbar, primitivos (Skeleton/Toaster/AsyncState), foco esmeralda | ✅ aplicado |
| 02 | `02-modais.md` | ConfirmModal, Novo empréstimo, Nova dívida + 6 modais menores | ✅ aplicado |
| 03 | `03-telas-legadas.md` | `TabGastos` (Por mês) e `TabDividas` (Em aberto) | ✅ aplicado |
| 04 | `04-sistemicos-onboarding.md` | Tour guiado e sino de notificações | ✅ aplicado |
| 05 | `05-paginas-utilitarias.md` | Reset de senha, Configurações, Admin | ✅ aplicado |
| 06 | `06-sistematizar.md` | Mês único, `MonthNav`, `StatCard`/`SummaryStrip`, slot de ação | ✅ aplicado |
| 07 | `07-dark-mode.md` | Dark em todo o app + base neutralizada `#0A0A0B` | ✅ aplicado |
| 08 | `08-pageheader-dark.md` | `PageHeader`, `Pista`, `SegmentedTabs`, `MonthNav` no dark | ✅ aplicado — `SegmentedTabs` foi removido (órfão) quando a navegação migrou para a sidebar; `PageHeader`/`Pista`/`MonthNav` seguem o dark spec |

> Status verificado lendo o código atual em 2026-08-08, não só o histórico de commits: os bugs do inventário abaixo (contraste, classes quebradas, mês dessincronizado, acessibilidade, Recharts) foram checados um a um contra os arquivos hoje e não reproduzem mais.

**Referências (já aplicadas, mantidas para consulta):** `ref-dashboard.md` e `ref-meus-gastos.md` documentam a conversão do Dashboard e da tela de Lançamentos — que são hoje o padrão de qualidade do app.

A etapa 06 muda contratos de componente: rode item por item e teste o app entre eles.

---

## Inventário de bugs encontrados

Achados na leitura do código, corrigidos dentro dos prompts. Vale conhecê-los porque vários são invisíveis em revisão visual:

**Contraste / legibilidade**
1. Segmentados de tipo com `text-zinc-900` sobre `bg-amber-600`/`bg-teal-600`/`bg-blue-600` — texto escuro sobre fundo colorido, ilegível. *(02, 03)*
2. Botão "Limpar" com `bg-zinc-600 text-zinc-900`. *(03)*
3. `divide-zinc-700` em lista no light — divisória escura demais. *(03)*
4. Valor restante em `text-orange-400` sobre branco — não passa contraste. *(03)*
5. Estados "pago"/"quitado" empilham texto apagado **e** `opacity`, somando duas atenuações. *(07)*

**Classes que não funcionam**
6. `focus:ring-${color}-500/50` montado por interpolação no ConfirmModal — o Tailwind não gera classe dinâmica, o anel simplesmente não existe. *(02)*
7. Cadeia de hover quebrada em ~12 lugares: `hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-700` — o `dark:bg-zinc-700` sem prefixo de estado sobrescreve o fundo normal e anula o hover. *(03, 07)*
8. `hover:text-zinc-600 dark:text-zinc-400` no sino — mesmo erro, anula o hover no dark. *(04)*
9. `[color-scheme:dark]` fixo no input de data — date-picker escuro no modo claro. *(03)*
10. `dark:bg-zinc-900` em pílula de controle dispara a regra global de vidro → blur dentro de container já translúcido. *(08)*
11. Regra global `html.dark .dark\:bg-zinc-800 { opacity: .5 }` foi escrita para o painel de notificações mas atinge o app inteiro. *(07)*

**Estado / lógica**
12. **Mês dessincronizado:** além do `mesVisualizacao` global no `AppContext`, `DashboardPage` e `CartoesCreditoPage` mantêm cada um seu próprio `useState(new Date())` — três verdades para a mesma pergunta. *(06)*
13. "Ir para hoje" sempre visível, inclusive já no mês corrente, onde não faz nada. *(06)*
14. Título "Cobranças em Aberto" fixo mesmo com o filtro em *Pagos*. *(03)*

**Acessibilidade**
15. Toggle de tema sem `role="switch"`/`aria-checked` — estado invisível para leitor de tela. *(05)*
16. `<div onClick>` em cartões de cartão de crédito — inacessível por teclado. *(06)*
17. `ring-offset` do dark aponta para a cor do cartão, criando halo cinza no foco. *(08)*

**Gráficos**
18. Recharts com hex de tema claro cravado (grade `#F4F4F5`, eixos `#A1A1AA`) — no dark a grade grita mais que os dados. *(07)*

---

## Mudanças de organização

Além da cor — o que separa "bonito" de "profissional". Detalhado em `06-sistematizar.md`.

- **Um seletor de mês, não cinco.** O mês é global; suba um único `MonthNav` para o slot `actions` do `PageHeader`. Trocar de sub-aba preserva o mês.
- **Componentes de resumo compartilhados.** `StatCard` + `SummaryStrip` extraídos da faixa aprovada do Dashboard, substituindo os KPIs desenhados à mão em cada tela (inclusive o `StatCard` local do Admin).
- **Slot fixo para a ação principal.** O CTA primário sempre no mesmo canto, via `PageHeader`.
- **Cartões: cor é feature, não decoração.** Mantenha a cor escolhível por cartão de crédito, mas troque o fallback azul por esmeralda.

> **Nota:** a reorganização do menu de ~11 itens soltos para **4 abas-mãe** (Dashboard · Orçamento · Na Rua · Carteira) com sub-navegação já foi implementada e é a melhor decisão de estrutura do projeto — não desfaça.

---

## Mocks

Abra os `.dc.html` direto no navegador (precisam do `support.js` e da pasta `assets/` que acompanham).

| Arquivo | O que é |
|---|---|
| `mocks/Dashboard Hedge.dc.html` | 4 telas navegáveis no light (Dashboard, Meus Gastos, Empréstimos, Dívidas) + 2 modais funcionais. O menu lateral troca de tela; os filtros e segmentados funcionam. |
| `mocks/Dark Hedge.dc.html` | Spec do dark: superfícies, escala de texto, comportamento do acento e especimens de cada componente (menu, card herói, faixa de resumo, linhas de lista, barras, gráfico, formulário). |
| `mocks/Revisão Visual Hedge.dc.html` | Relatório da auditoria: placar, matriz das 28 superfícies, as 6 marcas de "cara de IA", mudanças de organização e o roteiro priorizado. |
| `mocks/Revisão Visual Hedge-print.dc.html` | O mesmo relatório paginado para exportar em PDF. |

---

## Assets

- `mocks/assets/favicon-light.png` e `favicon-dark.png` — a marca real do Hedge (escudo verde/preto), copiada de `gestaofinanceira/public/`. Use sempre estes arquivos; não recrie o símbolo em CSS/SVG.
- Ícones: **Lucide React**, já instalado no projeto. Ícones decorativos são monocromáticos (`text-zinc-400`); cor só quando o ícone comunica estado.
- Fontes: `Syne` e `Geist Mono` via Google Fonts; `Switzer` via Fontshare.

---

## Arquivos deste pacote

```
design_handoff_hedge_visual_revision/
├── README.md                          ← este arquivo
├── prompts/
│   ├── 01-base-compartilhada.md
│   ├── 02-modais.md
│   ├── 03-telas-legadas.md
│   ├── 04-sistemicos-onboarding.md
│   ├── 05-paginas-utilitarias.md
│   ├── 06-sistematizar.md
│   ├── 07-dark-mode.md
│   ├── 08-pageheader-dark.md
│   ├── ref-dashboard.md               (já aplicado)
│   └── ref-meus-gastos.md             (já aplicado)
└── mocks/
    ├── Dashboard Hedge.dc.html
    ├── Dark Hedge.dc.html
    ├── Revisão Visual Hedge.dc.html
    ├── Revisão Visual Hedge-print.dc.html
    ├── support.js                     (runtime dos mocks)
    ├── doc-page.js                    (paginação do relatório em PDF)
    └── assets/
        ├── favicon-light.png
        └── favicon-dark.png
```

---

## Regras que não devem ser quebradas

1. **Landing page e login ficam intactos** (`LandingPage.tsx`, `Login.tsx`, `CursorDot.tsx`) — são a fonte da identidade.
2. **Um acento só:** esmeralda. `amber` e `red` apenas como estado semântico.
3. **Todo número em `font-mono tabular-nums`.**
4. **Nenhum emoji como ícone.**
5. **Nenhum degradê decorativo em botão.**
6. **Vidro só em cartão de conteúdo**, nunca em controle.
7. **Cor sempre com par `dark:`** quando for texto ou ícone.
8. **Não alterar lógica, hooks, queries, props ou `data-tour`** — as etapas são visuais; onde há mudança estrutural (06), ela está descrita explicitamente.
