#!/usr/bin/env bash
# Ejecuta docker/migration_event_ticket_types.sql contra la base indicada.
#
# Uso (elige una):
#   1) URL de conexión (Railway, Render, Neon, etc.):
#        export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
#        ./scripts/run-event-ticket-types-migration.sh
#
#   2) Variables sueltas (como en .env):
#        export DB_HOST=... DB_PORT=5432 DB_USER=... DB_PASS=... DB_NAME=...
#        ./scripts/run-event-ticket-types-migration.sh
#
#   3) Archivo con variables (sin commitear; p. ej. .env.production local):
#        ./scripts/run-event-ticket-types-migration.sh /ruta/al/.env.production
#
# Importante: backup antes. Ejecutar una sola vez por base (si ya corrió, fallará al DROP columnas).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATION="$BACKEND_ROOT/docker/migration_event_ticket_types.sql"

if [[ ! -f "$MIGRATION" ]]; then
  echo "No se encontró: $MIGRATION" >&2
  exit 1
fi

if [[ "${1:-}" != "" && -f "$1" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$1"
  set +a
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "Aplicando migración vía DATABASE_URL..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIGRATION"
  echo "OK."
  exit 0
fi

: "${DB_HOST:?Definí DATABASE_URL o DB_HOST (y el resto)}"
: "${DB_PORT:?Definí DB_PORT}"
: "${DB_USER:?Definí DB_USER}"
: "${DB_PASS:?Definí DB_PASS}"
: "${DB_NAME:?Definí DB_NAME}"

echo "Aplicando migración a ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$MIGRATION"
echo "OK."
