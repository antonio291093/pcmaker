const express = require("express");
const router = express.Router();

const clientesController = require("../controllers/controladorClientes");
const authMiddleware = require("../middlewares/authMiddleware");

// Ruta estática antes de la parametrizada (regla Express)
router.get("/", authMiddleware, clientesController.listar);
router.post("/", authMiddleware, clientesController.crear);
router.get("/:id", authMiddleware, clientesController.obtenerUno);
router.put("/:id", authMiddleware, clientesController.actualizar);

module.exports = router;
