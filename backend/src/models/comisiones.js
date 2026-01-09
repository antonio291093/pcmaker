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
    SELECT *, NULL AS total_semana
    FROM comisiones
    WHERE usuario_id = $1
    AND fecha_creacion >= date_trunc('week', now())
    AND fecha_creacion < date_trunc('week', now()) + interval '1 week'
    UNION ALL
    SELECT 
    NULL AS id,
    NULL AS usuario_id,
    NULL AS venta_id,
    NULL AS mantenimiento_id,
    SUM(monto) AS monto, -- suma todos los montos de la semana
    NULL AS fecha_creacion,  
    NULL AS equipo_id,  
    SUM(monto) AS total_semana
    FROM comisiones
    WHERE usuario_id = $1
    AND fecha_creacion >= date_trunc('week', now())
    AND fecha_creacion < date_trunc('week', now()) + interval '1 week'
    ORDER BY fecha_creacion ASC;
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
