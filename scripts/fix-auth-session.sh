#!/usr/bin/env bash
set -euo pipefail

# 7P Education - One-shot Auth Fix + Deploy
# Usage on server: bash scripts/fix-auth-session.sh

CONTAINER=${CONTAINER:-7p-oauth-test}
HOST_REPO_DIR=${HOST_REPO_DIR:-/root/7p-nextjs}
APP_DIR_IN_CONTAINER=${APP_DIR_IN_CONTAINER:-/app}

log() { printf "\033[1;34mℹ️  %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✅ %s\033[0m\n" "$*"; }
warn(){ printf "\033[1;33m⚠️  %s\033[0m\n" "$*"; }
err() { printf "\033[1;31m❌ %s\033[0m\n" "$*"; }

log "Checking docker and container ($CONTAINER) availability..."
if ! command -v docker >/dev/null 2>&1; then err "docker not found"; exit 1; fi
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then err "Container $CONTAINER not running"; exit 1; fi
ok "Container $CONTAINER is running"

log "Syncing updated application files into container..."
mapfile -t FILES < <(cat <<'EOF'
src/app/api/auth/[...nextauth]/route.ts
src/app/api/auth/debug/route.ts
src/app/dashboard/layout.tsx
src/app/login/page.tsx
middleware.ts
package.json
package-lock.json
EOF
)

for f in "${FILES[@]}"; do
  if [ -f "$HOST_REPO_DIR/$f" ]; then
    docker cp "$HOST_REPO_DIR/$f" "$CONTAINER:$APP_DIR_IN_CONTAINER/$f"
  else
    warn "File not found on host: $HOST_REPO_DIR/$f (skipping)"
  fi
done
ok "Files copied to container"

log "Printing critical env (masked) from container..."
docker exec "$CONTAINER" sh -lc '
  echo "NEXTAUTH_URL=$(printf "%s" "$NEXTAUTH_URL" | sed -e "s#^\(https\?://\)\?\([^/]*\).*#\1\2#")";
  echo -n "NEXTAUTH_SECRET="; [ -n "$NEXTAUTH_SECRET" ] && echo "${NEXTAUTH_SECRET%????????}********" || echo "(missing)";
  echo "AUTH_TRUST_HOST=${AUTH_TRUST_HOST:-}";
  echo "PORT=${PORT:-}";
'

log "Installing deps and building inside container (this may take a minute)..."
docker exec -it "$CONTAINER" sh -lc '
  cd '"$APP_DIR_IN_CONTAINER"' || exit 1
  npm ci --production=false
  npm run build
'
ok "Build completed in container"

log "Restarting container..."
docker restart "$CONTAINER" >/dev/null
ok "Container restarted"

log "Basic HTTP checks from host (through proxy layer may differ) ..."
docker exec "$CONTAINER" sh -lc '
  PORT=${PORT:-3002};
  echo "- Providers:  http://127.0.0.1:${PORT}/api/auth/providers -> $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${PORT}/api/auth/providers)";
  echo "- Session:    http://127.0.0.1:${PORT}/api/auth/session   -> $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${PORT}/api/auth/session)";
'

cat <<MSG

Next steps (manual, from your browser):
- Go to https://7ponline.com/login → Google ile giriş yap
- After redirect, open https://7ponline.com/api/auth/debug
  Expect: { hasToken: true, hasSession: true, sessionUser: { ... } }
- Open Network tab on /dashboard; Response Header should include: x-auth-status: ok
- Check cookie: __Secure-next-auth.session-token exists for 7ponline.com

If you still see refresh/loop:
- Ensure Cloudflare Cache Rule: /api/auth/* → Cache Level: Bypass
- Ensure Nginx proxy headers: X-Forwarded-Proto/Host and Host are set

MSG

ok "Auth fix and deployment finished."

