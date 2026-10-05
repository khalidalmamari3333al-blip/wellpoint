#!/bin/sh
# Bundles src/ into a single self-contained wellpoint.html
set -e
cd "$(dirname "$0")"
{
  echo '<title>Wellpoint</title>'
  echo '<meta name="description" content="Wellpoint — patient-centered continuous care platform prototype">'
  echo '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=El+Messiri:wght@500;600;700&family=Readex+Pro:wght@300;400;500;600&family=Noto+Serif+SC:wght@500;600&family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@500&display=swap">'
  echo '<style>'; cat src/styles.css; echo '</style>'
  echo '<div id="app"><div style="padding:40px 16px;text-align:center;font-family:system-ui">Loading Wellpoint…</div></div><div id="layer"></div><div id="toasts" class="toast-wrap" aria-live="polite"></div>'
  echo '<script>'
  for f in data i18n-en i18n-ar i18n-zh core ui-base ui-patient ui-wellbeing ui-clinic events; do cat "src/$f.js"; echo; done
  echo '</script>'
} > wellpoint.html
echo "built wellpoint.html ($(wc -c < wellpoint.html) bytes)"
