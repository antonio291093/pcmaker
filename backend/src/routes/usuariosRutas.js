const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/controladorUsuarios");
const authMiddleware = require("../middlewares/authMiddleware"); // asumiendo que tienes este para proteger rutas

// Crear usuario
router.post("/", usuariosController.crearUsuario);

// Obtener todos los usuarios (protegido)
router.get("/", authMiddleware, usuariosController.obtenerUsuarios);

// Actualizar usuario (protegido)
router.put("/:id", authMiddleware, usuariosController.actualizarUsuario);

// Eliminar usuario (protegido)
router.delete("/:id", authMiddleware, usuariosController.eliminarUsuario);

// Ruta para obtener información del usuario autenticado
router.get("/me", authMiddleware, usuariosController.me);

// Login no protegido
router.post("/login", usuariosController.login);

// Logout no protegido
router.post("/logout", usuariosController.logout);

module.exports = router;
