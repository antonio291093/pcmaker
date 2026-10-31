const express = require("express");
const router = express.Router();
const configuracionesController = require("../controllers/controladorConfiguraciones.js");
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");

// Listar todas las configuraciones
router.get("/", authMiddleware, configuracionesController.getConfiguraciones);

// Obtener configuración por nombre
router.get("/:nombre", authMiddleware, configuracionesController.getConfiguracionPorNombre);

// Crear nueva configuración (solo admin)
router.post("/", authMiddleware, requireAdmin, configuracionesController.postConfiguracion);

// Actualizar configuración existente (solo admin)
router.put("/:id", authMiddleware, requireAdmin, configuracionesController.putConfiguracion);

// Eliminar configuración (solo admin)
router.delete("/:id", authMiddleware, requireAdmin, configuracionesController.deleteConfiguracion);

module.exports = router;
