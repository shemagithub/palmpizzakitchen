#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d)"
DIST="$ROOT/dist-cpanel"
ZIP_NAME="palmpizzakitchen-cpanel-${STAMP}.zip"
API_BACKUP=""

cleanup() {
  if [[ -n "$API_BACKUP" && -d "$API_BACKUP" ]]; then
    rm -rf "$ROOT/src/app/api"
    mv "$API_BACKUP" "$ROOT/src/app/api"
  fi
}
trap cleanup EXIT

echo "→ Preparing static export (skip Next.js API routes)"
if [[ -d "$ROOT/src/app/api" ]]; then
  API_BACKUP="$(mktemp -d)/api"
  mv "$ROOT/src/app/api" "$API_BACKUP"
fi

echo "→ Building website (CPANEL_STATIC=1)"
CPANEL_STATIC=1 \
  NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://backend.palmpizzakitchen.com/api}" \
  npm run build

if [[ ! -d "$ROOT/out" ]]; then
  echo "Build did not produce out/" >&2
  exit 1
fi

rm -rf "$DIST"
mkdir -p "$DIST/public_html" "$DIST/palm-backend"

echo "→ Copying website into public_html/"
rsync -a --delete "$ROOT/out/" "$DIST/public_html/"
if [[ -f "$ROOT/public/.htaccess" ]]; then
  cp "$ROOT/public/.htaccess" "$DIST/public_html/.htaccess"
fi

echo "→ Copying backend (no node_modules, .env, or uploads)"
rsync -a \
  --exclude node_modules \
  --exclude uploads \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '.DS_Store' \
  --exclude '*.log' \
  "$ROOT/backend/" "$DIST/palm-backend/"
# Keep the env template
if [[ -f "$ROOT/backend/.env.example" ]]; then
  cp "$ROOT/backend/.env.example" "$DIST/palm-backend/.env.example"
fi

cat > "$DIST/CPANEL-UPLOAD.txt" <<'EOF'
Palm Pizza Kitchen — cPanel upload
==================================

This zip has two folders. Upload them separately.

1) WEBSITE  →  public_html/
   - File Manager → public_html
   - Extract public_html/* into public_html (overwrite)
   - Confirm .htaccess is in public_html
   - Site: https://palmpizzakitchen.com

2) API  →  palm-backend/
   - File Manager → home folder (example /home/USER/palm-backend)
   - Extract the palm-backend folder there
   - Create .env from .env.example (do not upload a local .env)
   - cPanel → Setup Node.js App
       Node: 20 or 22
       Mode: Production
       Application root: palm-backend
       Startup file: app.js
   - Run NPM Install → Restart
   - Health: https://backend.palmpizzakitchen.com/api/health

Keep the live server .env. After extract, do not replace it.
Details: palm-backend/cpanel-deploy.txt
EOF

cd "$DIST"
rm -f "$ROOT/$ZIP_NAME"
zip -qry "$ROOT/$ZIP_NAME" public_html palm-backend CPANEL-UPLOAD.txt

echo "→ Created $ZIP_NAME"
ls -lh "$ROOT/$ZIP_NAME"
