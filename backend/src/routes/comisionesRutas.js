const express = require("express");
const router = express.Router();
const comisionesController = require("../controllers/controaldorComisiones");
const authMiddleware = require("../middlewares/authMiddleware");

// Rutas estáticas antes de las parametrizadas
router.get("/reporte", authMiddleware, comisionesController.obtenerReporteComisiones);

router.post("/", authMiddleware, comisionesController.crearComision);
router.get("/", authMiddleware, comisionesController.obtenerComisiones);

// Actualizar comisión
router.put("/:id", authMiddleware, comisionesController.actualizarComision);

// Eliminar comisión
router.delete("/:id", authMiddleware, comisionesController.eliminarComision);

// Obtener comisión por equipo
router.get(
  "/equipo/:equipo_id",
  authMiddleware,
  comisionesController.obtenerComisionPorEquipo
);

// Obtener comisiones de la semana actual por usuario
router.get(
  "/semana/:usuario_id",
  authMiddleware,
  comisionesController.obtenerComisionesSemanaActual
);

module.exports = router;
