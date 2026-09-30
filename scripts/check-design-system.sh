#!/usr/bin/env bash
#
# Guarda do sistema visual — Hedge
#
# O sistema mora em src/index.css (tokens) e tailwind.config.js (cores que
# leem os tokens, raio de 2/4px, pesos até 500). Este script segura o que
# continua sendo convenção: nada de cor fixa, de verde, de raio grande, de
# rótulo em caixa-alta, de ornamento.
#
# Uma linha pode ser dispensada com um comentário `ds-ok` acompanhado do motivo,
# na própria linha ou na de cima:
#
#     <span className="rounded-full" /> {/* ds-ok: ponto de categoria de 8px */}
#
# Dispensar uma linha é saudável. Enfraquecer uma regra para calar um caso, não.
#
# MIGRAÇÃO. O redesign acontece por fases, e os arquivos ainda no visual
# anterior estão listados em scripts/ds-legado.txt. As regras de VISUAL não
# olham para eles; as de dinheiro e acessibilidade valem para todos. Cada fase
# tira da lista o que migrou. Lista vazia = redesign concluído.
#
# Uso:  ./scripts/check-design-system.sh
# Saída: 0 = limpo · 1 = violação encontrada

set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

SRC="src"
CSS="src/index.css"

# Peças de marca: a landing e o login. Têm tokens próprios (.lp) e outra
# gramática. As regras de dinheiro e de acessibilidade valem para elas também.
MARCA='(LandingPage|Login)\.tsx|src/components/landing/|src/content/'

# Arquivos ainda no visual anterior, um por linha, como um regex só.
LEGADO_ARQ="scripts/ds-legado.txt"
LEGADO='^$'
if [ -s "$LEGADO_ARQ" ]; then
  LEGADO=$(grep -vE '^\s*(#|$)' "$LEGADO_ARQ" | sed 's/[.]/\\./g; s/^/^/; s/$/:/' | paste -sd'|' -)
  [ -z "$LEGADO" ] && LEGADO='^$'
fi

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'
DIM=$'\033[2m'; BOLD=$'\033[1m'; OFF=$'\033[0m'
if [ ! -t 1 ] || [ -n "${NO_COLOR:-}" ]; then RED=; GREEN=; YELLOW=; DIM=; BOLD=; OFF=; fi

violacoes=0

grupo() { printf '\n%s%s%s\n' "$BOLD" "$1" "$OFF"; }

# Filtra registros `arquivo:linha:…` dispensados por `ds-ok` (na linha ou na de cima).
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

# regra <nome> <porquê> <padrão> [escopo] [exceção-erx]
#
#   escopo   "visual"  (padrão) — produto migrado: sem marca e sem legado
#            "produto" — produto inteiro, legado incluído, sem marca
#            "tudo"    — todo o src
#            <caminho> — um arquivo só
#
#   exceção  ERX sobre `arquivo:nº:conteúdo` para o arquivo que DEFINE o padrão.
REGRA_GREP=E

regra() {
  local nome="$1" porque="$2" padrao="$3" escopo="${4:-visual}" excecao="${5:-}"
  local alvo="$SRC" achados

  case "$escopo" in visual|produto|tudo) ;; *) alvo="$escopo" ;; esac
  [ -e "$alvo" ] || return 0

  # O ds-ok é o filtro caro (um sed por achado), então roda por último.
  achados=$(grep -rHn"$REGRA_GREP" --include='*.tsx' --include='*.ts' --include='*.css' "$padrao" "$alvo" 2>/dev/null || true)

  if [ "$escopo" = "visual" ] || [ "$escopo" = "produto" ]; then
    achados=$(printf '%s' "$achados" | grep -vE "$MARCA" || true)
  fi
  if [ "$escopo" = "visual" ]; then
    achados=$(printf '%s' "$achados" | grep -vE "$LEGADO" || true)
  fi
  if [ -n "$excecao" ]; then
    achados=$(printf '%s' "$achados" | grep -vE "$excecao" || true)
  fi
  achados=$(printf '%s\n' "$achados" | sem_dsok || true)

  reportar "$nome" "$porque" "$achados"
}

regra_p() {
  REGRA_GREP=P
  regra "$@"
  REGRA_GREP=E
}

if ! printf 'a' | grep -qP 'a(?!b)' 2>/dev/null; then
  printf '%sgrep sem suporte a -P (PCRE) — as regras com lookahead não podem rodar.%s\n' "$RED" "$OFF"
  exit 1
fi

printf '%sGuarda do sistema visual — Hedge%s\n' "$BOLD" "$OFF"

# ─────────────────────────────────────────────────────────────────────────────
grupo "Tipografia"

regra "Syne ou família antiga" \
  "Switzer em todo texto e Geist Mono nos números. A Syne e a Geist saíram do projeto." \
  "Syne|font-display|font-num|'Geist'|\"Geist\"" "tudo"

regra "peso acima de 500" \
  "Pesos entre 400 e 500. Hierarquia vem de corpo e cor, não de negrito." \
  '\bfont-(semibold|bold|extrabold|black)\b|font-\[[6-9]00\]'

regra "caixa-alta" \
  "Rótulo é sentence case em Switzer. Caixa-alta monoespaçada é o tique que o redesign tirou." \
  '\buppercase\b'

regra "tracking de rótulo" \
  "Espaçamento largo só existia para a caixa-alta. Número de destaque usa −0.02em." \
  'tracking-(wide|wider|widest)\b|tracking-\[0?\.[0-9]+em\]'

regra "seta em texto" \
  "Link e botão dizem o que fazem; a seta → é enfeite." \
  '→' "visual" \
  '^[^:]+:[0-9]+:\s*(//|\*|/\*|\{/\*)'

regra_p "emoji" \
  "Nada de emoji ou ícone decorativo na interface." \
  '[\x{1F300}-\x{1FAFF}\x{2600}-\x{26FF}]'

# ─────────────────────────────────────────────────────────────────────────────
grupo "Cor"

regra "cor fixa do Tailwind" \
  "Toda cor vem dos tokens: page, surface-1/2/3, line, fg/fg-2/fg-3, accent, danger, cat-1…8." \
  '\b(text|bg|border|ring|fill|stroke|divide|outline|from|via|to|shadow|decoration|placeholder|caret|accent)-(white|black|zinc|slate|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)\b'

regra "verde" \
  "Não existe verde na interface. Positivo é --fg com sinal; ok é --fg-2." \
  '\b(emerald|green|lime|teal)-[0-9]'

regra "variante dark:" \
  "O tema troca pelos tokens. Classe dark: em arquivo migrado é cor escrita duas vezes." \
  '\bdark:'

hex_fora=$(grep -rnoE --include='*.tsx' --include='*.ts' --include='*.css' \
             '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\b' "$SRC" 2>/dev/null \
           | grep -vE "^$CSS:" | grep -vE "$MARCA" | grep -vE "$LEGADO" | sem_dsok || true)
reportar "hex fora do index.css" \
  "Hex mora nos tokens. Recharts lê var(--…); cor de cartão escolhida pela pessoa leva ds-ok." \
  "$hex_fora"

# ─────────────────────────────────────────────────────────────────────────────
grupo "Forma e ornamento"

regra "raio acima de 4px" \
  "Dois raios: rounded-sm (2px) em pílula, campo e bloco de ícone; rounded (4px) em card e botão." \
  'rounded(-[trbl]{1,2})?-(md|lg|xl|2xl|3xl|\[)'

regra "rounded-full" \
  "Forma de pílula não existe. O único círculo é o ponto de 8px, e ele leva ds-ok." \
  'rounded-full'

regra "sombra" \
  "Card não tem sombra nem borda: a separação é a diferença entre --bg e --surface-1." \
  '\bshadow(-(sm|md|lg|xl|2xl|inner|\[))?\b' "visual" \
  'shadow-none'

regra "desfoque e vidro" \
  "Nada de glassmorphism: fundo opaco." \
  'backdrop-blur|backdrop-filter|\bblur-'

regra "degradê" \
  "Superfície é chapada. O único degradê é o da área do gráfico, e ele mora no tema do gráfico." \
  'bg-gradient-to-|linear-gradient|radial-gradient' "visual" \
  '^src/index\.css:'

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

regra "chave de mês montada fora do utils" \
  "Chave de pagamentos_parciais vem de chaveMesPagamentoParcial(). Formato inline diverge calado." \
  '\.eq\("mes",\s*(format|`|'"'"'|")' \
  produto

regra "tabular-nums redefinido no CSS" \
  "Quem pede tabular-nums é a classe .valor. Regra ampla rouba a utility do Tailwind." \
  'font-variant-numeric' "$CSS"

# ─────────────────────────────────────────────────────────────────────────────
grupo "Acessibilidade"

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
pendentes=$(grep -cvE '^\s*(#|$)' "$LEGADO_ARQ" 2>/dev/null || echo 0)
if [ "$pendentes" -gt 0 ]; then
  printf '%s%d arquivo(s) ainda no visual anterior (scripts/ds-legado.txt).%s\n' "$DIM" "$pendentes" "$OFF"
fi
if [ "$violacoes" -eq 0 ]; then
  printf '%s✓ nenhuma violação%s\n' "$GREEN" "$OFF"
  exit 0
fi

printf '%s✗ %d violação(ões)%s\n' "$RED" "$violacoes" "$OFF"
printf '%sCorrija, ou marque a linha com ds-ok e o motivo se a exceção se justifica.%s\n' "$YELLOW" "$OFF"
exit 1
