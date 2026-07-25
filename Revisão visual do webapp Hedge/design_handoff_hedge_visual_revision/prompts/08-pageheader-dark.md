# Prompt para o Claude Code — PageHeader no dark (Hedge)

> Cole no Claude Code na raiz de `gestaofinanceira/`.
> Alvo: `src/components/ui/PageHeader.tsx` (com o `Pista`), `src/components/ui/SegmentedTabs.tsx` e o `MonthNav` (se a Fase 6 já rodou).
> Referência visual: `Dark Hedge.dc.html`. Escopo: **só o dark** do cabeçalho — o light está aprovado, **não mexa nele**.
> Este é o cluster que aparece no topo de **toda** aba-mãe (Orçamento, Na Rua, Carteira), então cada detalhe se repete no app inteiro.

---

## ⚠ 1. Bug: vidro dentro de vidro na pílula ativa

`SegmentedTabs.tsx` — a pílula ativa usa:
```
isActive ? "bg-white text-emerald-700 shadow-sm dark:bg-zinc-900 dark:text-emerald-400"
```
O `dark:bg-zinc-900` **dispara a regra global de liquid glass** do `index.css` (`html.dark .dark\:bg-zinc-900` → opacidade 55% + `backdrop-filter: blur(14px) saturate(1.2)` + brilho interno + sombra). Resultado: uma pílula de 28px de altura ganha blur e translucidez **dentro** de um trilho que já é superfície translúcida — a pílula "desaparece" no fundo e o texto perde definição. Vidro é para **cartão de conteúdo**, nunca para controle.

**Correção** — a pílula ativa no dark passa a ser superfície interna sólida-translúcida, sem blur:
```
isActive
  ? "bg-white text-emerald-700 shadow-sm dark:bg-white/[0.09] dark:text-emerald-400 dark:shadow-none"
  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
```
Faça a mesma varredura no resto do app: **nenhum controle** (pílula, chip, badge, botão, input) deve usar `dark:bg-zinc-900` — só cartões.
```bash
grep -rn "dark:bg-zinc-900" src/ | grep -viE "card|panel|section|aside|modal|dialog"
```

## 2. Trilho do segmentado

`dark:bg-zinc-800/60` é um tom sólido de zinc — o sistema pede **branco translúcido** para superfície interna (e o `/60` também escapa da regra global, criando um terceiro comportamento de opacidade no app).
```
border-zinc-200 bg-zinc-100 p-1 dark:border-white/[0.06] dark:bg-white/[0.04]
```

## 3. Anel de foco no dark

`dark:focus-visible:ring-offset-zinc-900` — o offset deve ser a **cor da base**, não a do cartão, senão aparece um halo cinza em volta da pílula focada. Com a base neutralizada:
```
focus-visible:ring-offset-zinc-100 dark:focus-visible:ring-offset-[#0A0A0B]
```

## 4. `Pista` — o risco esmeralda tem stroke fixo

Em `PageHeader.tsx` o `<path>` do sublinhado usa `stroke="#10b981"` (emerald-500) cravado. Como é atributo SVG, não aceita variante `dark:` — e pela regra do dark (texto/traço colorido sobe para o tom 400) ele deveria clarear sobre a base escura.

Troque o atributo por utilitários Tailwind de stroke:
```jsx
<path
  d="M0,6 C12,4 22,7 35,5 C48,3 58,6 72,4 C82,3 92,5 100,2"
  className="stroke-emerald-500 dark:stroke-emerald-400"
  strokeWidth="1.6"
  strokeLinecap="round"
  fill="none"
/>
```
Mantenha o `d`, o `viewBox`, o `preserveAspectRatio="none"` e o posicionamento (`bottom: -0.1em`, `height: 0.3em`, `zIndex`) **exatamente** como estão — a curva e a ancoragem estão aprovadas.

## 5. Eyebrow e título — alinhar à escala do dark

```
eyebrow:  text-emerald-600 dark:text-emerald-500  →  dark:text-emerald-400
título:   dark:text-zinc-100                      →  dark:text-zinc-50
descrição: dark:text-zinc-400                     →  (já correto, não mexer)
```
O título da página é o texto **primário** da tela; a descrição é secundária. Hoje os dois estão a um passo de distância na escala, o que achata a hierarquia sobre o vidro.

## 6. `MonthNav` no `actions` (se a Fase 6 já rodou)

O seletor de mês vive no slot `actions` do `PageHeader`, então é parte deste cluster. No dark:
- Pílula externa: `dark:bg-zinc-900 dark:border-zinc-800` — **aqui o vidro é bem-vindo?** Não: é controle. Use `dark:bg-white/[0.04] dark:border-white/[0.08]`, sem blur.
- Chevrons: `text-zinc-500 dark:text-zinc-400`, hover `hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-zinc-100`.
- Mês: `text-zinc-800 dark:text-zinc-100`.
- "Ir para hoje": `text-emerald-600 dark:text-emerald-400`.

---

## Verificação

```bash
# Nenhum controle usando a classe que dispara o vidro:
grep -n "dark:bg-zinc-900" src/components/ui/SegmentedTabs.tsx src/components/ui/MonthNav.tsx   # VAZIO

# Stroke fixo do Pista removido:
grep -n "10b981" src/components/ui/PageHeader.tsx                                                # VAZIO

# Acento do eyebrow no tom 400:
grep -n "emerald-500" src/components/ui/PageHeader.tsx                                           # VAZIO
```

Alterne para o dark e percorra **as três abas-mãe**: a pílula ativa deve ter borda nítida e texto legível (sem blur), o trilho deve ser um degrau discreto sobre o cartão, o risco do título deve ficar visivelmente verde-claro, e o mês no canto direito deve parecer controle — não cartão.

## Critérios de aceite
- [ ] Pílula ativa e `MonthNav` sem `dark:bg-zinc-900` (nenhum vidro em controle).
- [ ] Trilho e superfícies internas em branco translúcido (4% / 9% / hover 6%).
- [ ] `Pista` com `stroke-emerald-500 dark:stroke-emerald-400`; geometria intacta.
- [ ] Eyebrow `emerald-400`, título `zinc-50`, descrição `zinc-400` no dark.
- [ ] `ring-offset` do dark = cor da base (`#0A0A0B`).
- [ ] Light **inalterado**; deep-link, foco por teclado e `aria-selected` das tabs intactos.
