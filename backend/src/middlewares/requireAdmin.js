const requireRol = require("./requireRol");

// Requiere authMiddleware antes (usa req.user)
module.exports = requireRol(1);
