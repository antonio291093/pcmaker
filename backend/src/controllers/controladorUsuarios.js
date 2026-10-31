const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  crearUsuario,
  obtenerUsuarios,
  actualizarUsuario,
  eliminarUsuario,
} = require("../models/usuarios");
const pool = require("../config/db");
const JWT_SECRET = process.env.JWT_SECRET;

// Crear usuario
exports.crearUsuario = async (req, res) => {
  const {
    nombre,
    email,
    password,
    rol_id,
    activo = true,
    sucursal_id,
  } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const usuario = await crearUsuario({
      nombre,
      email,
      contraseña: hashedPassword,
      rol_id,
      activo,
      sucursal_id,
    });
    res.status(201).json(usuario);
  } catch (error) {
    console.error("Error creando usuario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.obtenerUsuarios = async (req, res) => {
  try {
    const { rol } = req.query; // 👈 viene del ?rol=tecnico
    const usuarios = await obtenerUsuarios(rol || null);
    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar usuario
exports.actualizarUsuario = async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, email, password, rol_id, activo, sucursal_id } = req.body;
  try {
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    const usuarioActualizado = await actualizarUsuario(id, {
      nombre,
      email,
      contraseña: hashedPassword,
      rol_id,
      activo,
      sucursal_id,
    });
    if (!usuarioActualizado) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(usuarioActualizado);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar usuario
exports.eliminarUsuario = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const usuarioEliminado = await eliminarUsuario(id);
    if (!usuarioEliminado) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const query = "SELECT * FROM usuarios WHERE email=$1;";
    const { rows } = await pool.query(query, [email]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const valid = await bcrypt.compare(password, user.contraseña);
    if (!valid) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,        // true en producción (solo por HTTPS)
      sameSite: "lax",       // está bien para la mayoría de casos
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        rol_id: user.rol_id,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error de servidor" });
  }
};

// Obtener usuario actual (me)
// authMiddleware ya verificó el JWT y que el usuario exista y esté activo
exports.me = async (req, res) => {
  try {
    const query = `
      SELECT id, email, nombre, rol_id, activo, sucursal_id
      FROM usuarios
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [req.userId]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: "Sesión no válida" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Error al obtener usuario actual:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.logout = (req, res) => {  
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  res.json({ message: "Sesión cerrada correctamente." });
};

