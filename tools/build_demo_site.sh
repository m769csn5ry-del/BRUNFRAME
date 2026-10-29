#!/usr/bin/env bash
# Assemble la démo statique (dist/) pour un hébergement de prévisualisation. noindex, aucun secret, aucun checkout.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist/theme dist/preview
cp -r theme/assets dist/theme/assets
cp preview/*.html preview/*.js dist/preview/
cat > dist/index.html <<'H'
<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=/preview/index.html"><title>Breslev Gang — prévisualisation</title></head><body><a href="/preview/index.html">Ouvrir la prévisualisation</a></body></html>
H
cp preview/404.html dist/404.html && sed -i 's|\.\./theme/|/theme/|g; s|src="\([a-z-]*\.js\)"|src="/preview/\1"|g; s|href="\(collection\|index\|product\)\.html|href="/preview/\1.html|g' dist/404.html
printf 'User-agent: *\nDisallow: /\n' > dist/robots.txt
cat > dist/_headers <<'H'
/*
  X-Robots-Tag: noindex, nofollow
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()
H
echo "dist prêt : $(find dist -type f | wc -l) fichiers"
