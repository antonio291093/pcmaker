const pool = require("../config/db");

async function obtenerResumenSucursales({ fecha }) {
  const query = `
    SELECT 
      s.id,
      s.nombre,

      COALESCE(m.ingresos, 0) as ingresos,
      COALESCE(m.gastos, 0) as gastos,
      COALESCE(m.ingresos, 0) - COALESCE(m.gastos, 0) as neto,

      EXISTS (
        SELECT 1 
        FROM caja_cortes c
        WHERE c.sucursal_id = s.id
        AND DATE(c.fecha) = $1
      ) as corte_realizado

    FROM sucursales s

    LEFT JOIN (
      SELECT 
        sucursal_id,
        SUM(CASE WHEN tipo IN ('ingreso', 'venta') THEN monto ELSE 0 END) as ingresos,
        SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END) as gastos
      FROM caja_movimientos
      WHERE DATE(fecha) = $1
      GROUP BY sucursal_id
    ) m ON m.sucursal_id = s.id

    ORDER BY s.id;
  `;

  const { rows } = await pool.query(query, [fecha]);

  return rows;
}

async function obtenerReporteVentas({ from, to, sucursal_id }) {
  const detalleQuery = `
    SELECT
      d.id AS detalle_id,
      v.id AS venta_id,
      v.cliente,

      d.cantidad,
      (
        SELECT string_agg(metodo_pago, ' + ')
        FROM ventas_pagos vp
        WHERE vp.venta_id = v.id
      ) AS metodo_pago,
      v.fecha_venta::date AS fecha_venta,

      -- ✅ Subtotal calculado (CLAVE)
      (d.cantidad * d.precio_unitario) AS subtotal,

      -- 🔹 DESCRIPCIÓN UNIFICADA
      CASE
        -- Equipo armado
        WHEN i.equipo_id IS NOT NULL THEN e.nombre

        -- Recepción directa
        WHEN ie.inventario_id IS NOT NULL THEN ie.modelo

        -- Inventario simple
        WHEN i.id IS NOT NULL THEN i.especificacion

        -- Servicios
        ELSE cm.descripcion
      END AS descripcion,

      -- 🔹 ESPECIFICACIONES
      CASE
        -- Equipo armado
        WHEN i.equipo_id IS NOT NULL THEN
          CONCAT(
            e.procesador, ' | ',
            (
              SELECT string_agg(
                substring(cmr.descripcion FROM '([0-9]+[ ]*GB)'),
                ' + '
              )
              FROM equipos_ram er
              JOIN catalogo_memoria_ram cmr ON cmr.id = er.memoria_ram_id
              WHERE er.equipo_id = e.id
            ),
            ' | ',
            (
              SELECT string_agg(ca.descripcion, ' + ')
              FROM equipos_almacenamiento ea
              JOIN catalogo_almacenamiento ca ON ca.id = ea.almacenamiento_id
              WHERE ea.equipo_id = e.id
            )
          )

        -- Recepción directa
        WHEN ie.inventario_id IS NOT NULL THEN
          CONCAT(
            ie.procesador, ' | ',
            ie.ram_gb, 'GB ', ie.ram_tipo, ' | ',
            ie.almacenamiento_gb, 'GB ', ie.almacenamiento_tipo
          )

        -- Inventario simple → opcional
        ELSE NULL
      END AS especificaciones

    FROM ventas v
    JOIN venta_detalle d ON d.venta_id = v.id

    -- Inventario base
    LEFT JOIN inventario i ON i.id = d.producto_id

    -- Equipo armado
    LEFT JOIN equipos e ON e.id = i.equipo_id

    -- Recepción directa
    LEFT JOIN inventario_especificaciones ie
      ON ie.inventario_id = d.producto_id

    -- Servicios
    LEFT JOIN mantenimientos m ON m.id = d.mantenimiento_id
    LEFT JOIN catalogo_mantenimiento cm ON cm.id = m.catalogo_id

    WHERE v.fecha_venta::date BETWEEN $1 AND $2
      AND ($3::INTEGER IS NULL OR v.sucursal_id = $3)

    ORDER BY v.fecha_venta DESC;

  `;

  const totalesQuery = `
    SELECT
      vp.metodo_pago AS metodo_pago,
      SUM(vp.monto) AS total
    FROM ventas v
    JOIN ventas_pagos vp
      ON vp.venta_id = v.id
    WHERE v.fecha_venta::date BETWEEN $1 AND $2
      AND ($3::INTEGER IS NULL OR v.sucursal_id = $3)
    GROUP BY vp.metodo_pago;
  `;

  const facturacionQuery = `
    SELECT
      SUM(subtotal) AS subtotal,
      SUM(iva) AS iva,
      SUM(total) AS total
    FROM ventas
    WHERE requiere_factura = true
      AND fecha_venta::date BETWEEN $1 AND $2
      AND ($3::INTEGER IS NULL OR sucursal_id = $3);
  `;

  const [detalle, totalesRaw, facturacionRaw] = await Promise.all([
    pool.query(detalleQuery, [from, to, sucursal_id]),
    pool.query(totalesQuery, [from, to, sucursal_id]),
    pool.query(facturacionQuery, [from, to, sucursal_id]),
  ]);

  const totales = {
    efectivo: 0,
    transferencia: 0,
    terminal: 0,

    facturacion_subtotal: 0,
    facturacion_iva: 0,
    facturacion: 0,
    total_sin_iva: 0,

    total: 0,
  };

  totalesRaw.rows.forEach((r) => {
    const monto = Number(r.total);
    const metodo = r.metodo_pago;

    if (metodo === "factura") {
      const subtotal = monto / 1.16;
      const iva = monto - subtotal;

      totales.facturacion += monto;
      totales.facturacion_subtotal += subtotal;
      totales.facturacion_iva += iva;
    } else if (totales[metodo] !== undefined) {
      totales[metodo] += monto;
    }

    totales.total += monto;
  });

  if (facturacionRaw.rows.length) {
    const f = facturacionRaw.rows[0];

    totales.facturacion_subtotal = Number(f.subtotal) || 0;
    totales.facturacion_iva = Number(f.iva) || 0;
    totales.facturacion = Number(f.total) || 0;
  }

  totales.total_sin_iva = totales.total - totales.facturacion_iva;

  return {
    detalle: detalle.rows,
    totales,
  };
}

async function obtenerDetalleDiario({ sucursal_id, fecha }) {
  // 🔹 1. DETALLE DE VENTAS (REUTILIZADO)
  const ventasQuery = `
    SELECT
      d.id AS detalle_id,
      v.id AS venta_id,
      v.cliente,

      d.cantidad,

      (
        SELECT string_agg(
          metodo_pago || ': $' || monto,
          ' + '
        )
        FROM ventas_pagos vp
        WHERE vp.venta_id = v.id
      ) AS metodo_pago,

      v.fecha_venta::date AS fecha_venta,

      (d.cantidad * d.precio_unitario) AS subtotal,

      CASE
        WHEN i.equipo_id IS NOT NULL THEN e.nombre
        WHEN ie.inventario_id IS NOT NULL THEN ie.modelo
        WHEN i.id IS NOT NULL THEN i.especificacion
        ELSE cm.descripcion
      END AS descripcion,

      CASE
        WHEN i.equipo_id IS NOT NULL THEN
          CONCAT(
            e.procesador, ' | ',
            (
              SELECT string_agg(
                substring(cmr.descripcion FROM '([0-9]+[ ]*GB)'),
                ' + '
              )
              FROM equipos_ram er
              JOIN catalogo_memoria_ram cmr ON cmr.id = er.memoria_ram_id
              WHERE er.equipo_id = e.id
            ),
            ' | ',
            (
              SELECT string_agg(ca.descripcion, ' + ')
              FROM equipos_almacenamiento ea
              JOIN catalogo_almacenamiento ca ON ca.id = ea.almacenamiento_id
              WHERE ea.equipo_id = e.id
            )
          )

        WHEN ie.inventario_id IS NOT NULL THEN
          CONCAT(
            ie.procesador, ' | ',
            ie.ram_gb, 'GB ', ie.ram_tipo, ' | ',
            ie.almacenamiento_gb, 'GB ', ie.almacenamiento_tipo
          )

        ELSE NULL
      END AS especificaciones

    FROM ventas v
    JOIN venta_detalle d ON d.venta_id = v.id
    LEFT JOIN inventario i ON i.id = d.producto_id
    LEFT JOIN equipos e ON e.id = i.equipo_id
    LEFT JOIN inventario_especificaciones ie ON ie.inventario_id = d.producto_id
    LEFT JOIN mantenimientos m ON m.id = d.mantenimiento_id
    LEFT JOIN catalogo_mantenimiento cm ON cm.id = m.catalogo_id

    WHERE DATE(v.fecha_venta) = $1
      AND v.sucursal_id = $2

    ORDER BY v.fecha_venta DESC;
  `;

  // 🔹 2. TOTALES POR MÉTODO (REUTILIZADO)
  const totalesQuery = `
    SELECT
      vp.metodo_pago,
      SUM(vp.monto) AS total
    FROM ventas v
    JOIN ventas_pagos vp ON vp.venta_id = v.id
    WHERE DATE(v.fecha_venta) = $1
      AND v.sucursal_id = $2
    GROUP BY vp.metodo_pago;
  `;

  // 🔹 3. MOVIMIENTOS DE CAJA
  const movimientosQuery = `
    SELECT 
      id,
      tipo,
      monto,
      descripcion,
      fecha
    FROM caja_movimientos
    WHERE sucursal_id = $2
      AND DATE(fecha) = $1
    ORDER BY fecha DESC;
  `;

  // 🔹 4. RESUMEN DE CAJA
  const resumenCajaQuery = `
    SELECT 
      SUM(CASE WHEN tipo = 'venta' THEN monto ELSE 0 END) as ventas,
      SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as otros_ingresos,
      SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END) as gastos
    FROM caja_movimientos
    WHERE sucursal_id = $2
      AND DATE(fecha) = $1;
  `;

  // 🔹 5. CORTE
  const corteQuery = `
    SELECT c.fecha, u.nombre as usuario
    FROM caja_cortes c
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    WHERE c.sucursal_id = $2
      AND DATE(c.fecha) = $1
    LIMIT 1;
  `;

  const [ventas, totalesRaw, movimientos, resumenCajaRaw, corteRaw] =
    await Promise.all([
      pool.query(ventasQuery, [fecha, sucursal_id]),
      pool.query(totalesQuery, [fecha, sucursal_id]),
      pool.query(movimientosQuery, [fecha, sucursal_id]),
      pool.query(resumenCajaQuery, [fecha, sucursal_id]),
      pool.query(corteQuery, [fecha, sucursal_id]),
    ]);

  // 🔥 Procesar totales
  const totales = {
    efectivo: 0,
    transferencia: 0,
    terminal: 0,
    total: 0,
  };

  totalesRaw.rows.forEach((r) => {
    const monto = Number(r.total);
    const metodo = r.metodo_pago;

    if (totales[metodo] !== undefined) {
      totales[metodo] += monto;
    }

    totales.total += monto;
  });

  // 🔥 Resumen caja
  const rc = resumenCajaRaw.rows[0] || {};

  const resumen_caja = {
    ventas: Number(rc.ventas) || 0,
    otros_ingresos: Number(rc.otros_ingresos) || 0,
    gastos: Number(rc.gastos) || 0,
    neto:
      (Number(rc.ventas) || 0) +
      (Number(rc.otros_ingresos) || 0) -
      (Number(rc.gastos) || 0),
  };

  // 🔐 Corte
  const corte = corteRaw.rows[0]
    ? {
        realizado: true,
        usuario: corteRaw.rows[0].usuario,
        hora: corteRaw.rows[0].fecha,
      }
    : { realizado: false };

  return {
    ventas: ventas.rows,
    totales,
    movimientos: movimientos.rows,
    resumen_caja,
    corte,
  };
}

async function obtenerArticulosEliminados({ from, to }) {
  const query = `
    SELECT
      i.id,

      -- 🔹 Tipo artículo
      CASE
        WHEN i.equipo_id IS NOT NULL THEN 'Equipo Armado'
        WHEN ie.inventario_id IS NOT NULL THEN 'Recepción Directa'
        ELSE 'Inventario General'
      END AS tipo_articulo,

      -- 🔹 Descripción
      CASE
        WHEN i.equipo_id IS NOT NULL THEN e.nombre
        WHEN ie.inventario_id IS NOT NULL THEN ie.modelo
        ELSE i.especificacion
      END AS descripcion,

      -- 🔹 Especificaciones
      CASE

        -- Equipo armado
        WHEN i.equipo_id IS NOT NULL THEN
          CONCAT(
            e.procesador,
            ' | ',
            (
              SELECT string_agg(
                substring(cmr.descripcion FROM '([0-9]+[ ]*GB)'),
                ' + '
              )
              FROM equipos_ram er
              JOIN catalogo_memoria_ram cmr
                ON cmr.id = er.memoria_ram_id
              WHERE er.equipo_id = e.id
            ),
            ' | ',
            (
              SELECT string_agg(ca.descripcion, ' + ')
              FROM equipos_almacenamiento ea
              JOIN catalogo_almacenamiento ca
                ON ca.id = ea.almacenamiento_id
              WHERE ea.equipo_id = e.id
            )
          )

        -- Recepción directa
        WHEN ie.inventario_id IS NOT NULL THEN
          CONCAT(
            ie.procesador,
            ' | ',
            ie.ram_gb, 'GB ', ie.ram_tipo,
            ' | ',
            ie.almacenamiento_gb, 'GB ',
            ie.almacenamiento_tipo
          )

        ELSE NULL

      END AS especificaciones,

      -- 🔹 Serie / SKU
      COALESCE(i.sku, le.serie) AS serie,

      -- 🔹 Código barras
      CASE
        WHEN i.equipo_id IS NOT NULL THEN le.barcode
        ELSE i.barcode
      END AS codigo_barras,

      -- 🔹 Precio
      i.precio,

      -- 🔹 Sucursal
      s.nombre AS sucursal,

      -- 🔹 Usuario eliminación
      u.nombre AS eliminado_por,

      -- 🔹 Motivo
      i.motivo_eliminacion,

      -- 🔹 Fecha
      i.fecha_eliminacion

    FROM inventario i

    -- 🔹 Equipos armados
    LEFT JOIN equipos e
      ON e.id = i.equipo_id

    LEFT JOIN lotes_etiquetas le
      ON e.lote_etiqueta_id = le.id

    -- 🔹 Recepción directa
    LEFT JOIN inventario_especificaciones ie
      ON ie.inventario_id = i.id

    -- 🔹 Sucursal
    LEFT JOIN sucursales s
      ON s.id = i.sucursal_id

    -- 🔹 Usuario
    LEFT JOIN usuarios u
      ON u.id = i.eliminado_por

    WHERE i.eliminado = true     

      AND (
        $1::date IS NULL
        OR DATE(i.fecha_eliminacion) >= $1
      )

      AND (
        $2::date IS NULL
        OR DATE(i.fecha_eliminacion) <= $2
      )

    ORDER BY i.fecha_eliminacion DESC;
  `;

  const { rows } = await pool.query(query, [from || null, to || null]);

  return rows;
}

module.exports = {
  obtenerResumenSucursales,
  obtenerReporteVentas,
  obtenerDetalleDiario,
  obtenerArticulosEliminados,
};
