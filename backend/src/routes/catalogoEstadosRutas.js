const express = require("express");
const router = express.Router();
const controlador = require("../controllers/controladorCatalogoEstados");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, controlador.obtenerEstados);

module.exports = router;
