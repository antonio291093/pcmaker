const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/controladorPedidos');
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');

router.post('/', authMiddleware, pedidosController.crear);
router.get('/', authMiddleware, pedidosController.listar);

// Ruta estática — debe ir antes de '/:id'
router.get('/equipos-disponibles', authMiddleware, pedidosController.equiposDisponibles);

router.get('/:id', authMiddleware, pedidosController.detalle);
router.put('/:id/estado', authMiddleware, pedidosController.cambiarEstado);
router.post('/:id/cancelar', authMiddleware, requireAdmin, pedidosController.cancelar);

module.exports = router;
