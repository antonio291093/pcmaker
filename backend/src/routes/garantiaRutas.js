const express = require('express')
const router = express.Router()
const { generarGarantia, generarGarantiaPorVenta } = require('../controllers/controladorGarantias')

router.post('/garantia', generarGarantia)

router.get('/garantia/:ventaId', generarGarantiaPorVenta)

module.exports = router
