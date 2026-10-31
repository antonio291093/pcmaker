const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/controladorUsuarios");
const authMiddleware = require("../middlewares/authMiddleware"); // asumiendo que tienes este para proteger rutas
const requireAdmin = require("../middlewares/requireAdmin");
const { loginLimiter } = require("../middlewares/rateLimit");

// Crear usuario (solo admin)
router.post("/", authMiddleware, requireAdmin, usuariosController.crearUsuario);

// Obtener todos los usuarios (protegido)
router.get("/", authMiddleware, usuariosController.obtenerUsuarios);

// Actualizar usuario (solo admin)
router.put("/:id", authMiddleware, requireAdmin, usuariosController.actualizarUsuario);

// Eliminar usuario (solo admin)
router.delete("/:id", authMiddleware, requireAdmin, usuariosController.eliminarUsuario);

// Ruta para obtener información del usuario autenticado
router.get("/me", authMiddleware, usuariosController.me);

// Login no protegido (limitado por IP: solo cuentan los intentos fallidos)
router.post("/login", loginLimiter, usuariosController.login);

// Logout no protegido
router.post("/logout", usuariosController.logout);

module.exports = router;
