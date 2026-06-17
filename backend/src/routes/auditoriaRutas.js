const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middlewares/authMiddleware')
const controlador = require('../controllers/controladorAuditoria')

async function requireAdmin(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT rol_id FROM usuarios WHERE id = $1',
      [req.userId],
    )
    if (!rows[0] || rows[0].rol_id !== 1) {
      return res.status(403).json({ message: 'Solo administradores' })
    }
    next()
  } catch {
    res.status(500).json({ message: 'Error de autorización' })
  }
}

router.get('/inventario', authMiddleware, requireAdmin, controlador.auditoriaInventario)

module.exports = router
