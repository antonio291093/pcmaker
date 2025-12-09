const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // Busca el token en la cookie (cookie-parser debe estar configurado)
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Token inválido" });
  }
};
