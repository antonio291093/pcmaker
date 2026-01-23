const pool = require("../config/db");

async function registrarVenta({
  cliente,
  telefono,
  correo,
  metodo_pago,
  productos = [],
  servicios = [],
  observaciones,
  usuario_id,
  sucursal_id,
  total
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Insertar encabezado de venta
    const ventaResult = await client.query(
      `
      INSERT INTO ventas (
        cliente,
        telefono,
        correo,
        metodo_pago,
        observaciones,
        user_venta,
        sucursal_id,
        total
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id;
      `,
      [
        cliente,
        telefono || null,
        correo || null,
        metodo_pago,
        observaciones || "",
        usuario_id,
        sucursal_id,
        total
      ]
    );

    const ventaId = ventaResult.rows[0].id;

    // 2️⃣ Insertar productos en detalle
    for (const producto of productos) {
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
          producto.cantidad * producto.precio_unitario
        ]
      );
    }

    // 3️⃣ Insertar servicios en detalle
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
      );

      if (!rows.length) {
        throw new Error(`Mantenimiento ${mantenimientoId} no existe`);
      }

      const { precio, estado } = rows[0];

      if (estado !== "pendiente") {
        throw new Error(`Mantenimiento ${mantenimientoId} ya fue cobrado`);
      }

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
        VALUES ($1,'servicio',$2,NULL,1,$4,$4)
        `,
        [ventaId, mantenimientoId, precio]
      );

      await client.query(
        `
        UPDATE mantenimientos
        SET estado = 'cobrado'
        WHERE id = $1
        `,
        [mantenimientoId]
      );
    }

    await client.query("COMMIT");

    return {
      venta_id: ventaId,
      total
    };

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error en registrarVenta:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function obtenerReporteVentas({ from, to, sucursal_id }) {
  const detalleQuery = `
    SELECT
  d.id AS detalle_id,
  v.id AS venta_id,
  v.cliente,

  d.cantidad,
  v.metodo_pago,
  v.fecha_venta::date AS fecha_venta,
  d.subtotal,

  -- Nombre del equipo o concepto normal
  CASE
    WHEN i.equipo_id IS NOT NULL THEN e.nombre
    ELSE COALESCE(i.especificacion, cm.descripcion)
  END AS descripcion,

  -- Specs solo si es equipo
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
    ELSE NULL
  END AS especificaciones

FROM ventas v
JOIN venta_detalle d ON d.venta_id = v.id
LEFT JOIN inventario i ON i.id = d.producto_id
LEFT JOIN equipos e ON e.id = i.equipo_id
LEFT JOIN mantenimientos m ON m.id = d.mantenimiento_id
LEFT JOIN catalogo_mantenimiento cm ON cm.id = m.catalogo_id

WHERE v.fecha_venta::date BETWEEN $1 AND $2
  AND ($3::INTEGER IS NULL OR v.sucursal_id = $3)

ORDER BY v.fecha_venta DESC;
  `;

  const totalesQuery = `
    SELECT
      metodo_pago,
      SUM(total) AS total
    FROM ventas
    WHERE fecha_venta::date BETWEEN $1 AND $2
      AND ($3::INTEGER IS NULL OR sucursal_id = $3)
    GROUP BY metodo_pago;
  `;

  const [detalle, totalesRaw] = await Promise.all([
    pool.query(detalleQuery, [from, to, sucursal_id]),
    pool.query(totalesQuery, [from, to, sucursal_id])
  ]);

  const totales = {
    efectivo: 0,
    transferencia: 0,
    terminal: 0,
    facturacion: 0,
    total: 0
  };

  totalesRaw.rows.forEach(r => {
    totales[r.metodo_pago] = Number(r.total);
    totales.total += Number(r.total);
  });

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
