const express = require("express");
const router = express.Router();
const ventasController = require("../controllers/controladorVentas");
const authMiddleware = require("../middlewares/authMiddleware");

// Registrar venta
router.post("/", authMiddleware, ventasController.crearVenta);

// Obtener listado de ventas
router.get("/", authMiddleware, ventasController.obtenerVentas);

module.exports = router;
