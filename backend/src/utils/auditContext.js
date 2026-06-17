const pool = require('../config/db')

/**
 * Inyecta las variables de sesión que lee el trigger fn_auditoria_inventario.
 * Usar SOLO cuando ya hay una transacción abierta (BEGIN ejecutado).
 *
 * SET LOCAL hace que las variables vivan únicamente durante la transacción
 * actual y desaparezcan al hacer COMMIT / ROLLBACK, lo que evita filtraciones
 * entre conexiones del pool.
 *
 * @param {object} client  - Conexión pg con transacción activa
 * @param {object} opts
 * @param {number|null} opts.userId       - req.userId del usuario autenticado
 * @param {string|null} opts.contexto     - 'venta', 'apartado', 'traspaso', 'manual', …
 * @param {number|null} opts.referenciaId - id de la venta / apartado relacionado
 */
async function setAuditContext(client, { userId = null, contexto = null, referenciaId = null } = {}) {
  const uid = Number.isFinite(parseInt(userId))       ? parseInt(userId)       : ''
  const ctx = String(contexto      ?? '').replace(/'/g, "''")
  const ref = Number.isFinite(parseInt(referenciaId)) ? parseInt(referenciaId) : ''

  await client.query(`SET LOCAL app.current_user_id = '${uid}'`)
  await client.query(`SET LOCAL app.contexto         = '${ctx}'`)
  await client.query(`SET LOCAL app.referencia_id    = '${ref}'`)
}

/**
 * Ejecuta `fn(client)` dentro de una transacción nueva con contexto de
 * auditoría inyectado. Usar cuando la operación NO forma parte de una
 * transacción existente (p.ej. actualizarVisibleCatalogo, traspasarInventario).
 *
 * @param {object} opts
 * @param {number|null} opts.userId
 * @param {string|null} opts.contexto
 * @param {number|null} opts.referenciaId
 * @param {Function}    fn  - async (client) => valor_de_retorno
 * @returns {Promise<*>} lo que devuelva fn
 *
 * @example
 * const fila = await withAuditContext({ userId: req.userId }, async (client) => {
 *   const { rows } = await client.query(
 *     'UPDATE inventario SET visible_catalogo=$1 WHERE id=$2 RETURNING *',
 *     [visible_catalogo, id]
 *   )
 *   return rows[0]
 * })
 */
async function withAuditContext({ userId = null, contexto = null, referenciaId = null } = {}, fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setAuditContext(client, { userId, contexto, referenciaId })
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { setAuditContext, withAuditContext }
