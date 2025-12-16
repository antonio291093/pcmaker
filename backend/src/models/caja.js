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

// Obtener resumen del día actual
async function obtenerResumen(sucursal_id) {
  const query = `
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'venta' THEN monto ELSE 0 END), 0) AS total_ventas,
      COALESCE(SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END), 0) AS total_gastos,
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS total_ingresos
    FROM caja_movimientos
    WHERE fecha = CURRENT_DATE
    AND ($1::INTEGER IS NULL OR sucursal_id = $1);
  `;
  const { rows } = await pool.query(query, [sucursal_id]);
  return rows[0];
}

// Registrar corte de caja
async function generarCorte({ total_ventas, total_gastos, total_ingresos, balance_final, sucursal_id, usuario_id }) {
  const query = `
    INSERT INTO caja_cortes (fecha, total_ventas, total_gastos, total_ingresos, balance_final, sucursal_id, usuario_id)
    VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [total_ventas, total_gastos, total_ingresos, balance_final, sucursal_id, usuario_id];
  const { rows } = await pool.query(query, values);
  return rows[0];
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

module.exports = {
  registrarMovimiento,
  obtenerResumen,
  generarCorte,
  obtenerCortes,
};
