const pool = require("../config/db");

async function obtenerDatosGarantia(ventaId) {
  const ventaResult = await pool.query(
    `
    SELECT id, cliente, fecha_venta, sucursal_id
    FROM ventas
    WHERE id = $1
    `,
    [ventaId],
  );

  if (!ventaResult.rows.length) return null;

  const venta = ventaResult.rows[0];
  let equiposRaw = [];

  // Equipos ARMADOS
  const equiposArmadosResult = await pool.query(
    `
    SELECT
      d.cantidad,
      d.precio_unitario AS precio,
      e.nombre AS descripcion,
      e.procesador,
      COALESCE(
        (
          SELECT json_agg(
            substring(cmr.descripcion FROM '([0-9]+[ ]*GB)')
          )
          FROM equipos_ram er
          JOIN catalogo_memoria_ram cmr ON er.memoria_ram_id = cmr.id
          WHERE er.equipo_id = e.id
        ),
        '[]'
      ) AS memorias_ram,
      COALESCE(
        (
          SELECT json_agg(ca.descripcion)
          FROM equipos_almacenamiento ea
          JOIN catalogo_almacenamiento ca ON ea.almacenamiento_id = ca.id
          WHERE ea.equipo_id = e.id
        ),
        '[]'
      ) AS almacenamientos
    FROM venta_detalle d
    JOIN inventario i ON d.producto_id = i.id
    JOIN equipos e ON i.equipo_id = e.id
    WHERE d.venta_id = $1
      AND i.equipo_id IS NOT NULL
    `,
    [ventaId],
  );

  if (equiposArmadosResult.rows.length > 0) {
    equiposRaw = [...equiposRaw, ...equiposArmadosResult.rows];
  }

  // Equipos de RECEPCIÓN DIRECTA
  const recepcionDirectaResult = await pool.query(
    `
    SELECT
      d.cantidad,
      d.precio_unitario AS precio,
      i.modelo AS descripcion,
      i.procesador,
      CONCAT(i.ram_gb, 'GB ', i.ram_tipo) AS ram,
      CONCAT(i.almacenamiento_gb, 'GB ', i.almacenamiento_tipo) AS disco
    FROM venta_detalle d
    JOIN inventario_especificaciones i ON d.producto_id = i.inventario_id
    WHERE d.venta_id = $1
    `,
    [ventaId],
  );

  if (recepcionDirectaResult.rows.length > 0) {
    equiposRaw = [...equiposRaw, ...recepcionDirectaResult.rows];
  }

  // PRODUCTOS DE INVENTARIO GENÉRICO
  const productosInventarioResult = await pool.query(
    `
    SELECT
      d.cantidad,
      d.precio_unitario AS precio,
      i.especificacion AS descripcion
    FROM venta_detalle d
    JOIN inventario i ON d.producto_id = i.id
    WHERE d.venta_id = $1
      AND i.equipo_id IS NULL
      AND i.especificacion IS NOT NULL
    `,
    [ventaId],
  );

  if (productosInventarioResult.rows.length > 0) {
    equiposRaw = [
      ...equiposRaw,
      ...productosInventarioResult.rows.map((p) => ({
        cantidad: p.cantidad,
        precio: p.precio,
        descripcion: p.descripcion,
        procesador: "",
        memorias_ram: [],
        almacenamientos: [],
        ram: "",
        disco: "",
      })),
    ];
  }

  return { venta, equiposRaw };
}

module.exports = { obtenerDatosGarantia };
