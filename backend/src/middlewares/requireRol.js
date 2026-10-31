// Requiere authMiddleware antes (usa req.user, sin consultar la BD)
// Uso: router.post("/", authMiddleware, requireRol(1, 3), controlador)
module.exports = function requireRol(...roles) {
  return function (req, res, next) {
    if (!req.user || !roles.includes(req.user.rol_id)) {
      return res.status(403).json({ message: "No tienes permiso para esta acción" });
    }
    next();
  };
};
