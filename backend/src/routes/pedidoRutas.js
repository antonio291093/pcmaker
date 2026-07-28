const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const pedidosController = require('../controllers/controladorPedidos');
const authMiddleware = require('../middlewares/authMiddleware');

// Mismo patrón que auditoriaRutas.js: solo admin puede cancelar pedidos
async function requireAdmin(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT rol_id FROM usuarios WHERE id = $1', [req.userId]);
    if (!rows[0] || rows[0].rol_id !== 1) {
      return res.status(403).json({ message: 'Solo administradores' });
    }
    next();
  } catch {
    res.status(500).json({ message: 'Error de autorización' });
  }
}

router.post('/', authMiddleware, pedidosController.crear);
router.get('/', authMiddleware, pedidosController.listar);

// Ruta estática — debe ir antes de '/:id'
router.get('/equipos-disponibles', authMiddleware, pedidosController.equiposDisponibles);

router.get('/:id', authMiddleware, pedidosController.detalle);
router.put('/:id/estado', authMiddleware, pedidosController.cambiarEstado);
router.post('/:id/cancelar', authMiddleware, requireAdmin, pedidosController.cancelar);

module.exports = router;
