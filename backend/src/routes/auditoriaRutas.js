const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const requireAdmin = require('../middlewares/requireAdmin')
const controlador = require('../controllers/controladorAuditoria')

router.get('/inventario', authMiddleware, requireAdmin, controlador.auditoriaInventario)

module.exports = router
