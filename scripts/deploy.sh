#!/usr/bin/env bash
# =============================================================================
# Deploy de PCMaker en el VPS
#
# Uso (en el VPS):   bash scripts/deploy.sh <objetivo>
# Uso (desde Windows, sin entrar al VPS):
#   ssh pcmaker_user@138.197.210.64 "bash /var/www/pcmaker/scripts/deploy.sh <objetivo>"
#
# Objetivos:
#   backend    API de producción (erp.pcmaker.mx/api)
#   frontend   Build estático del ERP de producción
#   catalogo   Catálogo público (catalogo.pcmaker.mx)
#   demo       Backend + frontend del demo (demo.pcmaker.mx)
#   rollback-frontend   Restaura el build anterior del ERP de producción
#
# Se detiene al primer error: si el build falla, no se toca lo que está en línea.
# =============================================================================
set -euo pipefail

PROYECTO=/var/www/pcmaker
NGINX=nginx_reverse_proxy
NODE_IMAGE=node:22-alpine
DEMO_API_URL=https://demo.pcmaker.mx

cd "$PROYECTO"

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m OK \033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m ERROR \033[0m %s\n' "$*" >&2; exit 1; }

# --- Código ------------------------------------------------------------------
actualizar_codigo() {
  log "Actualizando código"
  # frontend-static se ignora: el servidor siempre tiene un build distinto al del repo
  if [ -n "$(git status --porcelain --untracked-files=no -- . ':!frontend-static')" ]; then
    git status --short -- . ':!frontend-static'
    fail "Hay cambios locales en el servidor. Revísalos antes de desplegar."
  fi
  git pull --ff-only origin main
}

# --- nginx -------------------------------------------------------------------
# Reload en vez de restart: si la config tiene un error, nginx sigue arriba con
# la anterior. También hace que nginx tome la IP nueva de un contenedor recreado.
recargar_nginx() {
  log "Recargando nginx"
  docker exec "$NGINX" nginx -t
  docker exec "$NGINX" nginx -s reload
}

# --- Verificación ------------------------------------------------------------
verificar() { # url código_esperado
  local code intento
  for intento in 1 2 3 4 5 6; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$1" || true)
    if [ "$code" = "$2" ]; then ok "$1 → $code"; return 0; fi
    sleep 3
  done
  fail "$1 respondió $code (esperado $2)"
}

# --- Frontend estático -------------------------------------------------------
# Publica con rsync dentro del MISMO directorio: nginx lo tiene montado como
# volumen, así que no se puede renombrar ni reemplazar la carpeta.
compilar_frontend() { # destino [api_url]
  local destino=$1 api_url=${2:-}
  local env_args=()
  [ -n "$api_url" ] && env_args=(-e "NEXT_PUBLIC_API_URL=$api_url")

  log "Compilando frontend${api_url:+ para $api_url}"
  docker run --rm "${env_args[@]}" -v "$PROYECTO/frontend:/app" -w /app "$NODE_IMAGE" \
    sh -c "npm ci && npm run build"
  [ -f frontend/out/index.html ] || fail "El build no generó frontend/out/index.html"

  log "Publicando en $destino (respaldo en ${destino}.prev)"
  mkdir -p "$destino" "${destino}.prev"
  rsync -a --delete "$destino/" "${destino}.prev/"
  rsync -a --delete frontend/out/ "$destino/"
}

# --- Objetivos ---------------------------------------------------------------
deploy_backend() {
  log "Backend de producción"
  docker compose up -d --build --force-recreate backend
  recargar_nginx
  verificar https://erp.pcmaker.mx/api/sucursales 200
}

deploy_frontend() {
  compilar_frontend "$PROYECTO/frontend-static"
  verificar https://erp.pcmaker.mx/login/ 200
}

deploy_catalogo() {
  log "Catálogo"
  docker compose up -d --build --force-recreate catalogo
  recargar_nginx
  verificar https://catalogo.pcmaker.mx/ 200
}

deploy_demo() {
  log "Backend del demo"
  docker compose up -d --build --force-recreate backend_demo
  recargar_nginx
  verificar "$DEMO_API_URL/api/sucursales" 200
  compilar_frontend "$PROYECTO/frontend-static-demo" "$DEMO_API_URL"
  verificar "$DEMO_API_URL/login/" 200
}

rollback_frontend() {
  local destino="$PROYECTO/frontend-static"
  [ -f "${destino}.prev/index.html" ] || fail "No hay respaldo en ${destino}.prev"
  log "Restaurando el build anterior del frontend"
  rsync -a --delete "${destino}.prev/" "$destino/"
  verificar https://erp.pcmaker.mx/login/ 200
}

case "${1:-}" in
  backend)           actualizar_codigo; deploy_backend ;;
  frontend)          actualizar_codigo; deploy_frontend ;;
  catalogo)          actualizar_codigo; deploy_catalogo ;;
  demo)              actualizar_codigo; deploy_demo ;;
  rollback-frontend) rollback_frontend ;;
  *) echo "Uso: bash scripts/deploy.sh {backend|frontend|catalogo|demo|rollback-frontend}"; exit 1 ;;
esac

# Limpia imágenes huérfanas de builds anteriores (no toca las que están en uso)
docker image prune -f >/dev/null || true
log "Listo"
