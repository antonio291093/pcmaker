-- =============================================================
-- PCMaker ERP — Migración 001: Cartera de clientes
-- Fecha: Mayo 2026
-- Seguro para re-ejecutar: usa IF NOT EXISTS y ON CONFLICT DO NOTHING.
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. Tabla clientes
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clientes (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(150) NOT NULL,
    telefono       VARCHAR(20)  UNIQUE,   -- NULL no viola UNIQUE (varios sin teléfono)
    correo         VARCHAR(150),
    sucursal_id    INT REFERENCES sucursales(id),
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índice en nombre para la búsqueda por nombre exacto en resolverOCrearCliente
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes (nombre);

-- -------------------------------------------------------------
-- 2. FK en ventas (nullable — histórico queda en NULL hasta
--    que la conciliación de la sección 5 lo llene)
-- -------------------------------------------------------------

ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS cliente_id INT REFERENCES clientes(id);

-- -------------------------------------------------------------
-- 3. Permisos para pcmaker_user
--    Los GRANT son idempotentes: re-ejecutar no causa errores.
-- -------------------------------------------------------------

GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE clientes TO pcmaker_user;
GRANT USAGE, SELECT ON SEQUENCE clientes_id_seq TO pcmaker_user;

-- -------------------------------------------------------------
-- 4. Migración de datos históricos — INSERT INTO clientes
--
--    Criterio primario:   teléfono (clave más confiable).
--    Criterio secundario: nombre exacto para ventas sin teléfono.
--
--    DISTINCT ON + ORDER BY fecha_venta ASC → conserva los datos
--    de la aparición más antigua de cada cliente.
-- -------------------------------------------------------------

-- 4a. Clientes CON teléfono
--     ON CONFLICT (telefono) DO NOTHING → idempotente en re-ejecución.
INSERT INTO clientes (nombre, telefono, correo, sucursal_id, fecha_registro)
SELECT DISTINCT ON (telefono)
    cliente,
    telefono,
    correo,
    sucursal_id,
    fecha_venta
FROM ventas
WHERE telefono IS NOT NULL
  AND telefono <> ''
ORDER BY telefono, fecha_venta ASC
ON CONFLICT (telefono) DO NOTHING;

-- 4b. Clientes SIN teléfono
--     Omite los nombres que ya existen en clientes (por haber
--     sido insertados en 4a u otras ejecuciones anteriores).
INSERT INTO clientes (nombre, telefono, correo, sucursal_id, fecha_registro)
SELECT DISTINCT ON (cliente)
    cliente,
    NULL,
    correo,
    sucursal_id,
    fecha_venta
FROM ventas
WHERE (telefono IS NULL OR telefono = '')
  AND cliente NOT IN (SELECT nombre FROM clientes)
ORDER BY cliente, fecha_venta ASC;

-- -------------------------------------------------------------
-- 5. Conciliación del histórico — UPDATE ventas.cliente_id
--
--    Solo toca filas con cliente_id IS NULL → idempotente si se
--    re-ejecuta después de una ejecución parcial.
-- -------------------------------------------------------------

-- 5a. Ventas con teléfono → enlazar por teléfono (match exacto)
UPDATE ventas v
SET    cliente_id = c.id
FROM   clientes c
WHERE  v.cliente_id IS NULL
  AND  v.telefono IS NOT NULL
  AND  v.telefono <> ''
  AND  v.telefono = c.telefono;

-- 5b. Ventas sin teléfono → enlazar por nombre exacto
UPDATE ventas v
SET    cliente_id = c.id
FROM   clientes c
WHERE  v.cliente_id IS NULL
  AND  (v.telefono IS NULL OR v.telefono = '')
  AND  v.cliente = c.nombre;

-- -------------------------------------------------------------
-- 6. Permisos para el usuario de la aplicación
-- -------------------------------------------------------------
GRANT INSERT, SELECT, UPDATE ON TABLE clientes TO pcmaker_user;
GRANT USAGE, SELECT ON SEQUENCE clientes_id_seq TO pcmaker_user;

COMMIT;

-- -------------------------------------------------------------
-- Verificación post-migración (ejecutar por separado):
--
--   SELECT COUNT(*) FROM clientes;
--   SELECT COUNT(*) FROM ventas WHERE cliente_id IS NULL;
--
-- El segundo valor debería ser bajo (ventas sin datos suficientes
-- para conciliar, o el caso de Jorge Pimentel ya corregido
-- manualmente en la instancia local).
-- -------------------------------------------------------------
