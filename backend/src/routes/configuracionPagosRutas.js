const express = require("express");
const router = express.Router();
const controlador = require("../controllers/controladorConfiguracionPagos");
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");

// IMPORTANTE: orden correcto
// Para ventas (query params)
router.get("/config", authMiddleware, controlador.obtenerConfiguracionPago);

// CRUD admin
router.get("/", authMiddleware, controlador.obtenerConfiguraciones);
router.post("/", authMiddleware, requireAdmin, controlador.crearConfiguracion);
router.put("/:id", authMiddleware, requireAdmin, controlador.actualizarConfiguracion);
router.delete("/:id", authMiddleware, requireAdmin, controlador.eliminarConfiguracion);

module.exports = router;
