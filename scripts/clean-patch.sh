#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <patch-file> [fromext=toext]"
  echo "Example: $0 src/patches/pwa-fix.patch mjs=cjs"
  exit 1
fi

IN="$1"
RETARGET="${2:-}"   # optional: mjs=cjs

[[ -f "$IN" ]] || { echo "No such file: $IN"; exit 2; }

tmp_bom="$(mktemp)"
tmp_out="$(mktemp)"

# 1) Strip UTF-8 BOM if present (EF BB BF)
if head -c 3 "$IN" | od -An -t x1 | tr -d ' \n' | grep -qi '^efbbbf$'; then
  tail -c +4 "$IN" > "$tmp_bom"
else
  cp "$IN" "$tmp_bom"
fi

# 2) Normalize CRLF→LF, drop preface before first 'diff --git',
#    and remove Markdown code fences (```).
tr -d '\r' < "$tmp_bom" \
| awk 'BEGIN{emit=0} /^diff --git /{emit=1} { if (emit) print }' \
| grep -v '^```$' > "$tmp_out"

# 3) Optional: retarget file extension occurrences (e.g., mjs→cjs)
if [[ -n "$RETARGET" && "$RETARGET" == *=* ]]; then
  from="${RETARGET%%=*}"
  to="${RETARGET#*=}"
  # Replace only the quasar.config.* occurrences (safe + focused).
  awk -v f="$from" -v t="$to" \
      '{ gsub("quasar.config." f, "quasar.config." t); print }' \
      "$tmp_out" > "${tmp_out}.ret" && mv "${tmp_out}.ret" "$tmp_out"
fi

# 4) Write back
mv "$tmp_out" "$IN"
rm -f "$tmp_bom"

echo "✔ Cleaned: $IN"
echo "Tip: dry-run apply:"
echo "  git apply --check \"$IN\" || git apply --whitespace=fix --check \"$IN\""
