const express = require("express");
const router = express.Router();
const controlador = require("../controllers/controladorCatalogoAlmacenamiento");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, controlador.obtenerAlmacenamiento);

module.exports = router;
