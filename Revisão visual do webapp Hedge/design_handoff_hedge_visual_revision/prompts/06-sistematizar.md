# Prompt para o Claude Code — FASE 6: Sistematizar (Hedge)

> Cole no Claude Code na raiz de `gestaofinanceira/`.
> Esta é a fase **estrutural** — mexe em contratos de componente, não só em cor. Fases 1–5 já rodaram. Foco light + desktop.
> Faça na ordem dos itens (1 → 4): o item 1 é um **bug de estado** e destrava os outros. Rode o app entre os itens.

---

## ⚠ Item 1 (primeiro): o mês está dessincronizado — bug de estado

O app tem um mês global no contexto (`src/context/AppContext.tsx:179-188`):

```ts
const [mesVisualizacao, setMesVisualizacao] = useState<Date>(new Date());
const navegarMes = (direcao: "anterior" | "proximo") => { … };
const irParaHoje = () => setMesVisualizacao(new Date());
```

Mas **duas telas ignoram esse estado e criam o seu próprio**:
- `src/pages/DashboardPage.tsx:266` → `const [mesVisualizacao, setMesVisualizacao] = useState(new Date());`
- `src/pages/CartoesCreditoPage.tsx:107` → idem.

**Efeito visível:** o usuário muda para "maio" no Dashboard, navega para Na Rua → volta para o mês atual. Sai de Cartões e o mês muda de novo. Três "verdades" para a mesma pergunta.

**Correção:** as duas páginas passam a consumir o contexto.
- Em ambas, remova o `useState` local e pegue do contexto: `const { mesVisualizacao, navegarMes, irParaHoje } = useAppContext();` (o Dashboard já usa `useAppContext` para outras coisas; Cartões precisa importar).
- Troque as chamadas locais pelas do contexto:
  - `setMesVisualizacao(subMonths(mesVisualizacao, 1))` → `navegarMes("anterior")`
  - `setMesVisualizacao(addMonths(mesVisualizacao, 1))` → `navegarMes("proximo")`
  - Ocorrências: `DashboardPage.tsx:654,664`; `CartoesCreditoPage.tsx:677,679,756,761`.
- Remova imports de `addMonths`/`subMonths` que ficarem sem uso.
- **Cuidado:** os `useEffect` do Dashboard já dependem de `mesVisualizacao` (`:614,623`) — continuam funcionando, agora reagindo ao mês global. Confira que a troca de mês em qualquer tela recarrega os dados do Dashboard.

Ao final: mudar o mês em qualquer lugar reflete em **todas** as telas.

---

## Item 2: um seletor de mês, não cinco

Hoje existem **cinco** UIs de navegação de mês, cada uma com visual e posição própios:
`TabGastos.tsx:96-116` · `TabMeuGasto.tsx:128-148` · `ContasBancariasPage.tsx:418-436` · `PessoasPage.tsx:198-216` · `CartoesCreditoPage.tsx:677-679,756-761`.

### 2.1 Criar `src/components/ui/MonthNav.tsx`

Um só componente, no estilo do Dashboard (que é a referência aprovada): pílula branca com dois chevrons e o mês ao centro.

```tsx
// Consome o contexto — sem props de mês.
// Estrutura: div inline-flex items-center bg-white dark:bg-zinc-900
//   border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 shadow-sm
//   ├─ button (ChevronLeft, w-8 h-8 rounded-lg text-zinc-500
//   │         hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900), aria-label="Mês anterior"
//   ├─ span (min-w-[132px] text-center text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-100)
//   │         → formatMonthYear(mesVisualizacao)
//   └─ button (ChevronRight, idem), aria-label="Próximo mês"
// Um botão-texto "Ir para hoje" (text-xs font-mono text-emerald-600 hover:text-emerald-700)
// aparece SÓ quando o mês exibido não é o corrente (isSameMonth(mesVisualizacao, new Date())).
```

O "Ir para hoje" condicional resolve um detalhe atual: hoje ele está sempre visível, inclusive quando já se está no mês atual (onde não faz nada).

### 2.2 Adicionar slot `actions` ao `PageHeader`

`src/components/ui/PageHeader.tsx` hoje só aceita `eyebrow`, `title`, `description`. Adicione `actions?: ReactNode` e faça o header virar uma linha `flex items-end justify-between gap-4 flex-wrap`, com o bloco de texto à esquerda e `actions` à direita. **Não** mexa no `Pista` nem nas classes do título/eyebrow — estão aprovados.

### 2.3 Subir o seletor para as abas-mãe

Nas três páginas-mãe (`NaRuaPage.tsx`, `OrcamentoPage.tsx`, `CarteiraPage.tsx`), passe `actions={<MonthNav />}` ao `PageHeader` — **apenas nas visões que são mensais**. Adicione um campo `mensal: boolean` a cada entrada de `VIEWS` e renderize `actions={activeView?.mensal ? <MonthNav /> : undefined}`:
- **Na Rua:** "Por mês" e "Em aberto" são mensais; "Por pessoa" (Devedores) — mantenha mensal se a tela usa o mês para calcular saldos (hoje usa), então `true` nas três.
- **Orçamento / Carteira:** marque `true` nas visões que hoje têm seletor próprio (Lançamentos, Contas, Cartões) e `false` nas que não dependem do mês (ex.: Metas, se não depende).

### 2.4 Remover os seletores antigos

Em cada arquivo, **apague o bloco de navegação de mês** (o card com os dois chevrons + título + "Ir para hoje") e ajuste as props:
- `TabGastos.tsx` / `TabMeuGasto.tsx`: continuam precisando de `mesVisualizacao` (usado em `format(...)`, `min`/`max` do input de data, cálculos de suspensão). **Remova apenas `navegarMes` e `irParaHoje`** da interface de props, da desestruturação e das chamadas em `GastosPage.tsx:203-205` e `EuPage.tsx:238-240`.
- `ContasBancariasPage.tsx` / `PessoasPage.tsx`: removem o bloco e param de desestruturar `navegarMes`/`irParaHoje` do contexto (mantêm `mesVisualizacao`).
- `CartoesCreditoPage.tsx`: são **duas** navegações duplicadas na mesma tela (`:677-679` e `:756-761`) — remova ambas; o mês passa a vir do cabeçalho da aba-mãe.
- `DashboardPage.tsx:646-666`: o Dashboard tem o seu seletor **dentro** do próprio header. Como o Dashboard não é uma aba-mãe com sub-abas, você pode mantê-lo (é a referência visual) **ou** trocá-lo por `<MonthNav />` para reusar o componente — prefira trocar por `<MonthNav />`, mantendo a posição atual, para existir uma só implementação.

**Resultado:** um único controle de mês no app, sempre no mesmo lugar; trocar de sub-aba preserva o mês.

---

## Item 3: componentes de resumo compartilhados

Cada tela desenha seus próprios cards de KPI na mão, com tamanhos e formatos diferentes — e o `AdminPage.tsx` tem um `StatCard` local (no fim do arquivo) que ninguém mais usa.

### 3.1 Criar `src/components/ui/Stat.tsx` com dois exports

- **`<StatCard>`** — cartão isolado: `label` (eyebrow mono zinc-400), `value` (string já formatada, `font-mono tabular-nums text-2xl font-semibold`), `hint?` (texto pequeno zinc-500), `tone?: "neutral" | "positive" | "warning" | "danger"` (só tinge o **valor**: zinc-900 / emerald-700 / amber-600 / red-600), `icon?` (renderizado `text-zinc-400`).
- **`<SummaryStrip>`** — a faixa aprovada do Dashboard: um cartão com N colunas divididas (`grid divide-x divide-zinc-100 dark:divide-zinc-800`), recebendo `items: {label, value, hint?, tone?}[]`. Colunas = `items.length`.

Regra: o componente **não formata moeda** — recebe a string pronta de `formatCurrency`, para não duplicar lógica.

### 3.2 Adotar onde já existe faixa/cards de resumo

Substitua as marcações manuais por `<SummaryStrip>` (para tiras de 3-4 números) ou `<StatCard>` (avulsos), começando pelas que a auditoria apontou: os resumos de **Lançamentos** (Crédito/Débito/Pago/Fixos), **Por mês** (Total do Mês + por pessoa), **Em aberto** (total), **Contas**, **Cartões** e os 3 cards de estatística do **Admin** (que passa a usar o compartilhado e perde o `StatCard` local). Não invente números novos — só re-embale os que já existem.

---

## Item 4: padronizar as peças

Passe rápido de consistência, agora que tudo está no mesmo sistema:

- **Raio dos cartões:** hoje há `rounded-xl` e `rounded-2xl` misturados. Padronize **`rounded-2xl` para cartões de conteúdo** e `rounded-xl` para controles (pílulas, inputs, botões). Sombra: `shadow-sm` em cartão, sem sombra em controle.
- **Cartões clicáveis:** em `CartoesCreditoPage` (e onde houver) há `<div onClick>` — troque por `<button type="button">` com `focus-visible:ring-2 focus-visible:ring-emerald-500` e `cursor-pointer`. Acessibilidade por teclado.
- **Fallback de cor de cartão:** o `CORES_CARTAO`/cor padrão azul (`#3B82F6`) — mantenha a paleta escolhível por cartão (é feature útil para distinguir), mas troque o **padrão** para o esmeralda da marca (`#059669`) e garanta que a paleta não tenha tons que colidam com os semânticos (sem vermelho/âmbar puros).
- **Densidade:** use o `space-y-6` do `PAGE_CONTAINER_CLASS` como único ritmo vertical entre blocos; evite `mb-*` avulsos competindo com ele.

---

## Verificação

```bash
# Nenhum estado de mês local fora do contexto:
grep -rn "useState.*new Date()" src/pages | grep -i "mes"     # VAZIO

# Nenhuma navegação de mês duplicada (só MonthNav deve ter os chevrons de mês):
grep -rln "navegarMes\|subMonths(mesVisualizacao" src/pages src/components/Tabs
# Deve listar apenas MonthNav.tsx (e páginas-mãe, se passarem actions)

# StatCard local do Admin removido:
grep -n "function StatCard" src/pages/AdminPage.tsx           # VAZIO

# Sem div clicável:
grep -rn "<div[^>]*onClick" src/pages                          # VAZIO
```

Teste manual: mude o mês em Lançamentos → navegue para Por mês, Contas, Cartões e Dashboard: **todos** devem mostrar o mesmo mês. Troque de sub-aba dentro de uma aba-mãe: o mês se mantém e o seletor não "pula" de lugar.

## Critérios de aceite
- [ ] Um único `mesVisualizacao` (contexto); Dashboard e Cartões sem estado local.
- [ ] Um único `MonthNav`, renderizado pelo `PageHeader` via `actions`; nenhuma tela com seletor próprio.
- [ ] "Ir para hoje" só aparece fora do mês corrente.
- [ ] `StatCard`/`SummaryStrip` compartilhados adotados nas telas de resumo; `StatCard` local do Admin removido.
- [ ] Cartões `rounded-2xl shadow-sm`; controles `rounded-xl`; clicáveis são `<button>` com foco visível.
- [ ] Cor padrão de cartão = esmeralda (não azul).
- [ ] Nenhuma regressão: dados, filtros, tour (`data-tour`) e dark mode funcionando.
