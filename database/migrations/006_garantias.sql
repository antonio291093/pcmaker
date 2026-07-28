-- =============================================================
-- PCMaker ERP — Migración 006: Sistema de garantías (solicitudes)
-- Fecha: Julio 2026
-- Seguro para re-ejecutar: usa IF NOT EXISTS y ON CONFLICT DO NOTHING.
--
-- Nota de nomenclatura: ya existe un módulo `garantias` en el backend
-- (models/garantias.js, controladorGarantias.js, garantiaRutas.js)
-- que genera la TARJETA PDF de garantía al momento de la venta. Ese
-- módulo no se toca. Las tablas de esta migración usan el prefijo
-- `garantia_solicitud*` para representar el FLUJO de reclamo
-- (solicitar → diagnosticar → resolver), que es un concepto distinto.
--
-- Flujos de negocio reales (no se maneja devolución de dinero):
--   1. Reparación — cambio de componente(s), descuenta stock del
--      componente nuevo.
--   2. Reemplazo — equipo del mismo valor, o el cliente paga la
--      diferencia por un equipo mejor (monto_diferencia).
--   3. Devolución — se mantiene en el schema como opción de
--      tipo_resolucion, pero no es el foco operativo actual.
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. Tabla garantia_solicitudes (cabecera)
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS garantia_solicitudes (
    id                   SERIAL PRIMARY KEY,
    venta_id             INT NOT NULL REFERENCES ventas(id),
    sucursal_id          INT NOT NULL REFERENCES sucursales(id),
    estado               VARCHAR(20) NOT NULL DEFAULT 'solicitada'
                             CHECK (estado IN ('solicitada', 'en_revision', 'aprobada', 'rechazada', 'resuelta')),
    tipo_resolucion      VARCHAR(20)
                             CHECK (tipo_resolucion IN ('reparacion', 'reemplazo', 'devolucion')),
    motivo_cliente       TEXT NOT NULL,
    diagnostico_tecnico  TEXT,
    motivo_rechazo       TEXT,
    monto_diferencia     NUMERIC(10, 2) NOT NULL DEFAULT 0,
    -- monto_diferencia: lo que el cliente paga extra en un reemplazo
    -- por un equipo de mayor valor. 0 en reparación/devolución o
    -- reemplazo de valor equivalente.
    creado_por           INT NOT NULL REFERENCES usuarios(id),
    tecnico_id           INT REFERENCES usuarios(id),
    fecha_venta_snapshot DATE NOT NULL,
    -- Copia de ventas.fecha_venta al crear la solicitud: congela el
    -- criterio de vigencia (6 meses) aunque la política cambie después.
    fecha_creacion       TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_revision       TIMESTAMP,
    fecha_resolucion     TIMESTAMP,
    fecha_actualizacion  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 2. Tabla garantia_solicitud_items (detalle por artículo reclamado)
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS garantia_solicitud_items (
    id                     SERIAL PRIMARY KEY,
    garantia_solicitud_id  INT NOT NULL REFERENCES garantia_solicitudes(id) ON DELETE CASCADE,
    venta_detalle_id       INT NOT NULL REFERENCES venta_detalle(id),
    inventario_id          INT REFERENCES inventario(id),
    equipo_id              INT REFERENCES equipos(id),
    estado_item            VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                               CHECK (estado_item IN ('pendiente', 'reparado', 'reemplazado', 'devuelto', 'rechazado')),
    fecha_creacion         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 3. Tabla garantia_solicitud_componentes (componentes usados en reparación)
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS garantia_solicitud_componentes (
    id                          SERIAL PRIMARY KEY,
    garantia_solicitud_item_id  INT NOT NULL REFERENCES garantia_solicitud_items(id) ON DELETE CASCADE,
    inventario_id               INT NOT NULL REFERENCES inventario(id),
    cantidad                    INT NOT NULL DEFAULT 1,
    descripcion                 VARCHAR(255),
    fecha_creacion              TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 4. Ampliar estados de inventario para reflejar artículos
--    defectuosos/en reparación tras una garantía
-- -------------------------------------------------------------

ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_estado_check;
ALTER TABLE inventario ADD CONSTRAINT inventario_estado_check
    CHECK (estado IN ('nuevo', 'usado', 'cobrado', 'defectuoso', 'para_reparar'));

-- -------------------------------------------------------------
-- 5. Índices
-- -------------------------------------------------------------

-- Historial de garantías por venta (¿ya se reclamó este artículo?)
CREATE INDEX IF NOT EXISTS idx_garantia_solicitudes_venta
    ON garantia_solicitudes(venta_id);

-- Bandeja por sucursal y estado (vista de ventas y admin)
CREATE INDEX IF NOT EXISTS idx_garantia_solicitudes_estado
    ON garantia_solicitudes(sucursal_id, estado);

-- Bandeja de casos activos del técnico asignado
CREATE INDEX IF NOT EXISTS idx_garantia_solicitudes_tecnico
    ON garantia_solicitudes(tecnico_id) WHERE estado IN ('en_revision', 'aprobada');

-- Detalle de artículos por solicitud
CREATE INDEX IF NOT EXISTS idx_garantia_items_solicitud
    ON garantia_solicitud_items(garantia_solicitud_id);

-- Verificar si un venta_detalle específico ya fue reclamado
CREATE INDEX IF NOT EXISTS idx_garantia_items_venta_detalle
    ON garantia_solicitud_items(venta_detalle_id);

-- Componentes usados por ítem (detalle de reparación)
CREATE INDEX IF NOT EXISTS idx_garantia_componentes_item
    ON garantia_solicitud_componentes(garantia_solicitud_item_id);

-- -------------------------------------------------------------
-- 6. Configuración de vigencia
--    ON CONFLICT DO NOTHING → idempotente en re-ejecución.
--    Editable desde el panel admin sin nueva migración, mismo
--    patrón que apartados_dias_limite.
-- -------------------------------------------------------------

INSERT INTO configuraciones (nombre, valor, descripcion) VALUES
    ('garantias_meses_validez', '6', 'Meses de validez de la garantía desde la fecha de venta')
ON CONFLICT (nombre) DO NOTHING;

-- -------------------------------------------------------------
-- 7. Permisos para pcmaker_user
--    Los GRANT son idempotentes: re-ejecutar no causa errores.
-- -------------------------------------------------------------

GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE garantia_solicitudes            TO pcmaker_user;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE garantia_solicitud_items        TO pcmaker_user;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE garantia_solicitud_componentes  TO pcmaker_user;
GRANT USAGE, SELECT ON SEQUENCE garantia_solicitudes_id_seq                   TO pcmaker_user;
GRANT USAGE, SELECT ON SEQUENCE garantia_solicitud_items_id_seq               TO pcmaker_user;
GRANT USAGE, SELECT ON SEQUENCE garantia_solicitud_componentes_id_seq         TO pcmaker_user;

COMMIT;

-- -------------------------------------------------------------
-- Verificación post-migración (ejecutar por separado):
--
--   SELECT * FROM configuraciones WHERE nombre LIKE 'garantias%';
--   \d garantia_solicitudes
--   \d garantia_solicitud_items
--   \d garantia_solicitud_componentes
--   \d inventario   -- confirmar nuevo CHECK de estado
-- -------------------------------------------------------------
