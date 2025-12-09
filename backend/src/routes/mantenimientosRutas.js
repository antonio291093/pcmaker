const express = require("express");
const router = express.Router();
const mantenimientosController = require("../controllers/controladorMantenimientos");
const authMiddleware = require("../middlewares/authMiddleware");

// Crear mantenimiento
router.post("/", authMiddleware, mantenimientosController.crearMantenimiento);

// Obtener todos los mantenimientos (protegido)
router.get("/", authMiddleware, mantenimientosController.obtenerMantenimientos);

// Actualizar mantenimiento (protegido)
router.put(
  "/:id",
  authMiddleware,
  mantenimientosController.actualizarMantenimiento
);

// Eliminar mantenimiento (protegido)
router.delete(
  "/:id",
  authMiddleware,
  mantenimientosController.eliminarMantenimiento
);

module.exports = router;
