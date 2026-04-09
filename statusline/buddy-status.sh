#!/usr/bin/env bash
# claude-buddy status line — multi-line companion display
# Uses Braille Blank (U+2800) for indentation because Claude Code's
# status line renderer calls .trim() on each line, stripping normal spaces.
# Braille Blank survives JS trim() but renders as whitespace.

STATE="$HOME/.claude-buddy/status.json"
COMPANION="$HOME/.claude-buddy/companion.json"

[ -f "$STATE" ] || exit 0
[ -f "$COMPANION" ] || exit 0

MUTED=$(jq -r '.muted // false' "$STATE" 2>/dev/null)
[ "$MUTED" = "true" ] && exit 0

NAME=$(jq -r '.name // ""' "$STATE" 2>/dev/null)
[ -z "$NAME" ] && exit 0

SPECIES=$(jq -r '.species // ""' "$STATE" 2>/dev/null)
HAT=$(jq -r '.hat // "none"' "$STATE" 2>/dev/null)
SHINY=$(jq -r '.shiny // false' "$STATE" 2>/dev/null)
STARS=$(jq -r '.stars // ""' "$STATE" 2>/dev/null)
REACTION=$(jq -r '.reaction // ""' "$STATE" 2>/dev/null)
E=$(jq -r '.bones.eye // "°"' "$COMPANION" 2>/dev/null)

# Drain stdin
cat > /dev/null

# Braille Blank — survives JavaScript .trim(), renders as space
B=$'\xe2\xa0\x80'

# ─── Species art (using $B for trim-safe indentation) ────────────────────────
case "$SPECIES" in
  duck)
    L1="${B}${B}${B}__"
    L2="${B}<(${E} )___"
    L3="${B}${B}(  ._>"
    L4="${B}${B}${B}\`--'"
    ;;
  goose)
    L1="${B}${B}(${E}>"
    L2="${B}${B}${B}||"
    L3="${B}_(__)_"
    L4="${B}${B}^^^^"
    ;;
  blob)
    L1="${B}.----."
    L2="( ${E}  ${E} )"
    L3="(      )"
    L4="${B}\`----'"
    ;;
  cat)
    L1="${B}/\\_/\\"
    L2="( ${E} ${E} )"
    L3="${B}( ω )"
    L4="(\")_(\")"
    ;;
  dragon)
    L1="/^\\  /^\\"
    L2="< ${E}  ${E} >"
    L3="(  ~~  )"
    L4="${B}\`vvvv'"
    ;;
  octopus)
    L1="${B}.----."
    L2="( ${E}  ${E} )"
    L3="(______)"
    L4="/\\/\\/\\/\\"
    ;;
  owl)
    L1="${B}/\\  /\\"
    L2="((${E})(${E}))"
    L3="(  ><  )"
    L4="${B}\`----'"
    ;;
  penguin)
    L1="${B}.---."
    L2="${B}(${E}>${E})"
    L3="/(   )\\"
    L4="${B}\`---'"
    ;;
  turtle)
    L1="${B}_,--._"
    L2="( ${E}  ${E} )"
    L3="[______]"
    L4="\`\`    \`\`"
    ;;
  snail)
    L1="${E}   .--."
    L2="\\  ( @ )"
    L3="${B}\\_\`--'"
    L4="~~~~~~~"
    ;;
  ghost)
    L1="${B}.----."
    L2="/ ${E}  ${E} \\"
    L3="|      |"
    L4="~\`~\`\`~\`~"
    ;;
  axolotl)
    L1="}~(____)~{"
    L2="}~(${E}..${E})~{"
    L3="${B}(.--. )"
    L4="${B}(_/ \\_)"
    ;;
  capybara)
    L1="n______n"
    L2="( ${E}    ${E} )"
    L3="(  oo  )"
    L4="\`------'"
    ;;
  cactus)
    L1="n ____  n"
    L2="||${E}  ${E}||"
    L3="|_|  |_|"
    L4="${B}${B}|  |"
    ;;
  robot)
    L1="${B}.[||]."
    L2="[ ${E}  ${E} ]"
    L3="[ ==== ]"
    L4="\`------'"
    ;;
  rabbit)
    L1="${B}(\\__/)"
    L2="( ${E}  ${E} )"
    L3="(  ..  )"
    L4="(\")__(\")"
    ;;
  mushroom)
    L1="-o-OO-o-"
    L2="(________)"
    L3="${B}${B}|${E}${E}|"
    L4="${B}${B}|__|"
    ;;
  chonk)
    L1="/\\    /\\"
    L2="( ${E}    ${E} )"
    L3="(  ..  )"
    L4="\`------'"
    ;;
  *)
    L1="(${E}${E})"
    L2="(  )"
    L3=""
    L4=""
    ;;
esac

# ─── Hat ──────────────────────────────────────────────────────────────────────
HAT_LINE=""
case "$HAT" in
  crown)     HAT_LINE="${B}\\^^^/" ;;
  tophat)    HAT_LINE="${B}[___]" ;;
  propeller) HAT_LINE="${B}${B}-+-" ;;
  halo)      HAT_LINE="${B}(   )" ;;
  wizard)    HAT_LINE="${B}${B}/^\\" ;;
  beanie)    HAT_LINE="${B}(___)" ;;
  tinyduck)  HAT_LINE="${B}${B},>" ;;
esac

# ─── Label ────────────────────────────────────────────────────────────────────
SHINY_ICON=""
[ "$SHINY" = "true" ] && SHINY_ICON="✨"

BUBBLE=""
if [ -n "$REACTION" ] && [ "$REACTION" != "null" ] && [ "$REACTION" != "" ]; then
    BUBBLE="\"${REACTION}\""
fi

# ─── Output ───────────────────────────────────────────────────────────────────
[ -n "$HAT_LINE" ] && echo "$HAT_LINE"
echo "$L1"
echo "$L2"
echo "$L3"
[ -n "$L4" ] && echo "$L4"
echo "$NAME $SHINY_ICON$STARS"
if [ -n "$BUBBLE" ]; then
    echo "$BUBBLE"
fi

exit 0
