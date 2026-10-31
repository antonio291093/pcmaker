const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Verifica el JWT y carga el usuario desde la BD en cada request.
// Falla cerrada: ante cualquier error responde con 401/500, nunca llama a next().
module.exports = async (req, res, next) => {
  // Busca el token en la cookie (cookie-parser debe estar configurado)
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }

  let user;
  try {
    const { rows } = await pool.query(
      "SELECT id, rol_id, activo, sucursal_id FROM usuarios WHERE id = $1",
      [decoded.id],
    );
    user = rows[0];
  } catch (error) {
    console.error("Error en authMiddleware:", error);
    return res.status(500).json({ message: "Error de autenticación" });
  }

  // Usuario eliminado o desactivado: su token deja de servir de inmediato
  if (!user || !user.activo) {
    return res.status(401).json({ message: "Sesión no válida" });
  }

  req.user = user;
  req.userId = user.id; // compatibilidad con controladores existentes
  next();
};
