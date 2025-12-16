const express = require("express");
const router = express.Router();
const sucursalesController = require("../controllers/controladorSucursales");
const authMiddleware = require("../middlewares/authMiddleware");

// Crear sucursal
router.post("/", authMiddleware, sucursalesController.crearSucursal);

// Obtener todas las sucursales
router.get("/", authMiddleware, sucursalesController.obtenerSucursales);

// Obtener sucursal por ID
router.get("/:id", authMiddleware, sucursalesController.obtenerSucursalPorId);

// Actualizar sucursal
router.put("/:id", authMiddleware, sucursalesController.actualizarSucursal);

// Eliminar sucursal
router.delete("/:id", authMiddleware, sucursalesController.eliminarSucursal);

module.exports = router;
