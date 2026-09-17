#!/bin/sh
# Exit 0 when the app is identified as a TUI app: metadata.yml tags
# containing "tui" or "terminal" (case-insensitive). metadata.yml is the
# omapak-controlled submission file — the same signal the judge's static
# stage reads via omapak_core::Metadata.tags, kept in sync for the
# publish.yml build loop, which drives flatpak-builder directly.
#
# Handles every tags style:
#   tags: [terminal, music]
#   tags:
#     - terminal
#   "tags": [
#     "terminal"
#   ],
set -u

[ "$#" -ge 1 ] || exit 1
meta=$1/metadata.yml
[ -f "$meta" ] || exit 1

tags=$(awk 'match($0, /^[[:space:]]*"?tags"?[[:space:]]*:/) {
         rest = substr($0, RSTART + RLENGTH)
         if (rest ~ /\]/) {
           gsub(/[][]/, " ", rest); gsub(/,/, " ", rest)
           print rest; exit
         }
         if (rest ~ /\[/) { inf=1; next }
         f=1; next
       }
       inf { if ($0 ~ /\]/) exit; print; next }
       f && /^[[:space:]]*-/ {print; next}
       f {exit}' "$meta" \
    | tr "A-Z" "a-z" | tr ",[]\"'-" "       ")

printf '%s\n' "$tags" | grep -qwE "tui|terminal"
