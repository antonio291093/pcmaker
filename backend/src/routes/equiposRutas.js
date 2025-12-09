const express = require("express");
const router = express.Router();
const equiposController = require("../controllers/controladorEquipos");
const authMiddleware = require("../middlewares/authMiddleware"); // Middleware para proteger rutas

// Crear equipo (protegida)
router.post("/", authMiddleware, equiposController.crearEquipo);

// Obtener todos los equipos (protegida)
router.get("/", authMiddleware, equiposController.obtenerEquipos);

router.get(
  "/buscar",
  authMiddleware,
  equiposController.buscarEquipoPorEtiqueta
);

// Obtener equipo por ID (protegida)
router.get("/:id", authMiddleware, equiposController.obtenerEquipoPorId);

// Actualizar equipo (protegida)
router.put("/:id", authMiddleware, equiposController.actualizarEquipo);

// Eliminar equipo (protegida)
router.delete("/:id", authMiddleware, equiposController.eliminarEquipo);

router.get(
  "/estado/:estado_id",
  authMiddleware,
  equiposController.obtenerEquiposPorEstado
);

module.exports = router;
