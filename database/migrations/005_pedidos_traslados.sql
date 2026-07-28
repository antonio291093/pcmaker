-- =============================================================
-- PCMaker ERP — Migración 005: Pedidos de traslado entre sucursales
-- Fecha: Julio 2026
-- Rediseño completo de `pedidos` / `pedido_equipos` (sin datos en
-- producción, se recrean desde cero).
--
-- Decisiones de negocio confirmadas:
--   1. Origen homogéneo: todos los ítems de un pedido salen de la
--      misma sucursal_origen_id.
--   2. Cancelación solo permitida si estado IN
--      ('pendiente','en_preparacion','listo'). No se puede cancelar
--      un pedido 'completado'. (Se valida en el controlador, no aquí
--      — igual que el resto de las máquinas de estado del proyecto,
--      p.ej. apartados.estado, mantenimientos.estado.)
--   3. pedido_items admite equipos con estado_id IN (1,2,3,4)
--      (sin revisar, revisado-por armar, revisado-no funciona, armado).
--
-- El movimiento de sucursal_id (equipos/inventario) ocurre en la
-- misma transacción que crea el pedido — no lo dispara esta migración,
-- lo hará el modelo en Node (PASO 2), reusando setAuditContext con
-- contexto='traspaso' para que el trigger fn_auditoria_inventario
-- (migración 004) registre accion='traspaso' con referencia al pedido.
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. Eliminar tablas anteriores (sin datos en producción)
-- -------------------------------------------------------------

DROP TABLE IF EXISTS pedido_equipos CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;

-- -------------------------------------------------------------
-- 2. Tabla pedidos
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pedidos (
    id                   SERIAL PRIMARY KEY,
    sucursal_origen_id   INT NOT NULL REFERENCES sucursales(id),
    sucursal_destino_id  INT NOT NULL REFERENCES sucursales(id),
    creado_por           INT NOT NULL REFERENCES usuarios(id),
    tecnico_id           INT NOT NULL REFERENCES usuarios(id),
    detalle              TEXT NOT NULL,
    estado               VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                             CHECK (estado IN (
                                 'pendiente', 'en_preparacion', 'listo',
                                 'completado', 'cancelado'
                             )),
    fecha_creacion       TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_completado     TIMESTAMP,
    cancelado_por        INT REFERENCES usuarios(id),
    motivo_cancelacion   TEXT,
    fecha_cancelacion    TIMESTAMP,
    CHECK (sucursal_origen_id <> sucursal_destino_id)
);

-- -------------------------------------------------------------
-- 3. Tabla pedido_items
--    Soporta los 3 tipos de traslado:
--      a) sin_revisar       → equipo_id     (tabla equipos, aún sin fila en inventario)
--      b) recepcion_directa → inventario_id (inventario.origen = 'recepcion_directa')
--      c) armado            → inventario_id + equipo_id denormalizado
--         (para sincronizar equipos.sucursal_id e inventario.sucursal_id
--          igual que ya hace traspasarInventario en models/inventario.js)
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pedido_items (
    id                     SERIAL PRIMARY KEY,
    pedido_id              INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    tipo                   VARCHAR(20) NOT NULL
                               CHECK (tipo IN ('sin_revisar', 'recepcion_directa', 'armado')),
    equipo_id              INT REFERENCES equipos(id),
    inventario_id          INT REFERENCES inventario(id),
    estado_equipo_al_pedir INT REFERENCES catalogo_estados(id),
    CHECK (
        (tipo = 'sin_revisar'       AND equipo_id IS NOT NULL AND inventario_id IS NULL) OR
        (tipo = 'recepcion_directa' AND inventario_id IS NOT NULL AND equipo_id IS NULL) OR
        (tipo = 'armado'            AND inventario_id IS NOT NULL)
    )
);

-- -------------------------------------------------------------
-- 4. Índices
-- -------------------------------------------------------------

-- Listado filtrado por estado (vista admin) y por sucursal (origen/destino)
CREATE INDEX IF NOT EXISTS idx_pedidos_estado            ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_sucursal_origen    ON pedidos(sucursal_origen_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_sucursal_destino   ON pedidos(sucursal_destino_id);

-- Detalle de un pedido (GET /api/pedidos/:id)
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido        ON pedido_items(pedido_id);

-- Chequeo de "¿este equipo/inventario ya está en un pedido activo?"
-- al crear un pedido nuevo (evita traslados duplicados/concurrentes)
CREATE INDEX IF NOT EXISTS idx_pedido_items_equipo
    ON pedido_items(equipo_id) WHERE equipo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pedido_items_inventario
    ON pedido_items(inventario_id) WHERE inventario_id IS NOT NULL;

-- Evita duplicar el mismo equipo/inventario dentro de un mismo pedido
CREATE UNIQUE INDEX IF NOT EXISTS ux_pedido_items_equipo
    ON pedido_items(pedido_id, equipo_id) WHERE equipo_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_pedido_items_inventario
    ON pedido_items(pedido_id, inventario_id) WHERE inventario_id IS NOT NULL;

-- -------------------------------------------------------------
-- 5. Permisos para pcmaker_user
--    Los GRANT son idempotentes: re-ejecutar no causa errores.
-- -------------------------------------------------------------

GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE pedidos       TO pcmaker_user;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE pedido_items  TO pcmaker_user;
GRANT USAGE, SELECT ON SEQUENCE pedidos_id_seq              TO pcmaker_user;
GRANT USAGE, SELECT ON SEQUENCE pedido_items_id_seq         TO pcmaker_user;

COMMIT;

-- -------------------------------------------------------------
-- Verificación post-migración (ejecutar por separado):
--
--   \d pedidos
--   \d pedido_items
--   SELECT conname, pg_get_constraintdef(oid)
--     FROM pg_constraint WHERE conrelid = 'pedido_items'::regclass;
-- -------------------------------------------------------------
