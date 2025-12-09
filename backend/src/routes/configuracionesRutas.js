const express = require("express");
const router = express.Router();
const configuracionesController = require("../controllers/controladorConfiguraciones.js");
const authMiddleware = require("../middlewares/authMiddleware");

// Listar todas las configuraciones
router.get("/", authMiddleware, configuracionesController.getConfiguraciones);

// Obtener configuración por nombre
router.get("/:nombre", authMiddleware, configuracionesController.getConfiguracionPorNombre);

// Crear nueva configuración
router.post("/", authMiddleware, configuracionesController.postConfiguracion);

// Actualizar configuración existente
router.put("/:id", authMiddleware, configuracionesController.putConfiguracion);

// Eliminar configuración
router.delete("/:id", authMiddleware, configuracionesController.deleteConfiguracion);

module.exports = router;
