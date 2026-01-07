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

    const ventasInsertadas = [];

    // 1️⃣ Registrar productos (si hay)
    for (const producto of productos) {
      const query = `
        INSERT INTO ventas (
          cliente,
          telefono,
          correo,
          metodo_pago,
          producto_id,
          equipo_id,
          cantidad,
          precio,
          user_venta,
          observaciones,
          fecha_venta
        )
        VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8, $9, NOW())
        RETURNING *;
      `;
      const values = [
        cliente,
        telefono || null,
        correo || null,
        metodo_pago || null,
        producto.id,
        producto.cantidad,
        producto.precio_unitario,
        usuario_id,
        observaciones || ""
      ];
      const { rows } = await client.query(query, values);
      ventasInsertadas.push(rows[0]);
    }

    // 2️⃣ Registrar servicios (mantenimientos)
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

      if (rows.length === 0) {
        throw new Error(`Mantenimiento ${mantenimientoId} no existe`);
      }

      const { precio, estado } = rows[0];
      if (estado !== 'pendiente') {
        throw new Error(`Mantenimiento ${mantenimientoId} ya fue cobrado`);
      }

      await client.query(
        `
        INSERT INTO ventas (
          cliente,
          telefono,
          correo,
          metodo_pago,
          producto_id,
          mantenimiento_id,
          equipo_id,
          cantidad,
          precio,
          user_venta,
          observaciones,
          fecha_venta
        )
        VALUES ($1, $2, $3, $4, NULL, $5, NULL, 1, $6, $7, $8, NOW())
        `,
        [
          cliente,
          telefono || null,
          correo || null,
          metodo_pago || null,
          mantenimientoId,
          precio,
          usuario_id,
          observaciones || ''
        ]
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
      message: "✅ Venta registrada correctamente",
      ventas: ventasInsertadas,
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

// 📋 Obtener todas las ventas
async function obtenerVentas(sucursal_id) {
  const query = `
    SELECT v.*, u.nombre AS vendedor, i.descripcion AS producto_descripcion
    FROM ventas v
    LEFT JOIN usuarios u ON v.user_venta = u.id
    LEFT JOIN inventario i ON v.producto_id = i.id
    WHERE ($1::INTEGER IS NULL OR u.sucursal_id = $1)
    ORDER BY v.fecha_venta DESC;
  `;
  const { rows } = await pool.query(query, [sucursal_id]);
  return rows;
}

module.exports = {
  registrarVenta,
  obtenerVentas,
};
