const express = require('express')
const router = express.Router()
const { generarGarantiaPorVenta } = require('../controllers/controladorGarantias')

router.get('/garantia/:ventaId', generarGarantiaPorVenta)

module.exports = router
