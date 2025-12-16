// src/routes/historialRutas.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const historialController = require("../controllers/controladorHistorial");

router.get("/", authMiddleware, historialController.obtenerHistorialTecnico);

module.exports = router;
