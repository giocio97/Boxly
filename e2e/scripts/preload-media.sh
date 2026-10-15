#!/usr/bin/env bash
# Precarica la foto di test nella libreria del simulatore iOS e/o dell'emulatore Android.
# Uso: e2e/scripts/preload-media.sh [ios|android|all]
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
IMG="$DIR/fixtures/maglione.jpg"
TARGET="${1:-all}"
if [[ "$TARGET" == ios || "$TARGET" == all ]]; then
  xcrun simctl addmedia booted "$IMG" && echo "iOS: foto aggiunta"
fi
if [[ "$TARGET" == android || "$TARGET" == all ]]; then
  adb push "$IMG" /sdcard/Pictures/maglione.jpg
  adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Pictures/maglione.jpg >/dev/null || true
  echo "Android: foto aggiunta"
fi
