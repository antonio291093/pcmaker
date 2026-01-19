const pool = require("../config/db");

// Crear comisión
async function crearComision({
  usuario_id,
  venta_id,
  mantenimiento_id,
  monto,
  fecha_creacion,
  equipo_id,
}) {
  const query = `
    INSERT INTO comisiones (usuario_id, venta_id, mantenimiento_id, monto, fecha_creacion, equipo_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [
    usuario_id,
    venta_id,
    mantenimiento_id,
    monto,
    fecha_creacion,
    equipo_id,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Obtener todas las comisiones
async function obtenerComisiones() {
  const query = `SELECT * FROM comisiones ORDER BY id ASC;`;
  const { rows } = await pool.query(query);
  return rows;
}

// Actualizar comisión
async function actualizarComision(
  id,
  { usuario_id, venta_id, mantenimiento_id, monto, fecha_creacion, equipo_id }
) {
  const query = `
    UPDATE comisiones
    SET usuario_id = $1, venta_id = $2, mantenimiento_id = $3, monto = $4, fecha_creacion = $5, equipo_id = $6
    WHERE id = $7
    RETURNING *;
  `;
  const values = [
    usuario_id,
    venta_id,
    mantenimiento_id,
    monto,
    fecha_creacion,
    equipo_id,
    id,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Eliminar comisión
async function eliminarComision(id) {
  const query = `DELETE FROM comisiones WHERE id = $1 RETURNING *;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

async function obtenerComisionPorVenta(venta_id) {
  const query = `SELECT * FROM comisiones WHERE venta_id = $1;`;
  const { rows } = await pool.query(query, [venta_id]);
  return rows[0];
}

// Obtener comisión por equipo
async function obtenerComisionPorEquipo(equipo_id) {
  const query = `SELECT * FROM comisiones WHERE equipo_id = $1;`;
  const { rows } = await pool.query(query, [equipo_id]);
  return rows[0];
}

async function obtenerComisionesSemanaActualPorUsuario(usuario_id) {
  const query = `
    WITH comisiones_semana AS (
  SELECT
    c.id,
    c.usuario_id,
    c.venta_id,
    c.equipo_id,
    c.mantenimiento_id,
    c.monto,
    c.fecha_creacion,
    CASE
      WHEN c.venta_id IS NOT NULL THEN 'venta'
      WHEN c.equipo_id IS NOT NULL THEN 'armado'
      WHEN c.mantenimiento_id IS NOT NULL THEN 'mantenimiento'
    END AS tipo
  FROM comisiones c
  WHERE c.usuario_id = $1
    AND c.fecha_creacion >= date_trunc('week', now())
    AND c.fecha_creacion < date_trunc('week', now()) + interval '1 week'
)

SELECT
  cs.id,
  cs.tipo,
  cs.monto,
  cs.fecha_creacion,

  -- 🔵 VENTA
  CASE WHEN cs.tipo = 'venta' THEN json_build_object(
    'id', v.id,
    'total_venta', COALESCE(SUM(i.precio), 0),
    'items', COALESCE(
      json_agg(
        json_build_object(
          'nombre', eqv.nombre,
          'precio', i.precio
        )
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'::json
    )
  ) END AS venta,

  -- 🟢 ARMADO
  CASE WHEN cs.tipo = 'armado' THEN json_build_object(
    'equipo_id', eq.id,
    'nombre', eq.nombre,
    'precio', inv_armado.precio
  ) END AS equipo,

  -- 🟣 MANTENIMIENTO (CORRECTO)
  CASE WHEN cs.tipo = 'mantenimiento' THEN json_build_object(
    'id', m.id,
    'descripcion', cm.descripcion
  ) END AS mantenimiento

FROM comisiones_semana cs

-- 🔹 VENTAS
LEFT JOIN ventas v ON v.id = cs.venta_id
LEFT JOIN venta_detalle vd ON vd.venta_id = v.id
LEFT JOIN inventario i ON i.id = vd.producto_id
LEFT JOIN equipos eqv ON eqv.id = i.equipo_id

-- 🔹 ARMADO
LEFT JOIN equipos eq ON eq.id = cs.equipo_id
LEFT JOIN inventario inv_armado ON inv_armado.equipo_id = eq.id

-- 🔹 MANTENIMIENTO (CLAVE)
LEFT JOIN mantenimientos m ON m.id = cs.mantenimiento_id
LEFT JOIN catalogo_mantenimiento cm ON cm.id = m.catalogo_id

GROUP BY
  cs.id,
  cs.tipo,
  cs.monto,
  cs.fecha_creacion,
  v.id,
  eq.id,
  inv_armado.precio,
  m.id,
  cm.descripcion

ORDER BY cs.fecha_creacion ASC;

  `;
  const { rows } = await pool.query(query, [usuario_id]);
  return rows;
}

module.exports = {
  crearComision,
  obtenerComisiones,
  actualizarComision,
  eliminarComision,
  obtenerComisionPorEquipo,
  obtenerComisionesSemanaActualPorUsuario,
  obtenerComisionPorVenta,
};
