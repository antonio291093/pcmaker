const pool = require("../config/db");

// Registrar un movimiento (venta, gasto o ingreso)
async function registrarMovimiento({ tipo, monto, descripcion, sucursal_id, usuario_id }) {
  const query = `
    INSERT INTO caja_movimientos (tipo, monto, descripcion, sucursal_id, usuario_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [tipo, monto, descripcion, sucursal_id, usuario_id];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function obtenerResumenPorFecha(fecha, sucursal_id) {
  const query = `
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'venta' THEN monto ELSE 0 END), 0) AS total_ventas,
      COALESCE(SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END), 0) AS total_gastos,
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS total_ingresos
    FROM caja_movimientos
    WHERE DATE(fecha) = $1
      AND ($2::INTEGER IS NULL OR sucursal_id = $2)
  `
  const { rows } = await pool.query(query, [fecha, sucursal_id])
  return rows[0]
}

// Registrar corte de caja
async function crearCorteCaja({
  fecha,
  total_ventas,
  total_gastos,
  total_ingresos,
  balance_final,
  sucursal_id,
  usuario_id
}) {
  const query = `
    INSERT INTO caja_cortes (
      fecha,
      total_ventas,
      total_gastos,
      total_ingresos,
      balance_final,
      sucursal_id,
      usuario_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `

  const values = [
    fecha,
    total_ventas,
    total_gastos,
    total_ingresos,
    balance_final,
    sucursal_id,
    usuario_id
  ]

  const { rows } = await pool.query(query, values)
  return rows[0]
}


// Obtener historial de cortes
async function obtenerCortes(sucursal_id) {
  const query = `
    SELECT * FROM caja_cortes
    WHERE ($1::INTEGER IS NULL OR sucursal_id = $1)
    ORDER BY fecha DESC;
  `;
  const { rows } = await pool.query(query, [sucursal_id]);
  return rows;
}

async function existeCortePorFecha(usuario_id, fecha) {
  const { rowCount } = await pool.query(
    `
    SELECT 1
    FROM caja_cortes
    WHERE usuario_id = $1
      AND fecha = $2
      AND es_extra = false
    LIMIT 1
    `,
    [usuario_id, fecha]
  )

  return rowCount > 0
}

async function obtenerCortePendiente(usuario_id, sucursal_id) {
  // 🔹 Último corte registrado
  const corteResult = await pool.query(
    `
    SELECT MAX(fecha) AS fecha
    FROM caja_cortes
    WHERE usuario_id = $1
      AND sucursal_id = $2
      AND es_extra = false
    `,
    [usuario_id, sucursal_id]
  )

  const fechaUltimoCorte = corteResult.rows[0].fecha

  // Nunca ha hecho cortes → no bloquear
  if (!fechaUltimoCorte) {
    return { requiere_corte: false }
  }

  // 🔹 PRIMER movimiento DESPUÉS del último corte
  // 🔥 SOLO días anteriores a hoy
  const movResult = await pool.query(
    `
    SELECT MIN(DATE(fecha)) AS fecha
    FROM caja_movimientos
    WHERE usuario_id = $1
      AND sucursal_id = $2
      AND DATE(fecha) > $3
      AND DATE(fecha) < CURRENT_DATE
    `,
    [usuario_id, sucursal_id, fechaUltimoCorte]
  )

  const fechaPendiente = movResult.rows[0].fecha

  // No hay movimientos pendientes → todo cerrado
  if (!fechaPendiente) {
    return { requiere_corte: false }
  }

  return {
    requiere_corte: true,
    fecha_pendiente: fechaPendiente
  }
}

module.exports = {
  registrarMovimiento,
  obtenerResumenPorFecha,
  crearCorteCaja,
  obtenerCortes,
  existeCortePorFecha,
  obtenerCortePendiente,
};
