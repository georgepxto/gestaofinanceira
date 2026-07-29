#!/usr/bin/env bash
#
# Guarda do sistema visual — Hedge
#
# Dezoito regras, todas nascidas de um achado real da revisão visual. O que virou
# componente (PageHeader, Card, Rotulo, Valor) já está protegido por existir num
# lugar só; o que continua sendo convenção é o que este script segura.
#
# Uma linha pode ser dispensada com um comentário `ds-ok` acompanhado do motivo:
#
#     <div className="rounded-3xl"> {/* ds-ok: cápsula do avatar, geometria própria */}
#
# Dispensar uma linha é saudável. Enfraquecer uma regra para calar um caso, não.
#
# Uso:  ./scripts/check-design-system.sh
# Saída: 0 = limpo · 1 = violação encontrada

set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

SRC="src"
CSS="src/index.css"

# Peças de marca: hero da landing, login e o ponteiro. Vivem noutra gramática
# visual (degradê, raio grande, corpo fora da escala) porque a pessoa ali está
# sendo convencida, não lendo o saldo. As regras de dinheiro e de acessibilidade
# valem para elas do mesmo jeito.
MARCA='(LandingPage|Login|CursorDot)\.tsx'

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'
DIM=$'\033[2m'; BOLD=$'\033[1m'; OFF=$'\033[0m'
if [ ! -t 1 ] || [ -n "${NO_COLOR:-}" ]; then RED=; GREEN=; YELLOW=; DIM=; BOLD=; OFF=; fi

violacoes=0

grupo() { printf '\n%s%s%s\n' "$BOLD" "$1" "$OFF"; }

# Filtra registros `arquivo:linha:…` dispensados por `ds-ok`.
#
# Aceita a marca na própria linha ou na linha de cima — dentro de um template
# literal (`className={\`…\`}`) não cabe comentário, então a linha anterior é a
# única saída. Mesma ideia do `eslint-disable-next-line`.
sem_dsok() {
  local rec f resto l ctx
  while IFS= read -r rec; do
    [ -z "$rec" ] && continue
    f=${rec%%:*}; resto=${rec#*:}; l=${resto%%:*}
    case "$l" in ''|*[!0-9]*) printf '%s\n' "$rec"; continue ;; esac
    ctx=$(sed -n "$(( l > 1 ? l - 1 : 1 )),${l}p" "$f" 2>/dev/null)
    printf '%s' "$ctx" | grep -q 'ds-ok' || printf '%s\n' "$rec"
  done
}

# Imprime um bloco de achados e soma ao contador.
reportar() {
  local nome="$1" porque="$2" achados="$3"
  [ -z "$achados" ] && return 0
  printf '  %s✗%s %s\n' "$RED" "$OFF" "$nome"
  printf '    %s%s%s\n' "$DIM" "$porque" "$OFF"
  while IFS= read -r linha; do
    [ -z "$linha" ] && continue
    printf '    %s\n' "$(printf '%s' "$linha" | cut -c1-150)"
    violacoes=$((violacoes + 1))
  done <<< "$achados"
  printf '\n'
}

# regra <nome> <porquê> <padrão-erx> [escopo] [exceção-erx]
#
#   escopo   "produto" (padrão — isenta as peças de marca)
#            "tudo"    (vale em todo o src, marca inclusive)
#            <caminho> (um arquivo só)
#
#   exceção  ERX aplicado sobre a linha `arquivo:nº:conteúdo`. É por onde sai o
#            arquivo que *define* o padrão — Valor.tsx pode usar tracking-tighter
#            porque ele é o único lugar que tem o direito de apertar a display.
#            Não é por onde sai um caso incômodo: isso é `ds-ok`, na linha.
regra() {
  local nome="$1" porque="$2" padrao="$3" escopo="${4:-produto}" excecao="${5:-}"
  local alvo="$SRC" achados

  if [ "$escopo" != "produto" ] && [ "$escopo" != "tudo" ]; then alvo="$escopo"; fi
  [ -e "$alvo" ] || return 0

  # -H porque com um arquivo só o grep omite o nome, e o `sem_dsok` precisa dele.
  achados=$(grep -rHnE --include='*.tsx' --include='*.ts' --include='*.css' "$padrao" "$alvo" 2>/dev/null \
    | sem_dsok || true)

  if [ "$escopo" = "produto" ]; then
    achados=$(printf '%s' "$achados" | grep -vE "$MARCA" || true)
  fi
  if [ -n "$excecao" ]; then
    achados=$(printf '%s' "$achados" | grep -vE "$excecao" || true)
  fi

  reportar "$nome" "$porque" "$achados"
}

printf '%sGuarda do sistema visual — Hedge%s\n' "$BOLD" "$OFF"

# ─────────────────────────────────────────────────────────────────────────────
grupo "Ornamento"

regra "sombra esmeralda em botão" \
  "Botão primário se destaca pelo peso e pelo fundo. Sombra colorida vira halo." \
  'shadow-emerald-'

regra "sombra colorida" \
  "A única sombra do produto é a neutra — shadow-sm, shadow-zinc-*. Cor em sombra é ornamento." \
  'shadow-(red|amber|yellow|blue|indigo|violet|purple|pink|rose|orange|lime|green|teal|cyan|sky|fuchsia)-'

regra "scale-x-" \
  "Deformar o eixo X estica a tipografia junto. O indicador da sidebar anima por transform inline." \
  'scale-x-'

regra "backdrop-filter no CSS" \
  "Desfoque de fundo custa caro no scroll e degrada fora do WebKit. Use fundo opaco." \
  'backdrop-filter' "$CSS"

regra "degradê decorativo" \
  "Superfície do produto é chapada. Degradê é linguagem da landing." \
  'bg-gradient-to-'

# ─────────────────────────────────────────────────────────────────────────────
grupo "Escalas"

# Três espaçamentos arbitrários e só três: .16em no rótulo de card e de coluna,
# .20em no eyebrow de página, e −0.015em no numeral grande (Valor herói/destaque
# e os poucos números escritos à mão). Qualquer outro valor é desvio.
regra "tracking fora de .16em/.20em/−0.015em" \
  "Rótulo mono usa .16em (card, coluna) e .20em (eyebrow). Numeral grande usa −0.015em." \
  'tracking-\[' "tudo" \
  'tracking-\[(0?\.(16|2|20)|-0\.015)em\]'

# Vale inclusive para o Valor: −0.05em encosta dígito em dígito no numeral
# tabular, e foi metade do motivo de o valor em Syne parecer apertado. Trocar a
# família sem trocar o tracking traria o defeito de volta.
regra "tracking-tighter" \
  "Aperto de −0.05em cola os dígitos. Numeral usa tracking-[-0.015em]; título usa tracking-tight." \
  'tracking-tighter' "tudo"

regra "raio fora de 8/12/16" \
  "Três raios: rounded-lg (8), rounded-xl (12), rounded-2xl (16) — mais rounded-full em pílula e avatar." \
  'rounded-(3xl|md|sm)\b'

regra "corpo fora de 30/34/44" \
  "Acima de 15px existem três corpos: 30 (Valor destaque), 34 (PageHeader), 44 (Valor herói)." \
  'text-\[(1[6-9]|2[0-9]|3[1-35-9]|4[0-35-9]|[5-9][0-9]|[0-9]{3,})px\]'

# ─────────────────────────────────────────────────────────────────────────────
grupo "Cor"

regra "família fora da paleta" \
  "Quatro famílias: emerald (acento), zinc (neutro), amber (alerta), red (perigo)." \
  '\b(text|bg|border|ring|from|via|to|fill|stroke|decoration|outline|divide|accent|caret|shadow)-(blue|indigo|violet|purple|pink|rose|orange|yellow|lime|green|teal|cyan|sky|fuchsia)-[0-9]'

regra "neutro fora do zinc" \
  "O neutro do app é zinc. gray, slate, neutral e stone desafinam com ele lado a lado." \
  '\b(text|bg|border|ring|from|via|to|fill|stroke|decoration|outline|divide|shadow)-(gray|slate|neutral|stone)-[0-9]'

# Hex cru não é proibido — Recharts e borda de CSS não aceitam classe. O que é
# proibido é hex que não seja um valor da paleta: foi assim que gray-900
# (#111827) entrou nos inputs sem ninguém ver.
PALETA='fff|ffffff|000|000000|transparent'
PALETA="$PALETA|fafafa|f4f4f5|e4e4e7|d4d4d8|a1a1aa|71717a|52525b|3f3f46|27272a|18181b|09090b"  # zinc
PALETA="$PALETA|ecfdf5|d1fae5|a7f3d0|6ee7b7|34d399|10b981|059669|047857|065f46|064e3b|022c22"  # emerald
PALETA="$PALETA|fffbeb|fef3c7|fde68a|fcd34d|fbbf24|f59e0b|d97706|b45309|92400e|78350f"         # amber
PALETA="$PALETA|fef2f2|fee2e2|fecaca|fca5a5|f87171|ef4444|dc2626|b91c1c|991b1b|7f1d1d"         # red
PALETA="$PALETA|0a0a0b|fcfcfc"                                                                 # tokens da marca

hex_fora=$(grep -rnoE --include='*.tsx' --include='*.ts' --include='*.css' \
             '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\b' "$SRC" 2>/dev/null \
           | grep -viE ":#($PALETA)\$" | grep -vE "$MARCA" | sem_dsok || true)
reportar "hex fora da paleta" \
  "Hex é aceito onde classe não entra (Recharts, borda CSS) — desde que o valor seja da paleta." \
  "$hex_fora"

# ─────────────────────────────────────────────────────────────────────────────
grupo "Componentes"

regra "text-[34px] fora do PageHeader" \
  "O corpo do h1 de página mora no PageHeader. Quem precisa dele importa o componente." \
  'text-\[34px\]' "tudo" \
  'ui/PageHeader\.tsx'

regra "string de card escrita à mão" \
  "A superfície branca é o Card. Copiar a string é como o shadow-sm sumiu de metade das telas." \
  'bg-white[^"'"'"'\`]*dark:bg-zinc-900[^"'"'"'\`]*rounded-2xl' "produto" \
  'ui/Card\.tsx'

regra "tabular-nums redefinido no CSS" \
  "Quem pede tabular-nums é a classe .valor. Regra ampla rouba a utility do Tailwind." \
  'font-variant-numeric' "$CSS"

# ─────────────────────────────────────────────────────────────────────────────
grupo "Dinheiro"

regra "valor dentro de elemento que trunca" \
  "R\$ 1.240,00 truncado vira R\$ 1.24… — o número fica errado, não só cortado." \
  '(\bvalor\b[^"'"'"'\`]*\btruncate\b|\btruncate\b[^"'"'"'\`]*\bvalor\b)' "tudo"

regra "símbolo removido à mão" \
  "Tirar o R\$ com replace quebra em pt-BR (espaço fino). formatCurrency tem variante sem símbolo." \
  'replace\([^)]*R\\?\$' "tudo"

regra "toLocaleString fora do utils" \
  "Formatação de número mora em src/utils/ — moeda com regra própria não pode divergir por tela." \
  '\.toLocaleString\(|Intl\.NumberFormat' "tudo" \
  '^src/utils/'

regra "tipo vazando como categoria" \
  "categoria_gasto || categoria faz 'dividido' virar fatia do gráfico. Use categoriaDeGasto()." \
  'categoria_gasto\s*\|\|\s*categoria' "tudo"

# ─────────────────────────────────────────────────────────────────────────────
grupo "Acessibilidade"

# `onClick` e a tag que o recebe quase nunca estão na mesma linha, então grep de
# linha não serve. Este awk acompanha a tag aberta pelo fluxo do arquivo: corta
# cada linha nos `<`, guarda o nome da tag mais recente e acusa o `onClick=` que
# cair dentro de uma `div` ou `span`.
clique=$(find "$SRC" -name '*.tsx' -print0 2>/dev/null | xargs -0 awk '
  FNR == 1 { tag = ""; abriu = 0 }
  {
    n = split($0, parte, "<")
    for (k = 1; k <= n; k++) {
      seg = parte[k]
      if (k > 1) {
        if (substr(seg, 1, 1) == "/") { tag = "" }
        else if (match(seg, /^[A-Za-z][A-Za-z0-9._]*/)) {
          tag = substr(seg, RSTART, RLENGTH); abriu = FNR
        }
      }
      # Reporta a linha do próprio `onClick`, não a da abertura da tag: é lá que
      # o `ds-ok` cabe, já que dentro da tag o comentário fica solto no meio dos
      # atributos.
      if (seg ~ /onClick=/ && (tag == "div" || tag == "span")) {
        if (visto[FILENAME ":" abriu] == 0) {
          visto[FILENAME ":" abriu] = 1
          print FILENAME ":" FNR ": <" tag " …onClick="
        }
      }
    }
  }
' | sem_dsok)
reportar "onClick em div/span" \
  "Elemento clicável precisa de foco e de tecla. Use <button> — ou role, tabIndex e onKeyDown." \
  "$clique"

# ─────────────────────────────────────────────────────────────────────────────
printf '\n'
if [ "$violacoes" -eq 0 ]; then
  printf '%s✓ nenhuma violação%s\n' "$GREEN" "$OFF"
  exit 0
fi

printf '%s✗ %d violação(ões)%s\n' "$RED" "$violacoes" "$OFF"
printf '%sCorrija, ou marque a linha com ds-ok e o motivo se a exceção se justifica.%s\n' "$YELLOW" "$OFF"
exit 1
