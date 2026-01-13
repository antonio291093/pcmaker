const express = require('express')
const router = express.Router()
const cajaController = require('../controllers/controladorCaja')
const authMiddleware = require('../middlewares/authMiddleware')
const corteCajaMiddleware = require('../middlewares/corteCajaMiddleware')

// ==========================
// ABRIR DÍA OPERATIVO
// ==========================
router.post(
  '/abrir-dia',
  authMiddleware,
  cajaController.abrirDia
)

// ==========================
// REGISTRAR MOVIMIENTO
// ==========================
router.post(
  '/movimiento',
  authMiddleware,
  corteCajaMiddleware,
  cajaController.crearMovimiento
)

// ==========================
// RESUMEN DEL DÍA
// ==========================
router.get(
  '/resumen',
  authMiddleware,
  cajaController.obtenerResumenPorFecha
)

// ==========================
// GENERAR CORTE DE CAJA
// ==========================
router.post(
  '/corte',
  authMiddleware,
  cajaController.generarCorte
)

// ==========================
// HISTORIAL DE CORTES
// ==========================
router.get(
  '/cortes',
  authMiddleware,
  cajaController.obtenerCortes
)

router.get(
  '/corte-pendiente',
  authMiddleware,
  cajaController.obtenerCortePendiente
)

module.exports = router
