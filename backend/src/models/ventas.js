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
          m.estado,
          m.equipo_id
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

      const { precio, estado, equipo_id } = rows[0];

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
        VALUES ($1,'servicio',$2,$3,1,$4,$4)
        `,
        [ventaId, mantenimientoId, equipo_id, precio]
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

module.exports = {
  registrarVenta
};
