const express = require("express");
const router = express.Router();
const catalogoController = require("../controllers/controladorCatalogoMantenimiento");
const authMiddleware = require("../middlewares/authMiddleware");

// Crear tipo de mantenimiento
router.post("/", authMiddleware, catalogoController.crearCatalogoMantenimiento);

// Obtener todos los tipos de mantenimiento
router.get("/", authMiddleware, catalogoController.obtenerCatalogoMantenimientos);

// Obtener un tipo de mantenimiento por ID
router.get("/:id", authMiddleware, catalogoController.obtenerCatalogoMantenimientoPorId);

// Actualizar tipo de mantenimiento
router.put("/:id", authMiddleware, catalogoController.actualizarCatalogoMantenimiento);

// Eliminar tipo de mantenimiento
router.delete("/:id", authMiddleware, catalogoController.eliminarCatalogoMantenimiento);

module.exports = router;
