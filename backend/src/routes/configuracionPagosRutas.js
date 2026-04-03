const express = require("express");
const router = express.Router();
const controlador = require("../controllers/controladorConfiguracionPagos");
const authMiddleware = require("../middlewares/authMiddleware");

// IMPORTANTE: orden correcto
// Para ventas (query params)
router.get("/config", authMiddleware, controlador.obtenerConfiguracionPago);

// CRUD admin
router.get("/", authMiddleware, controlador.obtenerConfiguraciones);
router.post("/", authMiddleware, controlador.crearConfiguracion);
router.put("/:id", authMiddleware, controlador.actualizarConfiguracion);
router.delete("/:id", authMiddleware, controlador.eliminarConfiguracion);

module.exports = router;
