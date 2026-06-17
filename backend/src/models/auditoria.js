const pool = require('../config/db')

async function obtenerAuditoriaInventario({
  inventario_id = null,
  usuario_id    = null,
  accion        = null,
  campo         = null,
  fecha_inicio  = null,
  fecha_fin     = null,
  limit         = 50,
  offset        = 0,
} = {}) {
  const params = [
    inventario_id ? parseInt(inventario_id) : null,
    usuario_id    ? parseInt(usuario_id)    : null,
    accion  || null,
    campo   || null,
    fecha_inicio || null,
    fecha_fin    || null,
    Math.min(parseInt(limit)  || 50, 200),
    parseInt(offset) || 0,
  ]

  const filtros = `
    WHERE ($1::int         IS NULL OR ia.inventario_id = $1)
      AND ($2::int         IS NULL OR ia.usuario_id    = $2)
      AND ($3::text        IS NULL OR ia.accion        = $3)
      AND ($4::text        IS NULL OR ia.campo         = $4)
      AND ($5::timestamptz IS NULL OR ia.fecha        >= $5)
      AND ($6::timestamptz IS NULL OR ia.fecha        <= $6)
  `

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(`
      SELECT
        ia.id,
        ia.inventario_id,
        ia.accion,
        ia.campo,
        ia.valor_anterior,
        ia.valor_nuevo,
        ia.contexto,
        ia.referencia_id,
        ia.fecha,
        u.nombre         AS usuario_nombre,
        i.tipo           AS inventario_tipo,
        i.especificacion AS inventario_especificacion,
        i.sku            AS inventario_sku
      FROM inventario_auditoria ia
      LEFT JOIN usuarios   u ON u.id = ia.usuario_id
      LEFT JOIN inventario i ON i.id = ia.inventario_id
      ${filtros}
      ORDER BY ia.fecha DESC
      LIMIT $7 OFFSET $8
    `, params),
    pool.query(`
      SELECT COUNT(*) AS total
      FROM inventario_auditoria ia
      ${filtros}
    `, params.slice(0, 6)),
  ])

  return {
    registros: rows,
    total: parseInt(countRows[0].total),
  }
}

module.exports = { obtenerAuditoriaInventario }
