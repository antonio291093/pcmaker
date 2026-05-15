const pool = require('../config/db')

async function obtenerConfiguracionesApartado() {
  const { rows } = await pool.query(
    `SELECT nombre, valor FROM configuraciones WHERE nombre LIKE 'apartados_%'`
  )
  const raw = {}
  for (const row of rows) raw[row.nombre] = row.valor
  return {
    enganche_tipo:  raw.apartados_enganche_tipo  || 'porcentaje',
    enganche_valor: Number(raw.apartados_enganche_valor  || 30),
    dias_limite:    Number(raw.apartados_dias_limite     || 30),
    dias_sin_abono: Number(raw.apartados_dias_sin_abono  || 30),
  }
}

async function calcularStockDisponible(producto_id) {
  const { rows } = await pool.query(
    `SELECT
       i.cantidad,
       COALESCE((
         SELECT SUM(a.cantidad)
         FROM apartados a
         WHERE a.producto_id = $1 AND a.estado = 'activo'
       ), 0)::INT AS cantidad_apartada
     FROM inventario i
     WHERE i.id = $1 AND i.eliminado = FALSE`,
    [producto_id]
  )
  if (!rows.length) return null
  const total    = Number(rows[0].cantidad)
  const apartada = Number(rows[0].cantidad_apartada)
  return { cantidad_total: total, cantidad_apartada: apartada, cantidad_disponible: total - apartada }
}

async function crearApartado({
  cliente_id, sucursal_id, usuario_id, producto_id,
  cantidad, precio_unitario, precio_total, enganche_minimo, fecha_limite
}) {
  const { rows } = await pool.query(
    `INSERT INTO apartados (
       cliente_id, sucursal_id, usuario_id, producto_id,
       cantidad, precio_unitario, precio_total, enganche_minimo, fecha_limite
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [cliente_id, sucursal_id, usuario_id, producto_id,
     cantidad, precio_unitario, precio_total, enganche_minimo, fecha_limite]
  )
  return rows[0]
}

async function registrarAbono(apartado_id, { usuario_id, monto, metodo_pago, observaciones }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: ap } = await client.query(
      `SELECT estado, monto_abonado, precio_total FROM apartados WHERE id = $1 FOR UPDATE`,
      [apartado_id]
    )
    if (!ap.length)                throw new Error('Apartado no encontrado')
    if (ap[0].estado !== 'activo') throw new Error('El apartado no está activo')

    const montoNuevo = Number(ap[0].monto_abonado) + Number(monto)
    if (montoNuevo > Number(ap[0].precio_total)) {
      throw new Error('El abono supera el total del apartado')
    }

    const { rows: abono } = await client.query(
      `INSERT INTO apartado_abonos (apartado_id, usuario_id, monto, metodo_pago, observaciones)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [apartado_id, usuario_id, monto, metodo_pago, observaciones || null]
    )

    await client.query(
      `UPDATE apartados SET monto_abonado = $1, fecha_actualizacion = NOW() WHERE id = $2`,
      [montoNuevo, apartado_id]
    )

    await client.query('COMMIT')
    return abono[0]
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

async function cancelarApartado(apartado_id, motivo_cancelacion) {
  const { rows } = await pool.query(
    `UPDATE apartados
     SET estado = 'cancelado', motivo_cancelacion = $1, fecha_actualizacion = NOW()
     WHERE id = $2 AND estado = 'activo'
     RETURNING *`,
    [motivo_cancelacion || null, apartado_id]
  )
  return rows[0] || null
}

async function liquidarApartado(apartado_id, { venta_id }, client = pool) {
  const { rows } = await client.query(
    `UPDATE apartados
     SET estado = 'liquidado', venta_id = $1, fecha_actualizacion = NOW()
     WHERE id = $2 AND estado = 'activo'
     RETURNING *`,
    [venta_id, apartado_id]
  )
  return rows[0] || null
}

async function obtenerApartados({ sucursal_id, estado, cliente_id } = {}) {
  const params = []
  const wheres = []

  if (sucursal_id) { params.push(sucursal_id); wheres.push(`a.sucursal_id = $${params.length}`) }
  if (estado)      { params.push(estado);      wheres.push(`a.estado = $${params.length}`) }
  if (cliente_id)  { params.push(cliente_id);  wheres.push(`a.cliente_id = $${params.length}`) }

  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : ''

  const { rows } = await pool.query(
    `SELECT
       a.id,
       a.estado,
       a.cantidad,
       a.precio_unitario,
       a.precio_total,
       a.enganche_minimo,
       a.monto_abonado,
       a.fecha_limite,
       a.fecha_creacion,
       a.motivo_cancelacion,
       c.id       AS cliente_id,
       c.nombre   AS cliente_nombre,
       c.telefono AS cliente_telefono,
       i.tipo               AS producto_tipo,
       i.especificacion     AS producto_especificacion,
       i.sku                AS producto_sku,
       s.nombre   AS sucursal,
       u.nombre   AS usuario
     FROM apartados a
     JOIN clientes   c ON c.id = a.cliente_id
     JOIN inventario i ON i.id = a.producto_id
     JOIN sucursales s ON s.id = a.sucursal_id
     JOIN usuarios   u ON u.id = a.usuario_id
     ${where}
     ORDER BY
       CASE a.estado WHEN 'activo' THEN 0 ELSE 1 END,
       a.fecha_creacion DESC`,
    params
  )
  return rows
}

async function obtenerApartadoPorId(id) {
  const { rows: ap } = await pool.query(
    `SELECT
       a.*,
       c.nombre   AS cliente_nombre,
       c.telefono AS cliente_telefono,
       c.correo   AS cliente_correo,
       i.tipo           AS producto_tipo,
       i.especificacion AS producto_especificacion,
       i.sku            AS producto_sku,
       i.precio         AS producto_precio_actual,
       s.nombre   AS sucursal,
       u.nombre   AS usuario
     FROM apartados a
     JOIN clientes   c ON c.id = a.cliente_id
     JOIN inventario i ON i.id = a.producto_id
     JOIN sucursales s ON s.id = a.sucursal_id
     JOIN usuarios   u ON u.id = a.usuario_id
     WHERE a.id = $1`,
    [id]
  )
  if (!ap.length) return null

  const { rows: abonos } = await pool.query(
    `SELECT
       ab.id,
       ab.monto,
       ab.metodo_pago,
       ab.observaciones,
       ab.fecha_creacion,
       u.nombre AS usuario
     FROM apartado_abonos ab
     JOIN usuarios u ON u.id = ab.usuario_id
     WHERE ab.apartado_id = $1
     ORDER BY ab.fecha_creacion ASC`,
    [id]
  )

  return { ...ap[0], abonos }
}

module.exports = {
  crearApartado,
  registrarAbono,
  cancelarApartado,
  liquidarApartado,
  obtenerApartados,
  obtenerApartadoPorId,
  obtenerConfiguracionesApartado,
  calcularStockDisponible,
}
