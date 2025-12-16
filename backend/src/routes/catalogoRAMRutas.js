const express = require("express");
const router = express.Router();
const controlador = require("../controllers/controladorCatalogoMemoriaRam");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, controlador.obtenerMemoriasRam);

module.exports = router;
