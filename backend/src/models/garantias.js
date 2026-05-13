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
  const equiposResult = await pool.query(
    `
    SELECT
      d.cantidad,
      d.precio_unitario AS precio,
      CASE
        WHEN i.equipo_id IS NOT NULL THEN e.nombre
        WHEN ie.inventario_id IS NOT NULL THEN ie.modelo
        ELSE i.especificacion
      END AS descripcion,
      CASE
        WHEN i.equipo_id IS NOT NULL THEN e.procesador
        WHEN ie.inventario_id IS NOT NULL THEN ie.procesador
        ELSE ''
      END AS procesador,
      CASE
        WHEN i.equipo_id IS NOT NULL THEN COALESCE(
          (
            SELECT string_agg(substring(cmr.descripcion FROM '([0-9]+[ ]*GB)'), ', ')
            FROM equipos_ram er
            JOIN catalogo_memoria_ram cmr ON er.memoria_ram_id = cmr.id
            WHERE er.equipo_id = e.id
          ),
          ''
        )
        WHEN ie.inventario_id IS NOT NULL THEN CONCAT(ie.ram_gb, 'GB ', ie.ram_tipo)
        ELSE ''
      END AS ram,
      CASE
        WHEN i.equipo_id IS NOT NULL THEN COALESCE(
          (
            SELECT string_agg(ca.descripcion, ', ')
            FROM equipos_almacenamiento ea
            JOIN catalogo_almacenamiento ca ON ea.almacenamiento_id = ca.id
            WHERE ea.equipo_id = e.id
          ),
          ''
        )
        WHEN ie.inventario_id IS NOT NULL THEN CONCAT(ie.almacenamiento_gb, 'GB ', ie.almacenamiento_tipo)
        ELSE ''
      END AS disco
    FROM venta_detalle d
    JOIN inventario i ON d.producto_id = i.id
    LEFT JOIN equipos e ON i.equipo_id = e.id
    LEFT JOIN inventario_especificaciones ie ON ie.inventario_id = d.producto_id
    WHERE d.venta_id = $1
      AND (
        i.equipo_id IS NOT NULL
        OR ie.inventario_id IS NOT NULL
        OR (i.equipo_id IS NULL AND i.especificacion IS NOT NULL)
      )
    `,
    [ventaId],
  );

  const equiposRaw = equiposResult.rows;

  return { venta, equiposRaw };
}

module.exports = { obtenerDatosGarantia };
