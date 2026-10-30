const express = require('express')
const router = express.Router()

const controller = require('../controllers/controladorCategoriaInventario')
const authMiddleware = require('../middlewares/authMiddleware')
const requireAdmin = require('../middlewares/requireAdmin')

// Obtener todas (público: lo consume el catálogo)
router.get('/', controller.getCategorias)

// Obtener una
router.get('/:id', controller.getCategoria)

// Crear (solo admin)
router.post('/', authMiddleware, requireAdmin, controller.crearCategoria)

// Actualizar (solo admin)
router.put('/:id', authMiddleware, requireAdmin, controller.actualizarCategoria)

// Eliminar (solo admin)
router.delete('/:id', authMiddleware, requireAdmin, controller.eliminarCategoria)

module.exports = router