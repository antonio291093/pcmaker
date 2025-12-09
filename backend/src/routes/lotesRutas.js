const express = require("express");
const router = express.Router();
const lotesController = require("../controllers/controladorLotes");
const authMiddleware = require("../middlewares/authMiddleware");

// Crear lote
router.post("/", authMiddleware, lotesController.crearLote);

// Obtener todos los lotes
router.get("/", authMiddleware, lotesController.obtenerLotes);

// Generar series para lote (nuevo endpoint)
router.get("/:id/series", authMiddleware, lotesController.generarSeriesPorLote);

// Actualizar lote
router.put("/:id", authMiddleware, lotesController.actualizarLote);

// Eliminar lote
router.delete("/:id", authMiddleware, lotesController.eliminarLote);

// ruta para obtener etiquetas por lote
router.get(
  "/:id/etiquetas",
  authMiddleware,
  lotesController.obtenerEtiquetasPorLote
);

module.exports = router;
