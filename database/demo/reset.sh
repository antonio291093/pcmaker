#!/usr/bin/env bash
set -euo pipefail

# =============================================================
# PCMaker ERP — Reset del ambiente de demo (pcmaker_demo)
# =============================================================
# Trunca todas las tablas del schema (respetando FKs vía CASCADE
# en un único TRUNCATE) y vuelve a correr database/demo/seed.sql.
#
# Uso:
#   DATABASE_URL=postgresql://usuario:password@host:5432/pcmaker_demo \
#     ./database/demo/reset.sh
#
# Si no se define DATABASE_URL, usa el valor por defecto de abajo
# (ajústalo a tu entorno local o expórtalo antes de llamar al script).
#
# Requiere psql en el PATH y permisos de escritura sobre pcmaker_demo.
# NUNCA apuntar este script a la base de datos de producción
# ("pcmaker") — trunca TODAS las tablas sin confirmación.
# =============================================================

DATABASE_URL="${DATABASE_URL:-postgresql://pcmaker_user:CHANGE_ME@localhost:5432/pcmaker_demo}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Salvaguarda mínima: exige que el nombre de la base en la URL contenga
# "demo" para reducir el riesgo de apuntar por error a producción.
if [[ "$DATABASE_URL" != *demo* ]]; then
  echo "✗ DATABASE_URL no contiene 'demo' en el nombre de la base:"
  echo "  $DATABASE_URL"
  echo "  Este script trunca TODAS las tablas — abortando por seguridad."
  echo "  Si es intencional, renombra la base o ajusta esta validación."
  exit 1
fi

echo "→ Base de datos objetivo: $DATABASE_URL"
echo "→ Truncando tablas de pcmaker_demo..."

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
TRUNCATE TABLE
  garantia_solicitud_componentes,
  garantia_solicitud_items,
  garantia_solicitudes,
  apartado_abonos,
  apartados,
  pedido_items,
  pedidos,
  comisiones,
  caja_cortes,
  caja_dias,
  caja_movimientos,
  ventas_pagos,
  venta_detalle,
  ventas,
  mantenimientos,
  inventario_auditoria,
  inventario_especificaciones,
  inventario,
  equipos_almacenamiento,
  equipos_ram,
  equipos,
  lotes_etiquetas,
  lotes,
  clientes,
  usuarios,
  configuracion_pagos,
  configuraciones,
  catalogo_mantenimiento,
  catalogo_memoria_ram,
  catalogo_frecuencia_ram,
  catalogo_capacidad_ram,
  catalogo_tipo_ram,
  catalogo_almacenamiento,
  catalogo_categorias,
  catalogo_estados,
  roles,
  sucursales
RESTART IDENTITY CASCADE;
SQL

echo "→ Sembrando datos demo (seed.sql)..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/seed.sql"

echo "✔ pcmaker_demo reseteada y sembrada correctamente."
