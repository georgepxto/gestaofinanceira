---
name: Hedge
description: Controle financeiro pessoal e compartilhado, desenhado como um extrato limpo.
colors:
  accent: "#FF6B35"
  accent-fg: "#0B0B0C"
  accent-ink-light: "#A93F16"
  danger: "#E5484D"
  danger-ink: "#EE5D61"
  danger-ink-light: "#BF3035"
  bg: "#0B0B0C"
  surface-1: "#131315"
  surface-2: "#1B1B1E"
  surface-3: "#26262A"
  line: "#26262A"
  fg: "#F2F2F0"
  fg-2: "#9A9A97"
  fg-3: "#83837F"
  bg-light: "#ECECE9"
  surface-1-light: "#FFFFFF"
  surface-2-light: "#F4F4F2"
  surface-3-light: "#E2E2DE"
  fg-light: "#0B0B0C"
  fg-2-light: "#5E5E5B"
  fg-3-light: "#6A6A66"
  cat-1: "#7C93B2"
  cat-2: "#74A3AD"
  cat-3: "#A18BC0"
  cat-4: "#B888AE"
  cat-5: "#C48A8E"
  cat-6: "#C2A477"
  cat-7: "#8C8FC7"
  cat-8: "#9C9690"
typography:
  display:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "clamp(40px, 6vw, 56px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Switzer, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 450
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Switzer, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.5
  body:
    fontFamily: "Switzer, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Switzer, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
  numeral:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  none: "0"
  sm: "2px"
  DEFAULT: "4px"
  full: "9999px"
spacing:
  card: "16px"
  card-desktop: "20px"
  field-x: "12px"
  page-max: "1200px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.DEFAULT}"
    height: "44px"
    padding: "0 16px"
  button-primary-disabled:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg-3}"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.DEFAULT}"
    height: "44px"
    padding: "0 16px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-3}"
  button-ghost:
    textColor: "{colors.fg-2}"
    rounded: "{rounded.DEFAULT}"
    height: "44px"
    padding: "0 16px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.DEFAULT}"
    height: "44px"
    padding: "0 16px"
  card:
    backgroundColor: "{colors.surface-1}"
    rounded: "{rounded.DEFAULT}"
    padding: "{spacing.card}"
  field:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 12px"
  pill:
    textColor: "{colors.fg-2}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 6px"
---

# Design System: Hedge

## Overview

**Creative North Star: "O extrato limpo"**

O Hedge parece um extrato bancário bem diagramado. A tela é quase preta, o texto é quase branco, e o que se lê primeiro é sempre um número, escrito em fonte mono com dígitos de largura fixa. Não há enfeite entre a pessoa e o valor: nada de sombra, de curva, de ícone colorido, de gradiente. Um único laranja aparece pouco e sempre com função — a ação principal da tela ou algo que pede atenção.

A densidade é a de um documento financeiro, não a de um painel de marketing. Linhas de lista com título, uma linha de contexto e o valor alinhado à direita; superfícies que se separam por um degrau de tom, não por borda. O escuro é o tema padrão e o desenho nasce nele; o claro é o mesmo sistema com os tons invertidos e as tintas de texto um degrau mais fundas para manter o contraste.

O app (Início, Gastos, A receber, Carteira, Configurações) é o sistema descrito aqui. A landing e o login são peças de marca: usam as mesmas duas famílias de fonte e o mesmo laranja, mas têm tokens próprios com escopo em `.lp` (`src/components/landing/landing.css`), movimento amarrado ao scroll e três temas por seção. As regras de forma e de cor deste documento valem para o app; as de dinheiro e de acessibilidade valem para tudo.

**Key Characteristics:**
- Quase preto e quase branco, com um único acento laranja.
- Dinheiro em Geist Mono, com dígitos de largura fixa; todo o resto em Switzer.
- Formas retas: raio de 2px e 4px, nada acima disso.
- Sem sombra. A profundidade é um degrau de tom entre superfícies.
- Sem verde: entrada e saída se distinguem pelo sinal, não pela cor.
- Texto em caixa normal; nenhum rótulo em caixa-alta.

## Colors

Uma escala neutra de quatro superfícies e três tons de texto, um laranja e um vermelho. As cores vivem como variáveis CSS em `src/index.css` e chegam aos componentes pelas cores do Tailwind; componente não escreve hex.

### Primary
- **Laranja de ação** (`accent`): o botão principal da tela, o traço que marca a aba ativa, a barra de progresso de um limite e o estado "atenção" de uma pílula. O texto sobre ele é sempre o quase-preto (`accent-fg`); branco sobre esse laranja não passa de 2,6:1.
- **Laranja de leitura no claro** (`accent-ink-light`): o mesmo laranja quando ele é texto sobre fundo claro, um degrau mais fundo para chegar a 4,5:1. No escuro, o texto usa o próprio `accent`.

### Secondary
- **Vermelho de perigo** (`danger`): fundo de botão destrutivo e barra de limite estourado.
- **Vermelho de leitura** (`danger-ink`, `danger-ink-light`): valor estourado, mensagem de erro e pílula de perigo, como texto.

### Tertiary
- **Tons de categoria** (`cat-1` a `cat-8`): ardósia, petróleo, lavanda, malva, rosa-argila, areia, índigo e greige. Dessaturados, espaçados no círculo e longe do laranja. Aparecem só no ponto de 8px ao lado do nome da categoria e nos segmentos do gráfico de categorias. A cor é a posição da categoria na lista da pessoa; "Outros" é sempre o greige. No tema claro cada tom desce um degrau.

### Neutral
- **Fundo** (`bg`, `bg-light`): a página.
- **Superfície 1** (`surface-1`): cards, barra de navegação, painéis.
- **Superfície 2** (`surface-2`): campos, botão secundário, o quadrado do ícone numa linha de lista, o balão do tour.
- **Superfície 3** (`surface-3`): hover do que está em superfície 2, trilho de barra de progresso, esqueleto de carregamento. É também o tom do fio (`line`).
- **Texto** (`fg`): títulos, valores e o texto principal.
- **Texto secundário** (`fg-2`): contexto, descrição, rótulo de campo.
- **Texto terciário** (`fg-3`): legenda, eixo de gráfico, placeholder. É o tom mais escuro que ainda passa em 4,5:1 sobre o fundo e sobre a superfície 2.

### Named Rules
**A Regra do Laranja Único.** Uma ação laranja por tela. Se duas coisas pedem laranja, uma delas é secundária.

**A Regra do Sem Verde.** Não existe verde na interface. Dinheiro que entra leva "+", dinheiro que sai leva "−" (o sinal tipográfico, não o hífen), e os dois têm a mesma cor.

**A Regra da Tinta.** Laranja e vermelho como texto usam a versão `-ink`. Fundo, barra e botão usam o tom cheio.

## Typography

**Display Font:** Geist Mono (com ui-monospace, monospace) — servida de `/public/fonts`, com o zero sem traço.
**Body Font:** Switzer (com -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif) — variável, do Fontshare.

**Character:** Uma sans neutra e precisa para as palavras e uma mono para os números. A mono não é fantasia de "técnico": ela existe porque colunas de dinheiro precisam de dígitos da mesma largura.

### Hierarchy
- **Display** (400, 40px no celular e 56px no desktop, altura de linha 1, -0.02em): o saldo de destaque no Início. Os centavos vêm menores e elevados, com a vírgula junto. Uma vez por tela.
- **Headline** (450, 24px no celular e 28px no desktop, -0.01em): o título da página.
- **Title** (500, 16px): título de painel, de formulário e de seção.
- **Body** (400, 15px no celular e 14px no desktop): linhas de lista, descrições, texto de botão.
- **Label** (400, 12px, caixa normal): rótulo de campo, métrica, coluna, a linha de contexto abaixo do título de uma linha de lista.
- **Numeral** (400, Geist Mono, dígitos tabulares, nunca quebra): todo valor em dinheiro, em qualquer tamanho. É a classe `.valor`.

### Named Rules
**A Regra do 500.** Nenhum peso acima de 500. Ênfase vem de tamanho e de posição, não de negrito.

**A Regra do Valor.** Dinheiro é sempre `.valor`: mono, tabular, sem quebra e sem reticências. "R$" e o número ficam juntos por um espaço que não quebra.

**A Regra dos 16px.** Campo de formulário nunca tem fonte menor que 16px (o iOS dá zoom abaixo disso). A única exceção é para cima: o valor grande do campo de dinheiro, em 40px.

## Layout

No desktop, uma barra lateral recolhível à esquerda e o conteúdo numa coluna de até 1200px. No celular, a barra lateral some e entra uma barra inferior fixa de 64px com as áreas do app e um botão laranja de 48px no centro para lançar; a engrenagem das configurações fica no topo.

Cada página abre com o título e, à direita, a ação principal. Abaixo, blocos em superfície 1 com 16px de respiro no celular e 20px no desktop. Listas são a forma padrão: ícone num quadrado de 36px, título e contexto à esquerda, valor à direita. Fileiras de indicadores rolam na horizontal no celular, sem mostrar a barra de rolagem.

Formulário e detalhe não são modal no centro: sobem de baixo como folha no celular e entram pela direita como painel de 440px no desktop. Alvos de toque têm 44px no celular e podem descer para 36 a 40px no desktop.

## Elevation & Depth

Não há sombra em lugar nenhum. A profundidade é feita por tom: fundo, superfície 1, superfície 2 e superfície 3, cada uma um degrau mais clara no escuro. O que flutua (folha, painel, menu, balão) se destaca pelo degrau de superfície e por um fio de 1px em `line`; atrás de folha e painel, um véu escurece a página a 60% sem desfocar.

### Named Rules
**A Regra do Degrau.** Para destacar, suba um degrau de superfície. Não use sombra, brilho nem desfoque.

## Shapes

Formas retas. Dois raios e só dois: 2px para o que é pequeno (pílula, campo, quadrado de ícone) e 4px para o resto (botão, card, painel). A escala do Tailwind foi substituída para que nada passe de 4px. O círculo existe em um único caso: o ponto de 8px de categoria e de cartão. Pílula não é redonda.

Bordas são raras: superfícies se separam pelo tom. O fio de 1px aparece em campos, em divisórias de lista e no contorno do que flutua. O foco de teclado é um contorno de 2px no tom do texto, afastado 2px.

## Components

### Buttons
- **Shape:** retangular, raio de 4px, 44px de altura no celular e 40px no desktop, texto em peso 500.
- **Primary:** fundo laranja, texto quase-preto. No hover, o laranja a 90%. Desativado, vira superfície 2 com texto terciário — laranja lavado fica ilegível.
- **Secondary:** superfície 2 com texto principal; superfície 3 no hover. É a variante padrão.
- **Ghost:** só texto secundário; no hover ganha superfície 2 e texto principal.
- **Danger:** fundo vermelho, texto quase-preto.
- **Carregando:** um ícone girando no lugar do ícone do botão; a cor não muda.

### Chips
- **Pílula de estado:** 20px de altura, raio de 2px, texto de 12px. Fundo no tom a 12% e texto no tom cheio. Três tons: neutro, atenção (laranja) e perigo (vermelho). Diz um estado curto: "pago", "vence hoje", "estourou".
- **Seleção:** discreta. Aba e segmento ativos são marcados por um traço ou por um papel de superfície que desliza até a posição, não por uma pílula preenchida.

### Cards / Containers
- **Corner Style:** 4px.
- **Background:** superfície 1.
- **Shadow Strategy:** nenhuma.
- **Border:** nenhuma.
- **Internal Padding:** 16px no celular, 20px no desktop.
- Card dentro de card não existe.

### Inputs / Fields
- **Style:** superfície 2, fio de 1px em `line`, raio de 2px, 44px de altura, 12px de respiro lateral. Placeholder em texto terciário.
- **Focus:** o fio passa para o tom do texto terciário.
- **Error:** mensagem em vermelho de leitura abaixo do campo, com `role="alert"`.
- **Dinheiro:** o campo de valor é o herói do formulário, em Geist Mono a 40px.

### Navigation
- **Barra lateral (desktop):** itens de texto em 14px, 36px de altura; o ativo em texto principal, os outros em secundário. Recolhida, mostra só ícones.
- **Barra inferior (celular):** ícone de 22px com rótulo de 11px; um traço laranja de 2px no topo desliza até a aba ativa.
- **Abas dentro de uma área (celular):** controle segmentado logo abaixo do topo; um papel de superfície desliza até a aba ativa.

### Linha de lista
Ícone num quadrado de 36px em superfície 2, título em 15px (14px no desktop), uma linha de contexto em 12px e o valor em `.valor` à direita. Item pago ou pausado fica em texto secundário.

### Saldo de destaque
Rótulo em 14px, o número em Display com os centavos elevados, e uma linha de contexto abaixo. Ao mudar, o número conta até o novo valor.

### Folha e painel
Formulário e detalhe. Sobe de baixo no celular (380ms, desacelerando) e entra pela direita no desktop; sai em 200ms. Prende o foco, fecha com Esc, pelo X ou tocando fora.

## Do's and Don'ts

### Do:
- **Do** ler toda cor de `src/index.css`, pelas cores do Tailwind (`bg-surface-1`, `text-fg-2`, `text-accent-ink`).
- **Do** escrever dinheiro com `formatDinheiro` e a classe `.valor`.
- **Do** manter uma ação laranja por tela.
- **Do** usar raio de 2px ou 4px.
- **Do** dar 44px de altura a tudo que se toca no celular.
- **Do** escrever rótulos em caixa normal.
- **Do** rodar `npm run check:ds` antes de enviar: o guarda (`scripts/check-design-system.sh`) barra cor fixa, verde, raio grande, caixa-alta e ornamento.

### Don't:
- **Don't** usar verde, em nenhum tom, para nada.
- **Don't** usar sombra, gradiente decorativo, desfoque ou brilho.
- **Don't** usar peso de fonte acima de 500.
- **Don't** escrever hex em componente do app.
- **Don't** pôr card dentro de card.
- **Don't** marcar seleção com pílula preenchida.
- **Don't** usar o hífen como sinal de menos em valor: é "−".
- **Don't** abrir modal no centro da tela para formulário; use a folha ou o painel.
