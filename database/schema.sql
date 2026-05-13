-- =============================================================
-- PCMaker ERP — Esquema completo de la base de datos PostgreSQL
-- Derivado de los modelos y queries en backend/src/
-- =============================================================

-- =============================================================
-- CATÁLOGOS BASE (sin dependencias externas)
-- =============================================================

CREATE TABLE roles (
    id   SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
    -- 1 = Admin, 2 = Técnico, 3 = Ventas
);

CREATE TABLE sucursales (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

CREATE TABLE catalogo_estados (
    id           SERIAL PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    visual_color VARCHAR(50)
    -- Valores conocidos: 1=Por revisar, 2=Revisado-Por armar, 3=Revisado-No funciona, 4=Armado
);

CREATE TABLE catalogo_memoria_ram (
    id          SERIAL PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL,
    tipo_modulo VARCHAR(50)
);

CREATE TABLE catalogo_almacenamiento (
    id          SERIAL PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL
);

CREATE TABLE catalogo_mantenimiento (
    id          SERIAL PRIMARY KEY,
    descripcion VARCHAR(150) NOT NULL,
    costo       NUMERIC(10, 2) NOT NULL DEFAULT 0,
    activo      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE catalogo_categorias (
    id          SERIAL PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL
);

CREATE TABLE configuraciones (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    valor       VARCHAR(255),
    descripcion VARCHAR(255)
    -- Clave conocida: 'comision_ventas' (tasa decimal, ej. '0.03')
);

CREATE TABLE configuracion_pagos (
    id               SERIAL PRIMARY KEY,
    tipo_pago        VARCHAR(50),   -- 'TRANSFERENCIA', etc.
    requiere_factura BOOLEAN,
    banco            VARCHAR(100),
    titular          VARCHAR(150),
    numero_cuenta    VARCHAR(50),
    clabe            VARCHAR(18),
    referencia       VARCHAR(100),
    descripcion      VARCHAR(255),
    activo           BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================================================
-- USUARIOS
-- =============================================================

CREATE TABLE usuarios (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    contraseña  VARCHAR(255) NOT NULL,
    rol_id      INT NOT NULL REFERENCES roles(id),
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    sucursal_id INT REFERENCES sucursales(id)
);

-- =============================================================
-- RECEPCIÓN DE LOTES Y EQUIPOS
-- =============================================================

CREATE TABLE lotes (
    id              SERIAL PRIMARY KEY,
    etiqueta        VARCHAR(100),
    fecha_recibo    DATE,
    total_equipos   INT,
    usuario_recibio INT REFERENCES usuarios(id),
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE lotes_etiquetas (
    id      SERIAL PRIMARY KEY,
    lote_id INT NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    etiqueta VARCHAR(100),
    serie    VARCHAR(100),
    barcode  TEXT
);

CREATE TABLE equipos (
    id               SERIAL PRIMARY KEY,
    nombre           VARCHAR(150),
    descripcion      TEXT,
    tipo             VARCHAR(100),
    procesador       VARCHAR(150),
    lote_etiqueta_id INT REFERENCES lotes_etiquetas(id),
    estado_id        INT REFERENCES catalogo_estados(id),
    sucursal_id      INT REFERENCES sucursales(id),
    tecnico_id       INT REFERENCES usuarios(id),
    fecha_creacion   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE equipos_ram (
    equipo_id      INT NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    memoria_ram_id INT NOT NULL REFERENCES catalogo_memoria_ram(id),
    cantidad       INT NOT NULL DEFAULT 1,
    PRIMARY KEY (equipo_id, memoria_ram_id)
);

CREATE TABLE equipos_almacenamiento (
    equipo_id         INT NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    almacenamiento_id INT NOT NULL REFERENCES catalogo_almacenamiento(id),
    rol               VARCHAR(50),  -- ej. 'principal', 'secundario'
    PRIMARY KEY (equipo_id, almacenamiento_id)
);

-- =============================================================
-- INVENTARIO
-- =============================================================

CREATE TABLE inventario (
    id                   SERIAL PRIMARY KEY,
    equipo_id            INT REFERENCES equipos(id),          -- NULL = no es equipo armado
    sucursal_id          INT REFERENCES sucursales(id),
    tipo                 VARCHAR(100),
    especificacion       VARCHAR(255),
    cantidad             INT NOT NULL DEFAULT 1,
    disponibilidad       BOOLEAN NOT NULL DEFAULT TRUE,
    estado               VARCHAR(50) CHECK (estado IN ('nuevo', 'usado', 'cobrado')),
    precio               NUMERIC(10, 2) DEFAULT 0,
    memoria_ram_id       INT REFERENCES catalogo_memoria_ram(id),
    almacenamiento_id    INT REFERENCES catalogo_almacenamiento(id),
    fecha_creacion       TIMESTAMP NOT NULL DEFAULT NOW(),
    sku                  VARCHAR(100),
    barcode              TEXT,
    es_codigo_generado   BOOLEAN NOT NULL DEFAULT FALSE,
    origen               VARCHAR(50) CHECK (origen IN ('tecnico', 'recepcion_directa')),
    imagen_catalogo      VARCHAR(255),
    visible_catalogo     BOOLEAN NOT NULL DEFAULT FALSE,
    categoria_catalogo_id INT REFERENCES catalogo_categorias(id),
    eliminado            BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_eliminacion   TEXT,
    fecha_eliminacion    TIMESTAMP,
    eliminado_por        INT REFERENCES usuarios(id)
);

-- Especificaciones extendidas para equipos de recepción directa
CREATE TABLE inventario_especificaciones (
    inventario_id      INT PRIMARY KEY REFERENCES inventario(id) ON DELETE CASCADE,
    modelo             VARCHAR(150),
    procesador         VARCHAR(150),
    ram_gb             INT,
    ram_tipo           VARCHAR(50),
    almacenamiento_gb  INT,
    almacenamiento_tipo VARCHAR(50),
    observaciones      TEXT
);

-- =============================================================
-- MANTENIMIENTOS
-- =============================================================

CREATE TABLE mantenimientos (
    id                  SERIAL PRIMARY KEY,
    fecha_mantenimiento DATE,
    detalle             TEXT,
    tecnico_id          INT REFERENCES usuarios(id),
    sucursal_id         INT REFERENCES sucursales(id),
    catalogo_id         INT REFERENCES catalogo_mantenimiento(id),
    costo_personalizado NUMERIC(10, 2),
    estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente', 'cobrado')),
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================
-- VENTAS
-- =============================================================

CREATE TABLE ventas (
    id               SERIAL PRIMARY KEY,
    cliente          VARCHAR(150) NOT NULL,
    telefono         VARCHAR(20),
    correo           VARCHAR(150),
    observaciones    TEXT,
    user_venta       INT REFERENCES usuarios(id),
    sucursal_id      INT REFERENCES sucursales(id),
    subtotal         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    iva              NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total            NUMERIC(10, 2) NOT NULL DEFAULT 0,
    requiere_factura BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_venta      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE venta_detalle (
    id               SERIAL PRIMARY KEY,
    venta_id         INT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    tipo             VARCHAR(20) NOT NULL CHECK (tipo IN ('producto', 'servicio')),
    producto_id      INT REFERENCES inventario(id),      -- NULL si es servicio
    mantenimiento_id INT REFERENCES mantenimientos(id),  -- NULL si es producto
    equipo_id        INT REFERENCES equipos(id),         -- denormalizado para reportes
    cantidad         INT NOT NULL DEFAULT 1,
    precio_unitario  NUMERIC(10, 2) NOT NULL DEFAULT 0,
    subtotal         NUMERIC(10, 2) NOT NULL DEFAULT 0
);

CREATE TABLE ventas_pagos (
    id          SERIAL PRIMARY KEY,
    venta_id    INT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    metodo_pago VARCHAR(20) NOT NULL
                    CHECK (metodo_pago IN ('efectivo', 'transferencia', 'terminal', 'facturacion')),
    monto       NUMERIC(10, 2) NOT NULL DEFAULT 0
);

-- =============================================================
-- CAJA
-- =============================================================

CREATE TABLE caja_movimientos (
    id          SERIAL PRIMARY KEY,
    tipo        VARCHAR(20) NOT NULL CHECK (tipo IN ('venta', 'gasto', 'ingreso')),
    monto       NUMERIC(10, 2) NOT NULL,
    descripcion VARCHAR(255),
    sucursal_id INT REFERENCES sucursales(id),
    usuario_id  INT REFERENCES usuarios(id),
    fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE caja_dias (
    usuario_id  INT REFERENCES usuarios(id),
    sucursal_id INT NOT NULL REFERENCES sucursales(id),
    fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
    estado      VARCHAR(10) NOT NULL DEFAULT 'abierto'
                    CHECK (estado IN ('abierto', 'cerrado')),
    UNIQUE (sucursal_id, fecha)
);

CREATE TABLE caja_cortes (
    id                  SERIAL PRIMARY KEY,
    fecha               DATE NOT NULL,
    sucursal_id         INT NOT NULL REFERENCES sucursales(id),
    usuario_id          INT REFERENCES usuarios(id),
    total_ventas        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_ingresos      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_gastos        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    balance_final       NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_efectivo      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_transferencia NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_terminal      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_facturacion   NUMERIC(10, 2) NOT NULL DEFAULT 0,
    es_extra            BOOLEAN NOT NULL DEFAULT FALSE,
    hora_corte          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================
-- COMISIONES
-- =============================================================

CREATE TABLE comisiones (
    id               SERIAL PRIMARY KEY,
    usuario_id       INT NOT NULL REFERENCES usuarios(id),
    venta_id         INT REFERENCES ventas(id),
    mantenimiento_id INT REFERENCES mantenimientos(id),
    equipo_id        INT REFERENCES equipos(id),
    monto            NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fecha_creacion   TIMESTAMP NOT NULL DEFAULT NOW()
    -- tipo implícito: venta_id IS NOT NULL → 'venta'
    --                 equipo_id IS NOT NULL → 'armado'
    --                 mantenimiento_id IS NOT NULL → 'mantenimiento'
);

-- =============================================================
-- PEDIDOS (traslado de equipos entre sucursales)
-- =============================================================

CREATE TABLE pedidos (
    id                  SERIAL PRIMARY KEY,
    detalle             TEXT,
    sucursal_destino_id INT REFERENCES sucursales(id),
    tecnico_id          INT REFERENCES usuarios(id),
    creado_por          INT REFERENCES usuarios(id),
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE pedido_equipos (
    pedido_id              INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    equipo_id              INT NOT NULL REFERENCES equipos(id),
    estado_equipo_al_pedir INT REFERENCES catalogo_estados(id),
    PRIMARY KEY (pedido_id, equipo_id)
);

-- =============================================================
-- ÍNDICES ADICIONALES (rendimiento en queries frecuentes)
-- =============================================================

CREATE INDEX idx_inventario_sucursal       ON inventario(sucursal_id) WHERE eliminado = FALSE;
CREATE INDEX idx_inventario_equipo         ON inventario(equipo_id);
CREATE INDEX idx_inventario_sku            ON inventario(sku);
CREATE INDEX idx_equipos_estado            ON equipos(estado_id);
CREATE INDEX idx_equipos_sucursal          ON equipos(sucursal_id);
CREATE INDEX idx_ventas_sucursal_fecha     ON ventas(sucursal_id, fecha_venta);
CREATE INDEX idx_venta_detalle_venta       ON venta_detalle(venta_id);
CREATE INDEX idx_caja_movimientos_sucursal ON caja_movimientos(sucursal_id, fecha);
CREATE INDEX idx_mantenimientos_estado     ON mantenimientos(estado, sucursal_id);
CREATE INDEX idx_comisiones_usuario        ON comisiones(usuario_id);
