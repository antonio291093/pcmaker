const pool = require('../config/db')

const corteCajaMiddleware = async (req, res, next) => {
  try {
    const usuario_id = req.userId
    if (!usuario_id) return next()

    // Obtener rol
    const userResult = await pool.query(
      `SELECT rol_id FROM usuarios WHERE id = $1`,
      [usuario_id]
    )

    if (userResult.rowCount === 0) return next()
    const { rol_id } = userResult.rows[0]

    if (rol_id !== 3) return next() // solo ventas

    // 🔹 ¿Existe al menos un corte en el sistema?
    const existeCorte = await pool.query(
      `SELECT 1 FROM caja_cortes LIMIT 1`
    )

    // 👉 Sistema recién iniciado → no bloquear
    if (existeCorte.rowCount === 0) {
      return next()
    }

    // 🔹 Último día con movimiento (EXCLUYE hoy)
    const movResult = await pool.query(
      `
      SELECT DATE(fecha) AS fecha
      FROM caja_movimientos
      WHERE usuario_id = $1
        AND DATE(fecha) < CURRENT_DATE
      ORDER BY fecha DESC
      LIMIT 1
      `,
      [usuario_id]
    )

    // Nunca ha operado antes de hoy → no bloquear
    if (movResult.rowCount === 0) {
      return next()
    }

    const fechaOperacion = movResult.rows[0].fecha


    // 🔹 Verificar corte de ese día
    const corteResult = await pool.query(
      `
      SELECT 1
      FROM caja_cortes
      WHERE usuario_id = $1
        AND fecha = $2
        AND es_extra = false
      LIMIT 1
      `,
      [usuario_id, fechaOperacion]
    )

    if (corteResult.rowCount === 0) {
      return res.status(423).json({
        message:
          'Tienes un corte de caja pendiente del último día con operación. Debes realizarlo para continuar.',
        requiere_corte: true,
        fecha_pendiente: fechaOperacion
      })
    }

    next()
  } catch (error) {
    console.error('Error en corteCajaMiddleware:', error)
    res.status(500).json({ message: 'Error validando corte de caja' })
  }
}

module.exports = corteCajaMiddleware
