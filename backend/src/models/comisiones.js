const pool = require("../config/db");
const { CASE_DESCRIPCION_VENTA } = require("../utils/sqlFragments");

// Crear comisión
async function crearComision({
  usuario_id,
  venta_id,
  mantenimiento_id,
  monto,
  fecha_creacion,
  equipo_id,
}, client = pool) {
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
  const { rows } = await client.query(query, values);
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

async function obtenerComisionesSemanaActualPorUsuario({ usuario_id, fecha_inicio, fecha_fin }) {
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
      WHEN c.venta_id         IS NOT NULL THEN 'venta'
      WHEN c.equipo_id        IS NOT NULL THEN 'armado'
      WHEN c.mantenimiento_id IS NOT NULL THEN 'mantenimiento'
    END AS tipo
  FROM comisiones c
  WHERE c.usuario_id = $1
    AND c.fecha_creacion >= COALESCE($2::date, date_trunc('week', now()))
    AND c.fecha_creacion <  COALESCE($3::date, date_trunc('week', now()) + interval '1 week')
)

SELECT
  cs.id,
  cs.tipo,
  cs.monto,
  cs.fecha_creacion,

  -- 🔵 VENTA
  CASE WHEN cs.tipo = 'venta' THEN json_build_object(
    'id', v.id,
    'total_venta', COALESCE(v.total, 0),
    'items', COALESCE(
      json_agg(
        json_build_object(
          'nombre',   ${CASE_DESCRIPCION_VENTA},
          'precio',   i.precio,
          'cantidad', vd.cantidad
        )
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'::json
    )
  ) END AS venta,

  -- 🟢 ARMADO
  CASE WHEN cs.tipo = 'armado' THEN json_build_object(
    'equipo_id',  eq.id,
    'nombre',     eq.nombre,
    'precio',     inv_armado.precio,
    'procesador', eq.procesador,
    'ram', (
      SELECT string_agg(
        substring(cmr.descripcion FROM '([0-9]+[ ]*GB)'),
        ' + '
      )
      FROM equipos_ram er
      JOIN catalogo_memoria_ram cmr ON cmr.id = er.memoria_ram_id
      WHERE er.equipo_id = eq.id
    )
  ) END AS equipo,

  -- 🟣 MANTENIMIENTO
  CASE WHEN cs.tipo = 'mantenimiento' THEN json_build_object(
    'id',                  m.id,
    'tipo_mantenimiento',  cm.descripcion,
    'detalle',             m.detalle,
    'fecha_mantenimiento', m.fecha_mantenimiento
  ) END AS mantenimiento

FROM comisiones_semana cs

-- 🔹 VENTAS — alias e + ie para que CASE_DESCRIPCION_VENTA funcione
LEFT JOIN ventas        v   ON v.id  = cs.venta_id
LEFT JOIN venta_detalle vd  ON vd.venta_id = v.id
LEFT JOIN inventario    i   ON i.id  = vd.producto_id
LEFT JOIN equipos       e   ON e.id  = i.equipo_id
LEFT JOIN inventario_especificaciones ie ON ie.inventario_id = i.id

-- 🔹 ARMADO
LEFT JOIN equipos    eq         ON eq.id           = cs.equipo_id
LEFT JOIN inventario inv_armado ON inv_armado.equipo_id = eq.id

-- 🔹 MANTENIMIENTO
LEFT JOIN mantenimientos         m  ON m.id  = cs.mantenimiento_id
LEFT JOIN catalogo_mantenimiento cm ON cm.id = m.catalogo_id

GROUP BY
  cs.id,
  cs.tipo,
  cs.monto,
  cs.fecha_creacion,
  v.id,
  eq.id,
  eq.procesador,
  inv_armado.precio,
  m.id,
  m.detalle,
  m.fecha_mantenimiento,
  cm.descripcion

ORDER BY cs.fecha_creacion ASC;

  `;
  const { rows } = await pool.query(query, [usuario_id, fecha_inicio ?? null, fecha_fin ?? null]);
  return rows;
}

async function obtenerResumenComisiones({ fecha_inicio, fecha_fin, sucursal_id }) {
  const { rows } = await pool.query(
    `SELECT
       u.id                                                                     AS usuario_id,
       u.nombre,
       r.nombre                                                                 AS rol,
       COUNT(c.id)::int                                                         AS cantidad,
       COALESCE(SUM(c.monto), 0)                                               AS total_comisiones,
       COALESCE(SUM(c.monto) FILTER (WHERE c.venta_id         IS NOT NULL), 0) AS por_venta,
       COALESCE(SUM(c.monto) FILTER (WHERE c.equipo_id        IS NOT NULL), 0) AS por_armado,
       COALESCE(SUM(c.monto) FILTER (WHERE c.mantenimiento_id IS NOT NULL), 0) AS por_mantenimiento
     FROM comisiones c
     JOIN usuarios u ON u.id = c.usuario_id
     JOIN roles r    ON r.id = u.rol_id
     WHERE c.fecha_creacion BETWEEN $1 AND $2
       AND ($3::int IS NULL OR u.sucursal_id = $3)
     GROUP BY u.id, u.nombre, r.nombre
     ORDER BY total_comisiones DESC;`,
    [fecha_inicio, fecha_fin, sucursal_id ?? null]
  );
  return rows;
}

async function obtenerDetalleComisiones({ fecha_inicio, fecha_fin, sucursal_id }) {
  const { rows } = await pool.query(
    `WITH comisiones_rango AS (
       SELECT
         c.id,
         c.venta_id,
         c.equipo_id,
         c.mantenimiento_id,
         c.monto,
         c.fecha_creacion,
         u.nombre AS vendedor,
         CASE
           WHEN c.venta_id         IS NOT NULL THEN 'venta'
           WHEN c.equipo_id        IS NOT NULL THEN 'armado'
           WHEN c.mantenimiento_id IS NOT NULL THEN 'mantenimiento'
         END AS tipo
       FROM comisiones c
       JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.fecha_creacion BETWEEN $1 AND $2
         AND ($3::int IS NULL OR u.sucursal_id = $3)
     )
     SELECT
       cr.id,
       cr.tipo,
       cr.monto,
       cr.fecha_creacion,
       cr.vendedor,
       CASE WHEN cr.tipo = 'venta' THEN json_build_object(
         'id',          v.id,
         'cliente',     v.cliente,
         'total_venta', v.total
       ) END AS venta,
       CASE WHEN cr.tipo = 'armado' THEN json_build_object(
         'nombre', eq.nombre,
         'precio', inv_arm.precio
       ) END AS equipo,
       CASE WHEN cr.tipo = 'mantenimiento' THEN json_build_object(
         'id',          m.id,
         'descripcion', COALESCE(cm.descripcion, m.detalle)
       ) END AS mantenimiento
     FROM comisiones_rango cr
     LEFT JOIN ventas v                  ON v.id  = cr.venta_id
     LEFT JOIN equipos eq                ON eq.id = cr.equipo_id
     LEFT JOIN inventario inv_arm        ON inv_arm.equipo_id = eq.id
     LEFT JOIN mantenimientos m          ON m.id  = cr.mantenimiento_id
     LEFT JOIN catalogo_mantenimiento cm ON cm.id = m.catalogo_id
     GROUP BY
       cr.id, cr.tipo, cr.monto, cr.fecha_creacion, cr.vendedor,
       v.id, v.cliente, v.total,
       eq.nombre, inv_arm.precio,
       m.id, m.detalle, cm.descripcion
     ORDER BY cr.fecha_creacion DESC;`,
    [fecha_inicio, fecha_fin, sucursal_id ?? null]
  );
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
  obtenerResumenComisiones,
  obtenerDetalleComisiones,
};
