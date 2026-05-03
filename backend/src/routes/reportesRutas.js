const express = require("express");
const router = express.Router();

const reportesController = require("../controllers/controladorReportes");
const authMiddleware = require("../middlewares/authMiddleware");

// 🔹 Resumen por sucursales (cards principales)
router.get(
  "/ReportesSucursales",
  authMiddleware,
  reportesController.resumenSucursales,
);

// Obtener listado de ventas
router.get("/", authMiddleware, reportesController.reporteVentas);

router.get("/detalle-diario", authMiddleware, reportesController.detalleDiario);

router.get(
  "/articulos-eliminados",
  authMiddleware,
  reportesController.articulosEliminados,
);

module.exports = router;
