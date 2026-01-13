const pool = require('../config/db')

const corteCajaMiddleware = async (req, res, next) => {
  try {
    const usuario_id = req.userId
    if (!usuario_id) return next()

    // 🔹 Obtener rol
    const userResult = await pool.query(
      `SELECT rol_id FROM usuarios WHERE id = $1`,
      [usuario_id]
    )

    if (userResult.rowCount === 0) return next()
    const { rol_id } = userResult.rows[0]

    // 🔹 Solo ventas
    if (rol_id !== 3) return next()

    // 🔹 Obtener sucursal
    const sucursal_id =
      req.body?.sucursal_id || req.query?.sucursal_id

    if (!sucursal_id) return next()

    // 🔐 Validación REAL de bloqueo
    const bloqueoResult = await pool.query(
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

    if (bloqueoResult.rowCount > 0) {
      return res.status(423).json({
        message:
          'Tienes un corte de caja pendiente. Debes cerrarlo para continuar.',
        requiere_corte: true,
        fecha_pendiente: bloqueoResult.rows[0].fecha
      })
    }

    // ✅ Todo correcto
    next()
  } catch (error) {
    console.error('Error en corteCajaMiddleware:', error)
    res.status(500).json({
      message: 'Error validando corte de caja'
    })
  }
}

module.exports = corteCajaMiddleware
