#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d)"
DIST="$ROOT/dist-cpanel"
ZIP_NAME="palmpizzakitchen-cpanel-${STAMP}.zip"
FRONT_ZIP="palmpizzakitchen-frontend-cpanel-${STAMP}.zip"
BACK_ZIP="palmpizzakitchen-backend-cpanel-${STAMP}.zip"
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
# Separate dist folder so a running `next start` is not wiped.
# Next 16 writes the static export into distDir (not out/) for this setup.
rm -rf "$ROOT/.next-cpanel"
CPANEL_STATIC=1 \
  NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://backend.palmpizzakitchen.com/api}" \
  npm run build

EXPORT_DIR="$ROOT/.next-cpanel"
if [[ ! -f "$EXPORT_DIR/index.html" ]]; then
  echo "Build did not produce a static site in .next-cpanel/" >&2
  exit 1
fi

rm -rf "$DIST"
mkdir -p "$DIST/public_html" "$DIST/palm-backend"

echo "→ Copying website into public_html/"
rsync -a --delete "$EXPORT_DIR/" "$DIST/public_html/"
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

cat > "$DIST/FRONTEND-UPLOAD.txt" <<'EOF'
Palm Pizza Kitchen — FRONTEND (website)
========================================

Upload this zip into the website public_html.

1. cPanel → File Manager → public_html
2. Upload palmpizzakitchen-frontend-cpanel-YYYYMMDD.zip
3. Extract it
4. Move everything inside the public_html folder in the zip
   into the site public_html (overwrite old files)
5. Confirm these files are directly inside public_html:
   - index.html
   - .htaccess
   - fruit/  bar/  drinks/  pizzas/  admin/
6. Open https://palmpizzakitchen.com

This website calls the API at:
https://backend.palmpizzakitchen.com/api

Do not put the API folder inside public_html.
The API is the other zip: palmpizzakitchen-backend-cpanel-YYYYMMDD.zip
EOF

cat > "$DIST/BACKEND-UPLOAD.txt" <<'EOF'
Palm Pizza Kitchen — BACKEND (API)
===================================

Upload this zip next to the website, not inside public_html.

1. cPanel → File Manager → home folder
   Example: /home/USER/palm-backend
2. Upload palmpizzakitchen-backend-cpanel-YYYYMMDD.zip
3. Extract it so the folder contains app.js, package.json, src/, sql/
4. Keep the .env that is already on the server.
   If this is a new server, copy .env.example to .env and fill it in.
   See cpanel-deploy.txt inside the folder.
5. cPanel → Setup Node.js App
   - Node.js 20 or 22
   - Application mode: Production
   - Application root: palm-backend
   - Application startup file: app.js
   - Application URL: backend.palmpizzakitchen.com
6. Click Run NPM Install
7. Click Restart
8. Open https://backend.palmpizzakitchen.com/api/health
   You should see: {"ok":true,...,"db":"up"}

Do not replace the live .env when you extract a new zip.
If package.json changed, run NPM Install again, then Restart.
EOF

cd "$DIST"
rm -f "$ROOT/$ZIP_NAME" "$ROOT/$FRONT_ZIP" "$ROOT/$BACK_ZIP"
zip -qry "$ROOT/$ZIP_NAME" public_html palm-backend CPANEL-UPLOAD.txt
(
  cd "$DIST"
  zip -qry "$ROOT/$FRONT_ZIP" public_html FRONTEND-UPLOAD.txt
)
(
  cd "$DIST/palm-backend"
  zip -qry "$ROOT/$BACK_ZIP" . -x '*.DS_Store'
  # Attach the short steps beside the app files.
  cd "$DIST"
  zip -qj "$ROOT/$BACK_ZIP" BACKEND-UPLOAD.txt
)

echo "→ Created"
ls -lh "$ROOT/$ZIP_NAME" "$ROOT/$FRONT_ZIP" "$ROOT/$BACK_ZIP"
