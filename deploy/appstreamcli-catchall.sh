#!/bin/sh
# omapak TUI catchall icon shim — installed as /usr/local/bin/appstreamcli
# by judge.yml and publish.yml (PATH precedes /usr/bin, and flatpak-builder
# 1.4.11 spawns bare `appstreamcli compose …` resolved through PATH).
#
# A TUI submission (metadata.yml tags: tui|terminal) may ship no artwork;
# its desktop file then names a stock icon and `appstreamcli compose` dies
# at export with icon-not-found. When OMAPAK_TUI_CATCHALL=1 and compose
# fails, inject the omapak catchall PNG under the missing icon's name and
# re-run — the desktop file's Icon= then resolves to it at runtime too.
# GUI apps keep the requirement: without the env var every failure passes
# through untouched.
#
# The icon name is not always in compose's stdout (flatpak-builder runs see
# only "Refer to the generated issue report data"), so a failing TUI build
# gets one diagnostic re-run with --print-report=full to surface it.
set -u

REAL=/usr/bin/appstreamcli
CATCHALL=${OMAPAK_TUI_ICON:-/usr/local/share/omapak/tui.png}

# Options that consume the following argument. flatpak-builder calls
# compose with these only; an unknown --flag=value is self-contained.
VALFLAGS=" --prefix --result-root --data-dir --icons-dir --media-dir --hints-dir --origin --media-baseurl --print-report --components --icon-policy --image-format --allow-custom "

# First positional SOURCE directory (a real dir) from argv.
source_dir() {
  sd_prev=""
  for sd_a in "$@"; do
    case "$sd_a" in
      --*) case "$VALFLAGS" in *" $sd_a "*) sd_prev=1 ;; *) sd_prev="" ;; esac ;;
      *)  if [ -n "$sd_prev" ]; then sd_prev=""
          elif [ -d "$sd_a" ]; then printf '%s\n' "$sd_a"; return 0; fi ;;
    esac
  done
  return 1
}

# Value of --prefix from argv, leading slashes stripped ("" if absent).
prefix_value() {
  pv_prev=""
  for pv_a in "$@"; do
    case "$pv_a" in
      --prefix=*) printf '%s\n' "${pv_a#--prefix=}"; return 0 ;;
      --prefix) pv_prev=1 ;;
      *)  [ -n "$pv_prev" ] && { printf '%s\n' "$pv_a" | sed 's|^/*||'; return 0; } ;;
    esac
  done
  return 1
}

# Where hicolor app icons live inside the source unit: under the prefix
# when compose was given one, else an existing hicolor tree, else the
# conventional top-level share/.
icon_dir() {
  id_src=$1; shift
  if id_p=$(prefix_value "$@") && [ -n "$id_p" ] && [ -d "$id_src/$id_p" ]; then
    printf '%s\n' "$id_src/$id_p/share/icons/hicolor/512x512/apps"; return 0
  fi
  id_existing=$(find "$id_src" -type d -path '*/share/icons/hicolor/*/apps' 2>/dev/null | head -1)
  if [ -n "$id_existing" ]; then printf '%s\n' "$id_existing"; return 0; fi
  printf '%s\n' "$id_src/share/icons/hicolor/512x512/apps"
}

# "The icon <name> was not found" from compose output; name sanitized to a
# single path component (it names an icon, never a traversal).
icon_name_from() {
  in_name=$(printf '%s\n' "$1" | sed -n 's/.*The icon \([^ ]*\) was not found.*/\1/p' | head -1)
  printf '%s\n' "$in_name" | tr -cd 'A-Za-z0-9._-' | head -c 128
}

# Diagnostic argv on stdout: original minus --print-report (and its value),
# plus --print-report=full. Values of --print-report are the known words
# full|short|on-error; anything else after a bare --print-report is
# positional and kept.
diag_argv() {
  da_prev=""
  for da_a in "$@"; do
    case "$da_a" in
      --print-report=*) ;;
      --prefix|--result-root|--data-dir|--icons-dir|--media-dir|--hints-dir|--origin|--media-baseurl|--components|--icon-policy|--image-format|--allow-custom)
        printf '%s\n' "$da_a" ;;
      --print-report) da_prev=1 ;;
      *)  if [ "$da_prev" = 1 ]; then
            case "$da_a" in full|short|on-error) ;; *) printf '%s\n' "$da_a" ;; esac
            da_prev=""
          else
            printf '%s\n' "$da_a"
          fi ;;
    esac
  done
  printf '%s\n' "--print-report=full"
}

out=$("$REAL" "$@" 2>&1); rc=$?
printf '%s\n' "$out"
[ "$rc" -eq 0 ] && exit 0
[ "${1-}" = "compose" ] || exit "$rc"
[ "${OMAPAK_TUI_CATCHALL:-0}" = "1" ] || exit "$rc"
[ -f "$CATCHALL" ] || exit "$rc"

src=$(source_dir "$@") || exit "$rc"

attempt=0
detail=$out
while [ "$rc" -ne 0 ] && [ "$attempt" -lt 3 ]; do
  name=$(icon_name_from "$detail")
  if [ -z "$name" ]; then
    # shellcheck disable=SC2046
    detail=$("$REAL" $(diag_argv "$@") 2>&1)
    printf '%s\n' "$detail"
    name=$(icon_name_from "$detail")
    [ -n "$name" ] || break
  fi
  dir=$(icon_dir "$src" "$@")
  if mkdir -p "$dir" && cp "$CATCHALL" "$dir/$name.png"; then
    echo "omapak: injected TUI catchall icon '$name' (app ships none)"
  else
    echo "omapak: failed to inject catchall icon into $dir" >&2
    break
  fi
  out=$("$REAL" "$@" 2>&1); rc=$?
  printf '%s\n' "$out"
  detail=$out
  attempt=$((attempt + 1))
done

exit "$rc"
