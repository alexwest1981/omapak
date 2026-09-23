#!/bin/bash
# Local end-to-end test of the publish pipeline mechanics.
#
# The publish workflow can only be exercised against the real bucket
# state (76k objects, deliberately missing pieces: metadata-only flathub
# mirrors, refs whose dirtrees 404). Until this script existed, every
# pipeline bug cost a full CI cycle — 20min restore + 2h build + 1h push
# with zero mid-run logs; four such runs burned most of 2026-09-19.
#
# This mirrors the runner's repo state over public HTTP (no R2 creds
# needed) and then drives the real pipeline steps with the real tools:
# ghost purge → seed validation → flatpak build-export with appstream
# regeneration (the step that failed four times in CI) → pull-local →
# NOW restamp → summary. One iteration ≈ 15min mirror + <1min test.
#
# Usage: deploy/test-pipeline-locally.sh [workdir]   (default /tmp/omapak-pipeline-test)
set -euo pipefail

WD=${1:-/tmp/omapak-pipeline-test}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
REMOTE_URL=${OMAPAK_REMOTE_URL:-https://repo.omapak.org/}

# A tiny export-dir fixture (metadata + files + appdata + icon), the
# shape flatpak-builder hands to `flatpak build-export`.
make_fixture() {
  local d=$1 id=io.outcroplabs.PipelineFixture
  mkdir -p "$d/files/bin" "$d/export/share/metainfo" \
    "$d/export/share/applications" "$d/export/share/icons/hicolor/64x64/apps"
  printf '[Application]\nname=%s\nruntime=org.gnome.Platform/x86_64/48\ncommand=fixture\n' "$id" > "$d/metadata"
  printf '#!/bin/sh\necho fixture\n' > "$d/files/bin/fixture" && chmod +x "$d/files/bin/fixture"
  printf '<?xml version="1.0" encoding="UTF-8"?>\n<component type="desktop-application">\n <id>%s</id>\n <name>Pipeline Fixture</name>\n <summary>Local pipeline test fixture</summary>\n <metadata_license>CC0-1.0</metadata_license>\n <project_license>MIT</project_license>\n <launchable type="desktop-id">%s.desktop</launchable>\n</component>\n' "$id" "$id" > "$d/export/share/metainfo/$id.appdata.xml"
  printf '[Desktop Entry]\nType=Application\nName=Pipeline Fixture\nExec=fixture\nIcon=%s\n' "$id" > "$d/export/share/applications/$id.desktop"
  printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' | base64 -d > "$d/export/share/icons/hicolor/64x64/apps/$id.png"
}

echo "== mirror runner repo state from $REMOTE_URL =="
rm -rf "$WD" && mkdir -p "$WD"/replica/{objects,extensions} "$WD"/replica/refs/{heads,remotes,mirrors}
printf '[core]\nrepo_version=1\nmode=archive-z2\n' > "$WD/replica/config"
ostree remote add --repo="$WD/replica" --no-gpg-verify omapak "$REMOTE_URL"

flatpak remote-ls --user --columns=ref omapak 2>/dev/null | grep -E '^(app|runtime)/' > "$WD/refs.txt" || {
  echo "add the omapak remote first: flatpak --user remote-add --if-not-exists omapak $REMOTE_URL/omapak.flatpakrepo" >&2; exit 1; }

# metadata-only mirror of everything (runner-equivalent: flathub mirrors
# carry commit objects but no trees)
split -l 600 "$WD/refs.txt" "$WD/batch-"
for b in "$WD"/batch-*; do
  ostree pull --repo="$WD/replica" --mirror --commit-metadata-only omapak $(cat "$b" | tr '\n' ' ') >/dev/null 2>&1 || true
done

# full pull for omapak app refs; refs whose trees 404 (bucket rot) are
# recorded — the seed validation must skip exactly these
ls "$ROOT/apps" > "$WD/apps.txt"
broken=""
while read -r ref; do
  name=$(echo "$ref" | cut -d/ -f2)
  grep -qx "$name" "$WD/apps.txt" || continue
  ostree pull --repo="$WD/replica" omapak "$ref" >/dev/null 2>&1 || broken="$broken $ref"
done < <(grep '^app/' "$WD/refs.txt")
echo "broken omapak refs (expect seed-skip):$broken"

# heads layout like the runner's restore (restore copies ref files;
# pulls above wrote mirrors/remotes)
find "$WD/replica/refs/mirrors" -type f 2>/dev/null | while read -r f; do
  dest="$WD/replica/refs/heads/${f#*mirrors/omapak/}"
  mkdir -p "$(dirname "$dest")"; cp "$f" "$dest"
done
find "$WD/replica/refs/remotes" -type f 2>/dev/null | while read -r f; do
  dest="$WD/replica/refs/heads/${f#*remotes/omapak/}"
  mkdir -p "$(dirname "$dest")"; cp "$f" "$dest"
done
rm -rf "$WD/replica/refs/mirrors"/* "$WD/replica/refs/remotes"/* 2>/dev/null || true

echo "== ghost purge (workflow step, verbatim logic) =="
dropped=0
for reffile in $(find "$WD/replica/refs" -type f); do
  sha=$(cat "$reffile")
  if [ ! -f "$WD/replica/objects/${sha:0:2}/${sha:2}.commit" ]; then
    rm -f "$reffile"; dropped=$((dropped+1))
  fi
done
echo "dropped $dropped refs with missing commit objects"

echo "== seed scratch repo (workflow block logic) =="
mkdir -p "$WD"/scratch/{objects,extensions} "$WD"/scratch/refs/{heads,remotes,mirrors}
printf '[core]\nrepo_version=1\nmode=archive-z2\n' > "$WD/scratch/config"
for reffile in $(find "$WD/replica/refs/heads/app" -type f 2>/dev/null); do
  rel="${reffile#"$WD/replica/refs/heads/"}"
  name=$(echo "$rel" | cut -d/ -f2)
  [ -d "$ROOT/apps/$name" ] || continue
  ostree ls -R --repo="$WD/replica" "$rel" >/dev/null 2>&1 || continue
  mkdir -p "$(dirname "$WD/scratch/refs/heads/$rel")"
  cp "$reffile" "$WD/scratch/refs/heads/$rel"
done
cp -al "$WD/replica/objects/." "$WD/scratch/objects/" 2>/dev/null || cp -a "$WD/replica/objects/." "$WD/scratch/objects/"
echo "seeded $(find "$WD/scratch/refs/heads/app" -type f | wc -l) omapak refs"
for b in $broken; do
  [ -f "$WD/scratch/refs/heads/$b" ] && { echo "FAIL: broken ref $b was seeded"; exit 1; }
done

echo "== export fixture with appstream regeneration =="
make_fixture "$WD/fixture"
flatpak build-export --update-appstream --disable-fsync "$WD/scratch" "$WD/fixture" master >/dev/null
entries=$(ostree cat --repo="$WD/scratch" appstream/x86_64 appstream.xml.gz | gunzip | grep -c '<id>')
echo "appstream entries: $entries (fixture + seeded apps)"
[ "$entries" -gt 1 ] || { echo "FAIL: appstream lost the seeded apps"; exit 1; }

echo "== pull-local + NOW restamp + summary =="
ostree pull-local --repo="$WD/replica" "$WD/scratch" >/dev/null
for ref in app/io.outcroplabs.PipelineFixture/x86_64/master appstream/x86_64 appstream2/x86_64; do
  [ -f "$WD/replica/refs/heads/$ref" ] || continue
  flatpak build-commit-from --timestamp=NOW --force --no-update-summary \
    --src-repo="$WD/replica" "$WD/replica" "$ref" >/dev/null
done
ostree summary --update --repo="$WD/replica" >/dev/null
echo "PIPELINE LOCAL TEST PASSED"
