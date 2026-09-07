-- =============================================================
-- PCMaker ERP — Esquema completo de la base de datos PostgreSQL
-- Regenerado desde `pg_dump --schema-only` contra la base de
-- datos de desarrollo el 2026-09-06 (ver database/DECISIONS.md #15).
-- NO editar a mano: si el schema real cambia, regenerar de nuevo
-- con pg_dump en lugar de parchear este archivo directamente.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';

CREATE TYPE public.tipo_metodo_pago AS ENUM (
    'efectivo',
    'terminal',
    'transferencia',
    'factura'
);

CREATE FUNCTION public.fn_auditoria_inventario() RETURNS trigger
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

CREATE TABLE public.apartado_abonos (
    id integer NOT NULL,
    apartado_id integer NOT NULL,
    usuario_id integer NOT NULL,
    monto numeric(10,2) NOT NULL,
    metodo_pago character varying(20) NOT NULL,
    observaciones text,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT apartado_abonos_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['efectivo'::character varying, 'transferencia'::character varying, 'terminal'::character varying])::text[])))
);

CREATE SEQUENCE public.apartado_abonos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.apartado_abonos_id_seq OWNED BY public.apartado_abonos.id;

CREATE TABLE public.apartados (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    sucursal_id integer NOT NULL,
    usuario_id integer NOT NULL,
    producto_id integer NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    precio_total numeric(10,2) NOT NULL,
    enganche_minimo numeric(10,2) NOT NULL,
    monto_abonado numeric(10,2) DEFAULT 0 NOT NULL,
    fecha_limite date NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    motivo_cancelacion text,
    venta_id integer,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT apartados_estado_check CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'liquidado'::character varying, 'cancelado'::character varying])::text[])))
);

CREATE SEQUENCE public.apartados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.apartados_id_seq OWNED BY public.apartados.id;

CREATE TABLE public.caja_cortes (
    id integer NOT NULL,
    fecha date NOT NULL,
    total_ventas numeric(12,2) DEFAULT 0,
    total_gastos numeric(12,2) DEFAULT 0,
    total_ingresos numeric(12,2) DEFAULT 0,
    balance_final numeric(12,2) DEFAULT 0,
    sucursal_id integer,
    usuario_id integer,
    created_at timestamp without time zone DEFAULT now(),
    autorizado_por integer,
    motivo_autorizacion text,
    es_extra boolean DEFAULT false NOT NULL,
    hora_corte time without time zone DEFAULT CURRENT_TIME NOT NULL,
    total_efectivo numeric(12,2) DEFAULT 0 NOT NULL,
    total_transferencia numeric(12,2) DEFAULT 0 NOT NULL,
    total_terminal numeric(12,2) DEFAULT 0 NOT NULL,
    total_facturacion numeric(12,2) DEFAULT 0 NOT NULL
);

CREATE SEQUENCE public.caja_cortes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.caja_cortes_id_seq OWNED BY public.caja_cortes.id;

CREATE TABLE public.caja_dias (
    id integer NOT NULL,
    sucursal_id integer NOT NULL,
    usuario_id integer NOT NULL,
    fecha date NOT NULL,
    estado character varying(20) DEFAULT 'abierto'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.caja_dias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.caja_dias_id_seq OWNED BY public.caja_dias.id;

CREATE TABLE public.caja_movimientos (
    id integer NOT NULL,
    tipo character varying(20) NOT NULL,
    monto numeric(12,2) NOT NULL,
    descripcion text,
    fecha date DEFAULT CURRENT_DATE,
    sucursal_id integer,
    usuario_id integer,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT caja_movimientos_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('venta'::character varying)::text, ('gasto'::character varying)::text, ('ingreso'::character varying)::text])))
);

CREATE SEQUENCE public.caja_movimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.caja_movimientos_id_seq OWNED BY public.caja_movimientos.id;

CREATE TABLE public.catalogo_almacenamiento (
    id integer NOT NULL,
    tipo character varying(20) NOT NULL,
    capacidad_gb integer NOT NULL,
    descripcion character varying(100)
);

CREATE SEQUENCE public.catalogo_almacenamiento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.catalogo_almacenamiento_id_seq OWNED BY public.catalogo_almacenamiento.id;

CREATE TABLE public.catalogo_capacidad_ram (
    id integer NOT NULL,
    capacidad_gb integer NOT NULL,
    descripcion character varying(50)
);

CREATE SEQUENCE public.catalogo_capacidad_ram_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.catalogo_capacidad_ram_id_seq OWNED BY public.catalogo_capacidad_ram.id;

CREATE TABLE public.catalogo_categorias (
    id integer NOT NULL,
    descripcion character varying(100) NOT NULL
);

CREATE SEQUENCE public.catalogo_categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.catalogo_categorias_id_seq OWNED BY public.catalogo_categorias.id;

CREATE TABLE public.catalogo_estados (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    visual_color character varying(15)
);

CREATE SEQUENCE public.catalogo_estados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.catalogo_estados_id_seq OWNED BY public.catalogo_estados.id;

CREATE TABLE public.catalogo_frecuencia_ram (
    id integer NOT NULL,
    id_tipo_ram integer NOT NULL,
    frecuencia_mhz integer NOT NULL,
    descripcion character varying(100)
);

CREATE SEQUENCE public.catalogo_frecuencia_ram_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.catalogo_frecuencia_ram_id_seq OWNED BY public.catalogo_frecuencia_ram.id;

CREATE TABLE public.catalogo_mantenimiento (
    id integer NOT NULL,
    descripcion character varying(100) NOT NULL,
    costo numeric(10,2),
    activo boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.catalogo_mantenimiento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.catalogo_mantenimiento_id_seq OWNED BY public.catalogo_mantenimiento.id;

CREATE TABLE public.catalogo_memoria_ram (
    id integer NOT NULL,
    id_frecuencia_ram integer NOT NULL,
    id_capacidad_ram integer NOT NULL,
    descripcion character varying(100),
    tipo_modulo character varying(10) NOT NULL,
    CONSTRAINT chk_tipo_modulo CHECK (((tipo_modulo)::text = ANY (ARRAY[('DIMM'::character varying)::text, ('SODIMM'::character varying)::text])))
);

CREATE SEQUENCE public.catalogo_memoria_ram_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.catalogo_memoria_ram_id_seq OWNED BY public.catalogo_memoria_ram.id;

CREATE TABLE public.catalogo_tipo_ram (
    id integer NOT NULL,
    tipo character varying(10) NOT NULL
);

CREATE SEQUENCE public.catalogo_tipo_ram_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.catalogo_tipo_ram_id_seq OWNED BY public.catalogo_tipo_ram.id;

CREATE TABLE public.clientes (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    telefono character varying(20),
    correo character varying(150),
    sucursal_id integer,
    fecha_registro timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;

CREATE TABLE public.comisiones (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    venta_id integer,
    mantenimiento_id integer,
    monto numeric(12,2) NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    equipo_id integer
);

CREATE SEQUENCE public.comisiones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.comisiones_id_seq OWNED BY public.comisiones.id;

CREATE TABLE public.configuracion_pagos (
    id integer NOT NULL,
    tipo_pago character varying(50) NOT NULL,
    requiere_factura boolean DEFAULT false,
    banco character varying(100),
    titular character varying(150),
    numero_cuenta character varying(50),
    clabe character varying(50),
    referencia text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    descripcion character varying(150)
);

CREATE SEQUENCE public.configuracion_pagos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.configuracion_pagos_id_seq OWNED BY public.configuracion_pagos.id;

CREATE TABLE public.configuraciones (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    valor text NOT NULL,
    descripcion text
);

CREATE SEQUENCE public.configuraciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.configuraciones_id_seq OWNED BY public.configuraciones.id;

CREATE TABLE public.equipos (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    cantidad integer DEFAULT 0 NOT NULL,
    tipo character varying(50),
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    procesador character varying(255),
    lote_etiqueta_id integer,
    estado_id integer,
    sucursal_id integer,
    tecnico_id integer
);

CREATE TABLE public.equipos_almacenamiento (
    id integer NOT NULL,
    equipo_id integer,
    almacenamiento_id integer,
    rol character varying(20),
    capacidad_override integer,
    orden integer,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.equipos_almacenamiento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.equipos_almacenamiento_id_seq OWNED BY public.equipos_almacenamiento.id;

CREATE SEQUENCE public.equipos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.equipos_id_seq OWNED BY public.equipos.id;

CREATE TABLE public.equipos_ram (
    id integer NOT NULL,
    equipo_id integer,
    memoria_ram_id integer,
    cantidad integer DEFAULT 1 NOT NULL,
    slot integer,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.equipos_ram_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.equipos_ram_id_seq OWNED BY public.equipos_ram.id;

CREATE TABLE public.garantia_solicitud_componentes (
    id integer NOT NULL,
    garantia_solicitud_item_id integer NOT NULL,
    inventario_id integer NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    descripcion character varying(255),
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.garantia_solicitud_componentes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.garantia_solicitud_componentes_id_seq OWNED BY public.garantia_solicitud_componentes.id;

CREATE TABLE public.garantia_solicitud_items (
    id integer NOT NULL,
    garantia_solicitud_id integer NOT NULL,
    venta_detalle_id integer NOT NULL,
    inventario_id integer,
    equipo_id integer,
    estado_item character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT garantia_solicitud_items_estado_item_check CHECK (((estado_item)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('reparado'::character varying)::text, ('reemplazado'::character varying)::text, ('devuelto'::character varying)::text, ('rechazado'::character varying)::text])))
);

CREATE SEQUENCE public.garantia_solicitud_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.garantia_solicitud_items_id_seq OWNED BY public.garantia_solicitud_items.id;

CREATE TABLE public.garantia_solicitudes (
    id integer NOT NULL,
    venta_id integer NOT NULL,
    sucursal_id integer NOT NULL,
    estado character varying(20) DEFAULT 'solicitada'::character varying NOT NULL,
    tipo_resolucion character varying(20),
    motivo_cliente text NOT NULL,
    diagnostico_tecnico text,
    motivo_rechazo text,
    monto_diferencia numeric(10,2) DEFAULT 0 NOT NULL,
    creado_por integer NOT NULL,
    tecnico_id integer,
    fecha_venta_snapshot date NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_revision timestamp without time zone,
    fecha_resolucion timestamp without time zone,
    fecha_actualizacion timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT garantia_solicitudes_estado_check CHECK (((estado)::text = ANY (ARRAY[('solicitada'::character varying)::text, ('en_revision'::character varying)::text, ('aprobada'::character varying)::text, ('rechazada'::character varying)::text, ('resuelta'::character varying)::text]))),
    CONSTRAINT garantia_solicitudes_tipo_resolucion_check CHECK (((tipo_resolucion)::text = ANY (ARRAY[('reparacion'::character varying)::text, ('reemplazo'::character varying)::text, ('devolucion'::character varying)::text])))
);

CREATE SEQUENCE public.garantia_solicitudes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.garantia_solicitudes_id_seq OWNED BY public.garantia_solicitudes.id;

CREATE TABLE public.garantias (
    id integer NOT NULL,
    venta_id integer NOT NULL,
    cliente character varying(255),
    archivo character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.garantias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.garantias_id_seq OWNED BY public.garantias.id;

CREATE TABLE public.inventario (
    id integer NOT NULL,
    tipo character varying(50),
    especificacion character varying(100),
    cantidad integer NOT NULL,
    disponibilidad boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    estado character varying(10) DEFAULT 'usado'::character varying,
    memoria_ram_id integer,
    almacenamiento_id integer,
    sucursal_id integer,
    precio numeric(10,2) DEFAULT 0,
    equipo_id integer,
    sku character varying(150),
    es_codigo_generado boolean DEFAULT false,
    barcode text,
    origen character varying(30) DEFAULT 'tecnico'::character varying NOT NULL,
    imagen_catalogo text,
    visible_catalogo boolean DEFAULT false,
    categoria_catalogo_id integer,
    eliminado boolean DEFAULT false,
    motivo_eliminacion text,
    fecha_eliminacion timestamp without time zone,
    eliminado_por integer,
    CONSTRAINT inventario_estado_check CHECK (((estado)::text = ANY (ARRAY[('nuevo'::character varying)::text, ('usado'::character varying)::text, ('cobrado'::character varying)::text, ('defectuoso'::character varying)::text, ('para_reparar'::character varying)::text])))
);

CREATE TABLE public.inventario_auditoria (
    id integer NOT NULL,
    inventario_id integer NOT NULL,
    usuario_id integer,
    accion character varying(20) NOT NULL,
    campo character varying(50),
    valor_anterior text,
    valor_nuevo text,
    contexto character varying(50),
    referencia_id integer,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventario_auditoria_accion_check CHECK (((accion)::text = ANY (ARRAY[('crear'::character varying)::text, ('editar'::character varying)::text, ('eliminar'::character varying)::text, ('stock_descuento'::character varying)::text, ('stock_aumento'::character varying)::text, ('traspaso'::character varying)::text])))
);

CREATE SEQUENCE public.inventario_auditoria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.inventario_auditoria_id_seq OWNED BY public.inventario_auditoria.id;

CREATE TABLE public.inventario_especificaciones (
    id integer NOT NULL,
    inventario_id integer,
    modelo character varying(150),
    procesador character varying(150),
    ram_gb integer,
    ram_tipo character varying(50),
    almacenamiento_gb integer,
    almacenamiento_tipo character varying(50),
    observaciones text
);

CREATE SEQUENCE public.inventario_especificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.inventario_especificaciones_id_seq OWNED BY public.inventario_especificaciones.id;

CREATE SEQUENCE public.inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.inventario_id_seq OWNED BY public.inventario.id;

CREATE TABLE public.lotes (
    id integer NOT NULL,
    etiqueta character varying(20) NOT NULL,
    fecha_recibo date DEFAULT CURRENT_DATE NOT NULL,
    total_equipos integer NOT NULL,
    usuario_recibio integer NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.lotes_etiquetas (
    id integer NOT NULL,
    lote_id integer,
    etiqueta character varying(50) NOT NULL,
    estado character varying(10) DEFAULT 'disponible'::character varying,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    serie character varying(20),
    barcode text
);

CREATE SEQUENCE public.lotes_etiquetas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.lotes_etiquetas_id_seq OWNED BY public.lotes_etiquetas.id;

CREATE SEQUENCE public.lotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.lotes_id_seq OWNED BY public.lotes.id;

CREATE TABLE public.mantenimientos (
    id integer NOT NULL,
    fecha_mantenimiento timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    detalle text,
    tecnico_id integer NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    catalogo_id integer,
    costo_personalizado numeric(10,2),
    sucursal_id integer NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL
);

CREATE SEQUENCE public.mantenimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.mantenimientos_id_seq OWNED BY public.mantenimientos.id;

CREATE TABLE public.pedido_items (
    id integer NOT NULL,
    pedido_id integer NOT NULL,
    tipo character varying(20) NOT NULL,
    equipo_id integer,
    inventario_id integer,
    estado_equipo_al_pedir integer,
    CONSTRAINT pedido_items_check CHECK (((((tipo)::text = 'sin_revisar'::text) AND (equipo_id IS NOT NULL) AND (inventario_id IS NULL)) OR (((tipo)::text = 'recepcion_directa'::text) AND (inventario_id IS NOT NULL) AND (equipo_id IS NULL)) OR (((tipo)::text = 'armado'::text) AND (inventario_id IS NOT NULL)))),
    CONSTRAINT pedido_items_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('sin_revisar'::character varying)::text, ('recepcion_directa'::character varying)::text, ('armado'::character varying)::text])))
);

CREATE SEQUENCE public.pedido_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.pedido_items_id_seq OWNED BY public.pedido_items.id;

CREATE TABLE public.pedidos (
    id integer NOT NULL,
    sucursal_origen_id integer NOT NULL,
    sucursal_destino_id integer NOT NULL,
    creado_por integer NOT NULL,
    tecnico_id integer NOT NULL,
    detalle text NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_completado timestamp without time zone,
    cancelado_por integer,
    motivo_cancelacion text,
    fecha_cancelacion timestamp without time zone,
    CONSTRAINT pedidos_check CHECK ((sucursal_origen_id <> sucursal_destino_id)),
    CONSTRAINT pedidos_estado_check CHECK (((estado)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('en_preparacion'::character varying)::text, ('listo'::character varying)::text, ('completado'::character varying)::text, ('cancelado'::character varying)::text])))
);

CREATE SEQUENCE public.pedidos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.pedidos_id_seq OWNED BY public.pedidos.id;

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL
);

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;

CREATE TABLE public.sucursales (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    direccion text,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.sucursales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.sucursales_id_seq OWNED BY public.sucursales.id;

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    "contraseña" character varying(255) NOT NULL,
    rol_id integer NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sucursal_id integer
);

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;

CREATE TABLE public.venta_detalle (
    id integer NOT NULL,
    venta_id integer NOT NULL,
    tipo character varying(20) NOT NULL,
    producto_id integer,
    mantenimiento_id integer,
    equipo_id integer,
    cantidad integer DEFAULT 1 NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    CONSTRAINT venta_detalle_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('producto'::character varying)::text, ('servicio'::character varying)::text])))
);

CREATE SEQUENCE public.venta_detalle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.venta_detalle_id_seq OWNED BY public.venta_detalle.id;

CREATE TABLE public.ventas (
    id integer NOT NULL,
    cliente character varying(255) NOT NULL,
    telefono character varying(20),
    correo character varying(255),
    metodo_pago character varying(50),
    observaciones text,
    user_venta integer NOT NULL,
    sucursal_id integer NOT NULL,
    total numeric(10,2) NOT NULL,
    fecha_venta timestamp without time zone DEFAULT now(),
    subtotal numeric(10,2),
    iva numeric(10,2),
    requiere_factura boolean DEFAULT false,
    cliente_id integer
);

CREATE SEQUENCE public.ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.ventas_id_seq OWNED BY public.ventas.id;

CREATE TABLE public.ventas_pagos (
    id integer NOT NULL,
    venta_id integer NOT NULL,
    metodo_pago character varying(50) NOT NULL,
    monto numeric(10,2) NOT NULL,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.ventas_pagos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.ventas_pagos_id_seq OWNED BY public.ventas_pagos.id;

ALTER TABLE ONLY public.apartado_abonos ALTER COLUMN id SET DEFAULT nextval('public.apartado_abonos_id_seq'::regclass);

ALTER TABLE ONLY public.apartados ALTER COLUMN id SET DEFAULT nextval('public.apartados_id_seq'::regclass);

ALTER TABLE ONLY public.caja_cortes ALTER COLUMN id SET DEFAULT nextval('public.caja_cortes_id_seq'::regclass);

ALTER TABLE ONLY public.caja_dias ALTER COLUMN id SET DEFAULT nextval('public.caja_dias_id_seq'::regclass);

ALTER TABLE ONLY public.caja_movimientos ALTER COLUMN id SET DEFAULT nextval('public.caja_movimientos_id_seq'::regclass);

ALTER TABLE ONLY public.catalogo_almacenamiento ALTER COLUMN id SET DEFAULT nextval('public.catalogo_almacenamiento_id_seq'::regclass);

ALTER TABLE ONLY public.catalogo_capacidad_ram ALTER COLUMN id SET DEFAULT nextval('public.catalogo_capacidad_ram_id_seq'::regclass);

ALTER TABLE ONLY public.catalogo_categorias ALTER COLUMN id SET DEFAULT nextval('public.catalogo_categorias_id_seq'::regclass);

ALTER TABLE ONLY public.catalogo_estados ALTER COLUMN id SET DEFAULT nextval('public.catalogo_estados_id_seq'::regclass);

ALTER TABLE ONLY public.catalogo_frecuencia_ram ALTER COLUMN id SET DEFAULT nextval('public.catalogo_frecuencia_ram_id_seq'::regclass);

ALTER TABLE ONLY public.catalogo_mantenimiento ALTER COLUMN id SET DEFAULT nextval('public.catalogo_mantenimiento_id_seq'::regclass);

ALTER TABLE ONLY public.catalogo_memoria_ram ALTER COLUMN id SET DEFAULT nextval('public.catalogo_memoria_ram_id_seq'::regclass);

ALTER TABLE ONLY public.catalogo_tipo_ram ALTER COLUMN id SET DEFAULT nextval('public.catalogo_tipo_ram_id_seq'::regclass);

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);

ALTER TABLE ONLY public.comisiones ALTER COLUMN id SET DEFAULT nextval('public.comisiones_id_seq'::regclass);

ALTER TABLE ONLY public.configuracion_pagos ALTER COLUMN id SET DEFAULT nextval('public.configuracion_pagos_id_seq'::regclass);

ALTER TABLE ONLY public.configuraciones ALTER COLUMN id SET DEFAULT nextval('public.configuraciones_id_seq'::regclass);

ALTER TABLE ONLY public.equipos ALTER COLUMN id SET DEFAULT nextval('public.equipos_id_seq'::regclass);

ALTER TABLE ONLY public.equipos_almacenamiento ALTER COLUMN id SET DEFAULT nextval('public.equipos_almacenamiento_id_seq'::regclass);

ALTER TABLE ONLY public.equipos_ram ALTER COLUMN id SET DEFAULT nextval('public.equipos_ram_id_seq'::regclass);

ALTER TABLE ONLY public.garantia_solicitud_componentes ALTER COLUMN id SET DEFAULT nextval('public.garantia_solicitud_componentes_id_seq'::regclass);

ALTER TABLE ONLY public.garantia_solicitud_items ALTER COLUMN id SET DEFAULT nextval('public.garantia_solicitud_items_id_seq'::regclass);

ALTER TABLE ONLY public.garantia_solicitudes ALTER COLUMN id SET DEFAULT nextval('public.garantia_solicitudes_id_seq'::regclass);

ALTER TABLE ONLY public.garantias ALTER COLUMN id SET DEFAULT nextval('public.garantias_id_seq'::regclass);

ALTER TABLE ONLY public.inventario ALTER COLUMN id SET DEFAULT nextval('public.inventario_id_seq'::regclass);

ALTER TABLE ONLY public.inventario_auditoria ALTER COLUMN id SET DEFAULT nextval('public.inventario_auditoria_id_seq'::regclass);

ALTER TABLE ONLY public.inventario_especificaciones ALTER COLUMN id SET DEFAULT nextval('public.inventario_especificaciones_id_seq'::regclass);

ALTER TABLE ONLY public.lotes ALTER COLUMN id SET DEFAULT nextval('public.lotes_id_seq'::regclass);

ALTER TABLE ONLY public.lotes_etiquetas ALTER COLUMN id SET DEFAULT nextval('public.lotes_etiquetas_id_seq'::regclass);

ALTER TABLE ONLY public.mantenimientos ALTER COLUMN id SET DEFAULT nextval('public.mantenimientos_id_seq'::regclass);

ALTER TABLE ONLY public.pedido_items ALTER COLUMN id SET DEFAULT nextval('public.pedido_items_id_seq'::regclass);

ALTER TABLE ONLY public.pedidos ALTER COLUMN id SET DEFAULT nextval('public.pedidos_id_seq'::regclass);

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);

ALTER TABLE ONLY public.sucursales ALTER COLUMN id SET DEFAULT nextval('public.sucursales_id_seq'::regclass);

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);

ALTER TABLE ONLY public.venta_detalle ALTER COLUMN id SET DEFAULT nextval('public.venta_detalle_id_seq'::regclass);

ALTER TABLE ONLY public.ventas ALTER COLUMN id SET DEFAULT nextval('public.ventas_id_seq'::regclass);

ALTER TABLE ONLY public.ventas_pagos ALTER COLUMN id SET DEFAULT nextval('public.ventas_pagos_id_seq'::regclass);

ALTER TABLE ONLY public.apartado_abonos
    ADD CONSTRAINT apartado_abonos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.apartados
    ADD CONSTRAINT apartados_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.caja_cortes
    ADD CONSTRAINT caja_cortes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.caja_dias
    ADD CONSTRAINT caja_dias_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.caja_dias
    ADD CONSTRAINT caja_dias_sucursal_id_fecha_key UNIQUE (sucursal_id, fecha);

ALTER TABLE ONLY public.caja_movimientos
    ADD CONSTRAINT caja_movimientos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.catalogo_almacenamiento
    ADD CONSTRAINT catalogo_almacenamiento_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.catalogo_capacidad_ram
    ADD CONSTRAINT catalogo_capacidad_ram_capacidad_gb_key UNIQUE (capacidad_gb);

ALTER TABLE ONLY public.catalogo_capacidad_ram
    ADD CONSTRAINT catalogo_capacidad_ram_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.catalogo_categorias
    ADD CONSTRAINT catalogo_categorias_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.catalogo_estados
    ADD CONSTRAINT catalogo_estados_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.catalogo_frecuencia_ram
    ADD CONSTRAINT catalogo_frecuencia_ram_id_tipo_ram_frecuencia_mhz_key UNIQUE (id_tipo_ram, frecuencia_mhz);

ALTER TABLE ONLY public.catalogo_frecuencia_ram
    ADD CONSTRAINT catalogo_frecuencia_ram_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.catalogo_mantenimiento
    ADD CONSTRAINT catalogo_mantenimiento_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.catalogo_memoria_ram
    ADD CONSTRAINT catalogo_memoria_ram_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.catalogo_memoria_ram
    ADD CONSTRAINT catalogo_memoria_ram_unique UNIQUE (id_frecuencia_ram, id_capacidad_ram, tipo_modulo);

ALTER TABLE ONLY public.catalogo_tipo_ram
    ADD CONSTRAINT catalogo_tipo_ram_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.catalogo_tipo_ram
    ADD CONSTRAINT catalogo_tipo_ram_tipo_key UNIQUE (tipo);

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_telefono_key UNIQUE (telefono);

ALTER TABLE ONLY public.comisiones
    ADD CONSTRAINT comisiones_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.configuracion_pagos
    ADD CONSTRAINT configuracion_pagos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.configuraciones
    ADD CONSTRAINT configuraciones_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.configuraciones
    ADD CONSTRAINT configuraciones_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.equipos_almacenamiento
    ADD CONSTRAINT equipos_almacenamiento_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT equipos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.equipos_ram
    ADD CONSTRAINT equipos_ram_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.garantia_solicitud_componentes
    ADD CONSTRAINT garantia_solicitud_componentes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.garantia_solicitud_items
    ADD CONSTRAINT garantia_solicitud_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.garantia_solicitudes
    ADD CONSTRAINT garantia_solicitudes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.garantias
    ADD CONSTRAINT garantias_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.inventario_auditoria
    ADD CONSTRAINT inventario_auditoria_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.inventario_especificaciones
    ADD CONSTRAINT inventario_especificaciones_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_etiqueta_key UNIQUE (etiqueta);

ALTER TABLE ONLY public.lotes_etiquetas
    ADD CONSTRAINT lotes_etiquetas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pedido_items
    ADD CONSTRAINT pedido_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.venta_detalle
    ADD CONSTRAINT venta_detalle_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ventas_pagos
    ADD CONSTRAINT ventas_pagos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);

CREATE INDEX idx_abonos_apartado ON public.apartado_abonos USING btree (apartado_id);

CREATE INDEX idx_apartados_cliente ON public.apartados USING btree (cliente_id);

CREATE INDEX idx_apartados_producto_activo ON public.apartados USING btree (producto_id) WHERE ((estado)::text = 'activo'::text);

CREATE INDEX idx_apartados_sucursal_estado ON public.apartados USING btree (sucursal_id, estado);

CREATE INDEX idx_auditoria_accion ON public.inventario_auditoria USING btree (accion);

CREATE INDEX idx_auditoria_fecha ON public.inventario_auditoria USING btree (fecha DESC);

CREATE INDEX idx_auditoria_inv_fecha ON public.inventario_auditoria USING btree (inventario_id, fecha DESC);

CREATE INDEX idx_auditoria_usuario ON public.inventario_auditoria USING btree (usuario_id);

CREATE INDEX idx_comisiones_usuario_id ON public.comisiones USING btree (usuario_id);

CREATE INDEX idx_equipos_almacenamiento_equipo ON public.equipos_almacenamiento USING btree (equipo_id);

CREATE INDEX idx_equipos_ram_equipo ON public.equipos_ram USING btree (equipo_id);

CREATE INDEX idx_garantia_componentes_item ON public.garantia_solicitud_componentes USING btree (garantia_solicitud_item_id);

CREATE INDEX idx_garantia_items_solicitud ON public.garantia_solicitud_items USING btree (garantia_solicitud_id);

CREATE INDEX idx_garantia_items_venta_detalle ON public.garantia_solicitud_items USING btree (venta_detalle_id);

CREATE INDEX idx_garantia_solicitudes_estado ON public.garantia_solicitudes USING btree (sucursal_id, estado);

CREATE INDEX idx_garantia_solicitudes_tecnico ON public.garantia_solicitudes USING btree (tecnico_id) WHERE ((estado)::text = ANY (ARRAY[('en_revision'::character varying)::text, ('aprobada'::character varying)::text]));

CREATE INDEX idx_garantia_solicitudes_venta ON public.garantia_solicitudes USING btree (venta_id);

CREATE UNIQUE INDEX idx_lotes_etiquetas_serie ON public.lotes_etiquetas USING btree (serie);

CREATE INDEX idx_mantenimientos_tecnico_id ON public.mantenimientos USING btree (tecnico_id);

CREATE INDEX idx_pedido_items_equipo ON public.pedido_items USING btree (equipo_id) WHERE (equipo_id IS NOT NULL);

CREATE INDEX idx_pedido_items_inventario ON public.pedido_items USING btree (inventario_id) WHERE (inventario_id IS NOT NULL);

CREATE INDEX idx_pedido_items_pedido ON public.pedido_items USING btree (pedido_id);

CREATE INDEX idx_pedidos_estado ON public.pedidos USING btree (estado);

CREATE INDEX idx_pedidos_sucursal_destino ON public.pedidos USING btree (sucursal_destino_id);

CREATE INDEX idx_pedidos_sucursal_origen ON public.pedidos USING btree (sucursal_origen_id);

CREATE INDEX idx_usuarios_rol_id ON public.usuarios USING btree (rol_id);

CREATE UNIQUE INDEX ux_pedido_items_equipo ON public.pedido_items USING btree (pedido_id, equipo_id) WHERE (equipo_id IS NOT NULL);

CREATE UNIQUE INDEX ux_pedido_items_inventario ON public.pedido_items USING btree (pedido_id, inventario_id) WHERE (inventario_id IS NOT NULL);

CREATE TRIGGER trg_auditoria_inventario AFTER INSERT OR DELETE OR UPDATE ON public.inventario FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_inventario();

ALTER TABLE ONLY public.apartado_abonos
    ADD CONSTRAINT apartado_abonos_apartado_id_fkey FOREIGN KEY (apartado_id) REFERENCES public.apartados(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.apartado_abonos
    ADD CONSTRAINT apartado_abonos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.apartados
    ADD CONSTRAINT apartados_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);

ALTER TABLE ONLY public.apartados
    ADD CONSTRAINT apartados_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.inventario(id);

ALTER TABLE ONLY public.apartados
    ADD CONSTRAINT apartados_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id);

ALTER TABLE ONLY public.apartados
    ADD CONSTRAINT apartados_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.apartados
    ADD CONSTRAINT apartados_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);

ALTER TABLE ONLY public.catalogo_frecuencia_ram
    ADD CONSTRAINT catalogo_frecuencia_ram_id_tipo_ram_fkey FOREIGN KEY (id_tipo_ram) REFERENCES public.catalogo_tipo_ram(id);

ALTER TABLE ONLY public.catalogo_memoria_ram
    ADD CONSTRAINT catalogo_memoria_ram_id_capacidad_ram_fkey FOREIGN KEY (id_capacidad_ram) REFERENCES public.catalogo_capacidad_ram(id);

ALTER TABLE ONLY public.catalogo_memoria_ram
    ADD CONSTRAINT catalogo_memoria_ram_id_frecuencia_ram_fkey FOREIGN KEY (id_frecuencia_ram) REFERENCES public.catalogo_frecuencia_ram(id);

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id);

ALTER TABLE ONLY public.comisiones
    ADD CONSTRAINT comisiones_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id);

ALTER TABLE ONLY public.comisiones
    ADD CONSTRAINT comisiones_mantenimiento_id_fkey FOREIGN KEY (mantenimiento_id) REFERENCES public.mantenimientos(id);

ALTER TABLE ONLY public.comisiones
    ADD CONSTRAINT comisiones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.comisiones
    ADD CONSTRAINT comisiones_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.equipos_almacenamiento
    ADD CONSTRAINT equipos_almacenamiento_almacenamiento_id_fkey FOREIGN KEY (almacenamiento_id) REFERENCES public.catalogo_almacenamiento(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.equipos_almacenamiento
    ADD CONSTRAINT equipos_almacenamiento_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT equipos_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES public.catalogo_estados(id);

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT equipos_lote_etiqueta_id_fkey FOREIGN KEY (lote_etiqueta_id) REFERENCES public.lotes_etiquetas(id);

ALTER TABLE ONLY public.equipos_ram
    ADD CONSTRAINT equipos_ram_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.equipos_ram
    ADD CONSTRAINT equipos_ram_memoria_ram_id_fkey FOREIGN KEY (memoria_ram_id) REFERENCES public.catalogo_memoria_ram(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT equipos_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT fk_categoria_catalogo FOREIGN KEY (categoria_catalogo_id) REFERENCES public.catalogo_categorias(id);

ALTER TABLE ONLY public.caja_cortes
    ADD CONSTRAINT fk_corte_autorizado_por FOREIGN KEY (autorizado_por) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT fk_equipos_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id);

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT fk_inventario_almacenamiento FOREIGN KEY (almacenamiento_id) REFERENCES public.catalogo_almacenamiento(id);

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT fk_inventario_memoria_ram FOREIGN KEY (memoria_ram_id) REFERENCES public.catalogo_memoria_ram(id);

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT fk_inventario_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id);

ALTER TABLE ONLY public.garantia_solicitud_componentes
    ADD CONSTRAINT garantia_solicitud_componentes_garantia_solicitud_item_id_fkey FOREIGN KEY (garantia_solicitud_item_id) REFERENCES public.garantia_solicitud_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.garantia_solicitud_componentes
    ADD CONSTRAINT garantia_solicitud_componentes_inventario_id_fkey FOREIGN KEY (inventario_id) REFERENCES public.inventario(id);

ALTER TABLE ONLY public.garantia_solicitud_items
    ADD CONSTRAINT garantia_solicitud_items_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id);

ALTER TABLE ONLY public.garantia_solicitud_items
    ADD CONSTRAINT garantia_solicitud_items_garantia_solicitud_id_fkey FOREIGN KEY (garantia_solicitud_id) REFERENCES public.garantia_solicitudes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.garantia_solicitud_items
    ADD CONSTRAINT garantia_solicitud_items_inventario_id_fkey FOREIGN KEY (inventario_id) REFERENCES public.inventario(id);

ALTER TABLE ONLY public.garantia_solicitud_items
    ADD CONSTRAINT garantia_solicitud_items_venta_detalle_id_fkey FOREIGN KEY (venta_detalle_id) REFERENCES public.venta_detalle(id);

ALTER TABLE ONLY public.garantia_solicitudes
    ADD CONSTRAINT garantia_solicitudes_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.garantia_solicitudes
    ADD CONSTRAINT garantia_solicitudes_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id);

ALTER TABLE ONLY public.garantia_solicitudes
    ADD CONSTRAINT garantia_solicitudes_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.garantia_solicitudes
    ADD CONSTRAINT garantia_solicitudes_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);

ALTER TABLE ONLY public.garantias
    ADD CONSTRAINT garantias_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.inventario_auditoria
    ADD CONSTRAINT inventario_auditoria_inventario_id_fkey FOREIGN KEY (inventario_id) REFERENCES public.inventario(id);

ALTER TABLE ONLY public.inventario_auditoria
    ADD CONSTRAINT inventario_auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id);

ALTER TABLE ONLY public.inventario_especificaciones
    ADD CONSTRAINT inventario_especificaciones_inventario_id_fkey FOREIGN KEY (inventario_id) REFERENCES public.inventario(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lotes_etiquetas
    ADD CONSTRAINT lotes_etiquetas_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_usuario_recibio_fkey FOREIGN KEY (usuario_recibio) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_catalogo_id_fkey FOREIGN KEY (catalogo_id) REFERENCES public.catalogo_mantenimiento(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.pedido_items
    ADD CONSTRAINT pedido_items_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id);

ALTER TABLE ONLY public.pedido_items
    ADD CONSTRAINT pedido_items_estado_equipo_al_pedir_fkey FOREIGN KEY (estado_equipo_al_pedir) REFERENCES public.catalogo_estados(id);

ALTER TABLE ONLY public.pedido_items
    ADD CONSTRAINT pedido_items_inventario_id_fkey FOREIGN KEY (inventario_id) REFERENCES public.inventario(id);

ALTER TABLE ONLY public.pedido_items
    ADD CONSTRAINT pedido_items_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_cancelado_por_fkey FOREIGN KEY (cancelado_por) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_sucursal_destino_id_fkey FOREIGN KEY (sucursal_destino_id) REFERENCES public.sucursales(id);

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_sucursal_origen_id_fkey FOREIGN KEY (sucursal_origen_id) REFERENCES public.sucursales(id);

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.usuarios(id);

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id);

ALTER TABLE ONLY public.venta_detalle
    ADD CONSTRAINT venta_detalle_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);

ALTER TABLE ONLY public.ventas_pagos
    ADD CONSTRAINT ventas_pagos_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;


