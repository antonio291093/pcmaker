const { rateLimit } = require("express-rate-limit");

// Requiere app.set("trust proxy", 1) para que req.ip sea la IP real del cliente detrás de nginx.
// Almacenamiento en memoria: el contador es por contenedor y se reinicia al reiniciar el backend.

// Login: solo cuentan los intentos fallidos (respuestas >= 400) por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Demasiados intentos fallidos. Intenta de nuevo en 15 minutos." },
});

// Toggle del servicio: cuenta todas las peticiones por IP
const servicioToggleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
});

module.exports = { loginLimiter, servicioToggleLimiter };
