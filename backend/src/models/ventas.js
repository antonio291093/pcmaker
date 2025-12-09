const pool = require("../config/db");

// 🧾 Registrar una o varias ventas (una por producto)
async function registrarVenta({ cliente, productos, observaciones, usuario_id, sucursal_id, total }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ventasInsertadas = [];

    for (const producto of productos) {
      const insertQuery = `
        INSERT INTO ventas (cliente, producto_id, equipo_id, cantidad, precio, user_venta, observaciones, fecha_venta)
        VALUES ($1, $2, NULL, $3, $4, $5, $6, NOW())
        RETURNING *;
      `;

      const values = [
        cliente,
        producto.id, // id del producto vendido (del inventario)
        producto.cantidadSeleccionada || producto.cantidad,
        producto.precio_unitario || producto.precio,
        usuario_id,
        observaciones || "",
      ];

      const { rows } = await client.query(insertQuery, values);
      ventasInsertadas.push(rows[0]);
    }

    await client.query("COMMIT");

    return {
      message: "✅ Ventas registradas correctamente",
      ventas: ventasInsertadas,
      total,
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
