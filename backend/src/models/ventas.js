const pool = require("../config/db");

async function registrarVenta({
  cliente,
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
          producto_id,
          equipo_id,
          cantidad,
          precio,
          user_venta,
          observaciones,
          fecha_venta
        )
        VALUES ($1, $2, NULL, $3, $4, $5, $6, NOW())
        RETURNING *;
      `;

      const values = [
        cliente,
        producto.id,
        producto.cantidad,
        producto.precio_unitario,
        usuario_id,
        observaciones || ""
      ];

      const { rows } = await client.query(query, values);
      ventasInsertadas.push(rows[0]);
    }

    // Registrar servicios (mantenimientos)
    for (const mantenimientoId of servicios) {

      // 1️⃣ Obtener precio real del mantenimiento
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

      // 2️⃣ Insertar venta (servicio)
      await client.query(
        `
        INSERT INTO ventas (
          cliente,
          producto_id,
          mantenimiento_id,
          equipo_id,
          cantidad,
          precio,
          user_venta,
          observaciones,
          fecha_venta
        )
        VALUES ($1, NULL, $2, NULL, 1, $3, $4, $5, NOW())
        `,
        [
          cliente,
          mantenimientoId,
          precio,
          usuario_id,
          observaciones || ''
        ]
      );

      // 3️⃣ Marcar mantenimiento como cobrado
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
