const express = require('express')
const router  = express.Router()
const ctrl    = require('../controllers/controladorApartados')
const authMiddleware = require('../middlewares/authMiddleware')

// Ruta estática antes de las parametrizadas
router.get('/configuraciones', authMiddleware, ctrl.obtenerConfiguraciones)

router.get('/',    authMiddleware, ctrl.listar)
router.get('/:id', authMiddleware, ctrl.detalle)

router.post('/',           authMiddleware, ctrl.crear)
router.post('/:id/abonos', authMiddleware, ctrl.abonar)
router.post('/:id/cancelar', authMiddleware, ctrl.cancelar)
router.post('/:id/liquidar', authMiddleware, ctrl.liquidar)

module.exports = router
