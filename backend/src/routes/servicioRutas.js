const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { servicioToggleLimiter } = require("../middlewares/rateLimit");

// Comparación en tiempo constante: se comparan los SHA-256 para que ambos
// buffers midan lo mismo y la longitud del token tampoco se filtre
function tokenAdminValido(recibido) {
  const esperado = process.env.ADMIN_SECRET_TOKEN;
  if (!esperado || typeof recibido !== "string" || !recibido) return false;
  const a = crypto.createHash("sha256").update(recibido).digest();
  const b = crypto.createHash("sha256").update(esperado).digest();
  return crypto.timingSafeEqual(a, b);
}

function adminTokenMiddleware(req, res, next) {
  if (!tokenAdminValido(req.headers["x-admin-token"])) {
    return res.status(401).json({ message: "Token de administrador inválido" });
  }
  next();
}

// GET /api/admin/servicio/status — público
router.get("/status", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT valor FROM configuraciones WHERE nombre = 'servicio_activo'"
    );
    const activo = rows.length === 0 || rows[0].valor === "true";
    res.json({ activo });
  } catch (error) {
    console.error("Error leyendo estado del servicio:", error);
    res.status(500).json({ message: "Error al leer el estado del servicio" });
  }
});

// POST /api/admin/servicio/toggle — protegido por X-Admin-Token
router.post("/toggle", servicioToggleLimiter, adminTokenMiddleware, async (req, res) => {
  const { activo } = req.body;
  if (typeof activo !== "boolean") {
    return res.status(400).json({ message: "El campo 'activo' debe ser un booleano" });
  }
  try {
    await pool.query(
      "UPDATE configuraciones SET valor = $1 WHERE nombre = 'servicio_activo'",
      [activo ? "true" : "false"]
    );
    res.json({ activo, message: `Servicio ${activo ? "activado" : "desactivado"}` });
  } catch (error) {
    console.error("Error actualizando estado del servicio:", error);
    res.status(500).json({ message: "Error al actualizar el estado del servicio" });
  }
});

module.exports = router;
