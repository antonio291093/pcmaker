const express = require("express");
const router = express.Router();
const cajaController = require("../controllers/controladorCaja");
const authMiddleware = require("../middlewares/authMiddleware");
const corteCajaMiddleware = require("../middlewares/corteCajaMiddleware");

// Registrar movimiento (venta, gasto o ingreso)
router.post("/movimiento", authMiddleware, corteCajaMiddleware, cajaController.crearMovimiento);

// Obtener resumen del día
router.get("/resumen", authMiddleware, cajaController.obtenerResumenPorFecha);

// Generar corte de caja
router.post("/corte", authMiddleware, cajaController.generarCorte);

// Obtener historial de cortes
router.get("/cortes", authMiddleware, cajaController.obtenerCortes);

router.get(
  "/estado",
  authMiddleware,
  cajaController.estadoCaja
);

router.get(
  '/corte-pendiente',
  authMiddleware,
  cajaController.obtenerCortePendiente
)

module.exports = router;
