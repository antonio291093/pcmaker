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
  requiere_factura,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 🔹 Calcular subtotal productos
    const subtotalProductos = productos.reduce((acc, p) => {
      return acc + p.cantidad * p.precio_unitario;
    }, 0);

    // 🔹 Calcular subtotal servicios
    let subtotalServicios = 0;

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
          [mantenimientoId],
        );

        if (!rows.length) {
          throw new Error(`Mantenimiento ${mantenimientoId} no existe`);
        }

        const { precio, estado } = rows[0];

        if (estado !== "pendiente") {
          throw new Error(`Mantenimiento ${mantenimientoId} ya fue cobrado`);
        }

        subtotalServicios += Number(precio);
      }
    }

    const subtotalReal = subtotalProductos + subtotalServicios;

    const ivaReal = requiere_factura
      ? Number((subtotalReal * 0.16).toFixed(2))
      : 0;

    const totalReal = Number((subtotalReal + ivaReal).toFixed(2));

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
        requiere_factura || false,
      ],
    );

    const ventaId = ventaResult.rows[0].id;

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
        [ventaId, pago.metodo, pago.monto],
      );
    }

    // 2️⃣ Insertar productos
    for (const producto of productos) {
      const subtotalProducto = producto.cantidad * producto.precio_unitario;

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
          subtotalProducto,
        ],
      );
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
        [mantenimientoId],
      );

      const { precio } = rows[0];

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
        [ventaId, mantenimientoId, precio],
      );

      await client.query(
        `
        UPDATE mantenimientos
        SET estado = 'cobrado'
        WHERE id = $1
        `,
        [mantenimientoId],
      );
    }

    await client.query("COMMIT");

    return {
      venta_id: ventaId,
      subtotal: subtotalReal,
      iva: ivaReal,
      total: totalReal,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error en registrarVenta:", error);
    throw error;
  } finally {
    client.release();
  }
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
  `;

  const { rows } = await pool.query(query, [fecha, sucursal_id]);
  return rows[0];
}

module.exports = {
  registrarVenta,
  obtenerTotalesPorMetodo,
};
