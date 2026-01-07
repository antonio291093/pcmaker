const express = require("express");
const router = express.Router();
const ventasController = require("../controllers/controladorVentas");
const authMiddleware = require("../middlewares/authMiddleware");
const corteCajaMiddleware = require("../middlewares/corteCajaMiddleware.js");

// Registrar venta
router.post("/", authMiddleware, corteCajaMiddleware, ventasController.crearVenta);

// Obtener listado de ventas
router.get("/", authMiddleware, ventasController.obtenerVentas);

module.exports = router;
