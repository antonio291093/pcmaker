const pool = require("../config/db");


async function registrarVenta({
  cliente,
  telefono,
  correo,
  pagos = [],
  productos = [],
  servicios = [],
  observaciones,
  usuario_id,
  sucursal_id,
  requiere_factura
}){

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // 🔹 Calcular subtotal productos
    const subtotalProductos = productos.reduce((acc, p) => {
      return acc + (p.cantidad * p.precio_unitario)
    }, 0)

    // 🔹 Calcular subtotal servicios
    let subtotalServicios = 0

    if (servicios.length > 0) {
      for (const mantenimientoId of servicios) {

        const { rows } = await client.query(
          `
          SELECT
            cm.costo AS precio,
            m.estado
          FROM mantenimientos m
          JOIN catalogo_mantenimiento cm
            ON cm.id = m.catalogo_id
          WHERE m.id = $1
          `,
          [mantenimientoId]
        )

        if (!rows.length) {
          throw new Error(`Mantenimiento ${mantenimientoId} no existe`)
        }

        const { precio, estado } = rows[0]

        if (estado !== "pendiente") {
          throw new Error(`Mantenimiento ${mantenimientoId} ya fue cobrado`)
        }

        subtotalServicios += Number(precio)
      }
    }

    const subtotalReal = subtotalProductos + subtotalServicios

    const ivaReal = requiere_factura
      ? Number((subtotalReal * 0.16).toFixed(2))
      : 0

    const totalReal = Number((subtotalReal + ivaReal).toFixed(2))

    // 1️⃣ Insertar encabezado
    const ventaResult = await client.query(
      `
      INSERT INTO ventas (
        cliente,
        telefono,
        correo,        
        observaciones,
        user_venta,
        sucursal_id,
        subtotal,
        iva,
        total,
        requiere_factura
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id;
      `,
      [
        cliente,
        telefono || null,
        correo || null,        
        observaciones || "",
        usuario_id,
        sucursal_id,
        subtotalReal,
        ivaReal,
        totalReal,
        requiere_factura || false
      ]
    )

    const ventaId = ventaResult.rows[0].id

    // 2️⃣ Registrar pagos
    for (const pago of pagos) {

      await client.query(
        `
        INSERT INTO ventas_pagos (
          venta_id,
          metodo_pago,
          monto
        )
        VALUES ($1,$2,$3)
        `,
        [
          ventaId,
          pago.metodo,
          pago.monto
        ]
      )

    }

    // 2️⃣ Insertar productos
    for (const producto of productos) {

      const subtotalProducto = producto.cantidad * producto.precio_unitario

      await client.query(
        `
        INSERT INTO venta_detalle (
          venta_id,
          tipo,
          producto_id,
          cantidad,
          precio_unitario,
          subtotal
        )
        VALUES ($1,'producto',$2,$3,$4,$5)
        `,
        [
          ventaId,
          producto.id,
          producto.cantidad,
          producto.precio_unitario,
          subtotalProducto
        ]
      )
    }

    // 3️⃣ Insertar servicios
    for (const mantenimientoId of servicios) {

      const { rows } = await client.query(
        `
        SELECT
          cm.costo AS precio,
          m.estado
        FROM mantenimientos m
        JOIN catalogo_mantenimiento cm
          ON cm.id = m.catalogo_id
        WHERE m.id = $1
        `,
        [mantenimientoId]
      )

      const { precio } = rows[0]

      await client.query(
        `
        INSERT INTO venta_detalle (
          venta_id,
          tipo,
          mantenimiento_id,
          equipo_id,
          cantidad,
          precio_unitario,
          subtotal
        )
        VALUES ($1,'servicio',$2,NULL,1,$3,$3)
        `,
        [ventaId, mantenimientoId, precio]
      )

      await client.query(
        `
        UPDATE mantenimientos
        SET estado = 'cobrado'
        WHERE id = $1
        `,
        [mantenimientoId]
      )
    }

    await client.query("COMMIT")

    return {
      venta_id: ventaId,
      subtotal: subtotalReal,
      iva: ivaReal,
      total: totalReal
    }

  } catch (error) {

    await client.query("ROLLBACK")
    console.error("❌ Error en registrarVenta:", error)
    throw error

  } finally {

    client.release()

  }
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
      ) AS pago,
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
    pool.query(facturacionQuery, [from, to, sucursal_id])
  ]);

  const totales = {
    efectivo: 0,
    transferencia: 0,
    terminal: 0,

    facturacion_subtotal: 0,
    facturacion_iva: 0,
    facturacion: 0,
    total_sin_iva: 0,

    total: 0
  };

  totalesRaw.rows.forEach(r => {

    const monto = Number(r.total);
    const metodo = r.metodo_pago;

    if (metodo === 'factura') {

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
    totales
  };
}

async function obtenerTotalesPorMetodo(fecha, sucursal_id) {
  const query = `
    SELECT
      COALESCE(SUM(total), 0) AS total_ventas,

      COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) AS total_efectivo,
      COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) AS total_transferencia,
      COALESCE(SUM(CASE WHEN metodo_pago = 'terminal' THEN total ELSE 0 END), 0) AS total_terminal,
      COALESCE(SUM(CASE WHEN metodo_pago = 'facturacion' THEN total ELSE 0 END), 0) AS total_facturacion
    FROM ventas
    WHERE DATE(fecha_venta) = $1
      AND sucursal_id = $2
  `

  const { rows } = await pool.query(query, [fecha, sucursal_id])
  return rows[0]
}

module.exports = {
  registrarVenta,
  obtenerReporteVentas,
  obtenerTotalesPorMetodo
};
