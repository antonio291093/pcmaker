const pool = require('../config/db')

// ==========================
// MOVIMIENTOS
// ==========================
async function registrarMovimiento({
  tipo,
  monto,
  descripcion,
  sucursal_id,
  usuario_id  
}) {
  const query = `
    INSERT INTO caja_movimientos (
      tipo,
      monto,
      descripcion,
      sucursal_id,
      usuario_id      
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `
  const values = [
    tipo,
    monto,
    descripcion,
    sucursal_id,
    usuario_id    
  ]

  const { rows } = await pool.query(query, values)
  return rows[0]
}

// ==========================
// RESUMEN POR FECHA (CORTES)
// ==========================
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

// ==========================
// DÍAS OPERATIVOS
// ==========================
async function abrirDiaOperativo(usuario_id, sucursal_id) {
  await pool.query(
    `
    INSERT INTO caja_dias (usuario_id, sucursal_id, fecha)
    VALUES ($1, $2, CURRENT_DATE)
    ON CONFLICT (sucursal_id, fecha) DO NOTHING
    `,
    [usuario_id, sucursal_id]
  )
}

async function obtenerDiaAbierto(sucursal_id, fecha) {
  const { rowCount } = await pool.query(
    `
    SELECT 1
    FROM caja_dias
    WHERE sucursal_id = $1
      AND fecha = $2
      AND estado = 'abierto'
    `,
    [sucursal_id, fecha]
  )

  return rowCount > 0
}

async function cerrarDiaOperativo(sucursal_id, fecha) {
  await pool.query(
    `
    UPDATE caja_dias
    SET estado = 'cerrado'
    WHERE sucursal_id = $1
      AND fecha = $2
    `,
    [sucursal_id, fecha]
  )
}

// ==========================
// CORTES DE CAJA
// ==========================
async function crearCorteCaja({
  fecha,
  sucursal_id,
  usuario_id,
  total_ventas,
  total_ingresos,
  total_gastos,
  balance_final,
  total_efectivo,
  total_transferencia,
  total_terminal,
  total_facturacion
}) {
  const query = `
    INSERT INTO caja_cortes (
      fecha,
      sucursal_id,
      usuario_id,
      total_ventas,
      total_ingresos,
      total_gastos,
      balance_final,
      total_efectivo,
      total_transferencia,
      total_terminal,
      total_facturacion,
      es_extra,
      hora_corte
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,NOW()
    )
    RETURNING *;
  `

  const values = [
    fecha,
    sucursal_id,
    usuario_id,
    total_ventas,
    total_ingresos,
    total_gastos,
    balance_final,
    total_efectivo,
    total_transferencia,
    total_terminal,
    total_facturacion
  ]

  const { rows } = await pool.query(query, values)
  return rows[0]
}

// ==========================
// HISTORIAL
// ==========================
async function obtenerCortes(sucursal_id) {
  const query = `
    SELECT *
    FROM caja_cortes
    WHERE ($1::INTEGER IS NULL OR sucursal_id = $1)
    ORDER BY fecha DESC;
  `
  const { rows } = await pool.query(query, [sucursal_id])
  return rows
}

async function obtenerCortePendiente(sucursal_id) {
  const result = await pool.query(
    `
    SELECT d.fecha
    FROM caja_dias d
    WHERE d.sucursal_id = $1
      AND d.estado = 'abierto'
      AND d.fecha < CURRENT_DATE
      AND EXISTS (
        SELECT 1
        FROM caja_movimientos m
        WHERE DATE(m.fecha) = d.fecha
          AND m.sucursal_id = d.sucursal_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM caja_cortes c
        WHERE c.fecha = d.fecha
          AND c.sucursal_id = d.sucursal_id
      )
    ORDER BY d.fecha ASC
    LIMIT 1
    `,
    [sucursal_id]
  )

  if (result.rowCount === 0) {
    return { requiere_corte: false }
  }

  return {
    requiere_corte: true,
    fecha_pendiente: result.rows[0].fecha
  }
}


module.exports = {
  registrarMovimiento,
  obtenerResumenPorFecha,
  abrirDiaOperativo,
  obtenerDiaAbierto,
  cerrarDiaOperativo,
  crearCorteCaja,
  obtenerCortes,
  obtenerCortePendiente
}
