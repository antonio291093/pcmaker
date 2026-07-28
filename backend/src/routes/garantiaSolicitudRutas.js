const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/controladorGarantiaSolicitud");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, ctrl.crear);
router.get("/", authMiddleware, ctrl.listar);
router.get("/ventas/:venta_id/elegibles", authMiddleware, ctrl.elegibles);
router.get("/:id", authMiddleware, ctrl.detalle);

router.put("/:id/tecnico", authMiddleware, ctrl.asignarTecnico);
router.put("/:id/diagnostico", authMiddleware, ctrl.diagnostico);
router.put("/:id/resolver", authMiddleware, ctrl.resolver);

module.exports = router;
