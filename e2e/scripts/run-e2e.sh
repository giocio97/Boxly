#!/usr/bin/env bash
# Esegue la suite Maestro. Uso: e2e/scripts/run-e2e.sh ios|android
#  ios     → suite completa e2e/*.yaml su build nativa com.boxly.app (simulatore "iPhone 17 Pro")
#  android → smoke e2e/android/*.yaml in Expo Go (host.exp.exponent), dev server su :8082
# Prerequisiti: supabase start && supabase db reset; Metro attivo (8081 iOS / 8082 Expo Go Android).
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
P="${1:?ios|android}"
IOS_DEVICE="${IOS_DEVICE:-$(xcrun simctl list devices booted | grep -m1 'iPhone 17 Pro (' | grep -oE '[0-9A-F-]{36}')}"
ANDROID_DEVICE="${ANDROID_DEVICE:-emulator-5554}"
"$DIR/scripts/preload-media.sh" "$P"
cd "$DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
OUT="reports/$P/$STAMP"
mkdir -p "$OUT"
set +e
if [[ "$P" == ios ]]; then
  maestro --device "$IOS_DEVICE" test . --format junit --output "$OUT/junit.xml" --test-output-dir "$OUT"
else
  maestro --device "$ANDROID_DEVICE" test android/ --format junit --output "$OUT/junit.xml" --test-output-dir "$OUT"
fi
RC=$?
set -e
# raccoglie gli screenshot dei takeScreenshot in e2e/screenshots/<piattaforma>/
mkdir -p "screenshots/$P"
find "$OUT" -path '*takeScreenshot*' -name '*.png' -exec cp {} "screenshots/$P/" \;
echo "Report: $DIR/$OUT/junit.xml — screenshot: $DIR/screenshots/$P/"
exit $RC
