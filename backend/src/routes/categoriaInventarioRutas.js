const express = require('express')
const router = express.Router()

const controller = require('../controllers/controladorCategoriaInventario')

// Obtener todas
router.get('/', controller.getCategorias)

// Obtener una
router.get('/:id', controller.getCategoria)

// Crear
router.post('/', controller.crearCategoria)

// Actualizar
router.put('/:id', controller.actualizarCategoria)

// Eliminar
router.delete('/:id', controller.eliminarCategoria)

module.exports = router