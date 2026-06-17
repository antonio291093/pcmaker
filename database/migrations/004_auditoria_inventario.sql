-- ==============================================================
-- PCMaker ERP — Migración 004: Auditoría de inventario
-- ==============================================================
-- Una fila por cada campo modificado.
-- El usuario se inyecta desde Node.js con:
--   SET LOCAL app.current_user_id = '<id>'
-- dentro de la misma transacción que el DML.
-- ==============================================================

-- --------------------------------------------------------------
-- 1. Tabla
-- --------------------------------------------------------------
CREATE TABLE inventario_auditoria (
    id             SERIAL PRIMARY KEY,
    inventario_id  INT    NOT NULL REFERENCES inventario(id),
    usuario_id     INT    REFERENCES usuarios(id),
    accion         VARCHAR(20) NOT NULL
                       CHECK (accion IN (
                           'crear', 'editar', 'eliminar',
                           'stock_descuento', 'stock_aumento', 'traspaso'
                       )),
    campo          VARCHAR(50),
    valor_anterior TEXT,
    valor_nuevo    TEXT,
    contexto       VARCHAR(50),   -- 'venta', 'apartado', 'traspaso', etc.
    referencia_id  INT,           -- id de venta / apartado que originó el cambio
    fecha          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------
-- 2. Índices
-- --------------------------------------------------------------
CREATE INDEX idx_auditoria_inv_fecha ON inventario_auditoria(inventario_id, fecha DESC);
CREATE INDEX idx_auditoria_usuario   ON inventario_auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha     ON inventario_auditoria(fecha DESC);
CREATE INDEX idx_auditoria_accion    ON inventario_auditoria(accion);

-- --------------------------------------------------------------
-- 3. Función trigger
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auditoria_inventario()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_uid  INT;
    v_ctx  VARCHAR(50);
    v_ref  INT;
BEGIN
    -- Leer contexto inyectado desde Node.js.
    -- El segundo argumento TRUE evita error si la variable no existe.
    v_uid := NULLIF(current_setting('app.current_user_id', TRUE), '')::INT;
    v_ctx := NULLIF(current_setting('app.contexto',         TRUE), '');
    v_ref := NULLIF(current_setting('app.referencia_id',    TRUE), '')::INT;

    -- ----------------------------------------------------------
    -- INSERT → una sola fila 'crear'
    -- ----------------------------------------------------------
    IF TG_OP = 'INSERT' THEN
        INSERT INTO inventario_auditoria
            (inventario_id, usuario_id, accion, contexto, referencia_id)
        VALUES
            (NEW.id, v_uid, 'crear', v_ctx, v_ref);
        RETURN NEW;
    END IF;

    -- ----------------------------------------------------------
    -- DELETE físico (guardado como 'eliminar')
    -- ----------------------------------------------------------
    IF TG_OP = 'DELETE' THEN
        INSERT INTO inventario_auditoria
            (inventario_id, usuario_id, accion, contexto, referencia_id)
        VALUES
            (OLD.id, v_uid, 'eliminar', v_ctx, v_ref);
        RETURN OLD;
    END IF;

    -- ----------------------------------------------------------
    -- UPDATE: campo a campo
    -- ----------------------------------------------------------
    IF TG_OP = 'UPDATE' THEN

        -- ① Soft-delete: eliminado FALSE → TRUE
        --    Registrar como 'eliminar' y salir — los campos consecuencia
        --    (eliminado_por, fecha_eliminacion) no generan filas extra.
        IF OLD.eliminado IS DISTINCT FROM NEW.eliminado AND NEW.eliminado = TRUE THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (
                NEW.id,
                COALESCE(v_uid, NEW.eliminado_por),
                'eliminar',
                'eliminado', 'false', 'true',
                v_ctx, v_ref
            );

            IF NEW.motivo_eliminacion IS NOT NULL THEN
                INSERT INTO inventario_auditoria
                    (inventario_id, usuario_id, accion,
                     campo, valor_anterior, valor_nuevo,
                     contexto, referencia_id)
                VALUES (
                    NEW.id,
                    COALESCE(v_uid, NEW.eliminado_por),
                    'eliminar',
                    'motivo_eliminacion',
                    OLD.motivo_eliminacion,
                    NEW.motivo_eliminacion,
                    v_ctx, v_ref
                );
            END IF;

            RETURN NEW;
        END IF;

        -- ② cantidad  (stock_descuento / stock_aumento según dirección)
        IF OLD.cantidad IS DISTINCT FROM NEW.cantidad THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (
                NEW.id, v_uid,
                CASE
                    WHEN NEW.cantidad < OLD.cantidad THEN 'stock_descuento'
                    ELSE                                  'stock_aumento'
                END,
                'cantidad',
                OLD.cantidad::TEXT,
                NEW.cantidad::TEXT,
                v_ctx, v_ref
            );
        END IF;

        -- ③ sucursal_id  ('traspaso' si el contexto lo indica, si no 'editar')
        IF OLD.sucursal_id IS DISTINCT FROM NEW.sucursal_id THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (
                NEW.id, v_uid,
                CASE WHEN v_ctx = 'traspaso' THEN 'traspaso' ELSE 'editar' END,
                'sucursal_id',
                OLD.sucursal_id::TEXT,
                NEW.sucursal_id::TEXT,
                v_ctx, v_ref
            );
        END IF;

        -- ④ precio
        IF OLD.precio IS DISTINCT FROM NEW.precio THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (NEW.id, v_uid, 'editar',
                    'precio', OLD.precio::TEXT, NEW.precio::TEXT,
                    v_ctx, v_ref);
        END IF;

        -- ⑤ tipo
        IF OLD.tipo IS DISTINCT FROM NEW.tipo THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (NEW.id, v_uid, 'editar',
                    'tipo', OLD.tipo, NEW.tipo,
                    v_ctx, v_ref);
        END IF;

        -- ⑥ especificacion
        IF OLD.especificacion IS DISTINCT FROM NEW.especificacion THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (NEW.id, v_uid, 'editar',
                    'especificacion', OLD.especificacion, NEW.especificacion,
                    v_ctx, v_ref);
        END IF;

        -- ⑦ disponibilidad
        IF OLD.disponibilidad IS DISTINCT FROM NEW.disponibilidad THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (NEW.id, v_uid, 'editar',
                    'disponibilidad',
                    OLD.disponibilidad::TEXT,
                    NEW.disponibilidad::TEXT,
                    v_ctx, v_ref);
        END IF;

        -- ⑧ estado
        IF OLD.estado IS DISTINCT FROM NEW.estado THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (NEW.id, v_uid, 'editar',
                    'estado', OLD.estado, NEW.estado,
                    v_ctx, v_ref);
        END IF;

        -- ⑨ memoria_ram_id
        IF OLD.memoria_ram_id IS DISTINCT FROM NEW.memoria_ram_id THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (NEW.id, v_uid, 'editar',
                    'memoria_ram_id',
                    OLD.memoria_ram_id::TEXT,
                    NEW.memoria_ram_id::TEXT,
                    v_ctx, v_ref);
        END IF;

        -- ⑩ almacenamiento_id
        IF OLD.almacenamiento_id IS DISTINCT FROM NEW.almacenamiento_id THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (NEW.id, v_uid, 'editar',
                    'almacenamiento_id',
                    OLD.almacenamiento_id::TEXT,
                    NEW.almacenamiento_id::TEXT,
                    v_ctx, v_ref);
        END IF;

        -- ⑪ sku
        IF OLD.sku IS DISTINCT FROM NEW.sku THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (NEW.id, v_uid, 'editar',
                    'sku', OLD.sku, NEW.sku,
                    v_ctx, v_ref);
        END IF;

        -- ⑫ visible_catalogo
        IF OLD.visible_catalogo IS DISTINCT FROM NEW.visible_catalogo THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (NEW.id, v_uid, 'editar',
                    'visible_catalogo',
                    OLD.visible_catalogo::TEXT,
                    NEW.visible_catalogo::TEXT,
                    v_ctx, v_ref);
        END IF;

        -- ⑬ imagen_catalogo
        IF OLD.imagen_catalogo IS DISTINCT FROM NEW.imagen_catalogo THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (NEW.id, v_uid, 'editar',
                    'imagen_catalogo',
                    OLD.imagen_catalogo,
                    NEW.imagen_catalogo,
                    v_ctx, v_ref);
        END IF;

        -- ⑭ categoria_catalogo_id
        IF OLD.categoria_catalogo_id IS DISTINCT FROM NEW.categoria_catalogo_id THEN
            INSERT INTO inventario_auditoria
                (inventario_id, usuario_id, accion,
                 campo, valor_anterior, valor_nuevo,
                 contexto, referencia_id)
            VALUES (NEW.id, v_uid, 'editar',
                    'categoria_catalogo_id',
                    OLD.categoria_catalogo_id::TEXT,
                    NEW.categoria_catalogo_id::TEXT,
                    v_ctx, v_ref);
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

-- --------------------------------------------------------------
-- 4. Trigger
-- --------------------------------------------------------------
CREATE TRIGGER trg_auditoria_inventario
AFTER INSERT OR UPDATE OR DELETE ON inventario
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_inventario();

-- --------------------------------------------------------------
-- 5. Permisos
-- --------------------------------------------------------------
GRANT SELECT, INSERT, DELETE ON inventario_auditoria TO pcmaker_user;
GRANT USAGE, SELECT ON SEQUENCE inventario_auditoria_id_seq TO pcmaker_user;
