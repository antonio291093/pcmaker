require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const pool = require("./config/db");

const app = express();

// Detrás de un solo nginx: req.ip toma la IP real del cliente (X-Forwarded-For)
app.set("trust proxy", 1);

const allowedOrigins = [
  process.env.CORS_ORIGIN || "https://erp.pcmaker.mx",
  "https://catalogo.pcmaker.mx",
];

// Orígenes de desarrollo: nunca en producción
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:3000", "http://localhost:3001");
}

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        const error = new Error("Origen no permitido por CORS");
        error.code = "CORS_NO_PERMITIDO";
        callback(error);
      }
    },
    credentials: true,
  }),
);

app.use(cookieParser());

app.use(express.json());

pool
  .connect()
  .then(() => console.log("✅ Conectado a PostgreSQL"))
  .catch((err) => {
    console.error("❌ Error de conexión:", err);
    process.exit(1);
  });

// Importa las rutas
const usuariosRoutes = require("./routes/usuariosRutas");
const lotesRoutes = require("./routes/lotesRutas");
const equiposRoutes = require("./routes/equiposRutas");
const inventarioRoutes = require("./routes/inventarioRutas");
const catalogoEstados = require("./routes/catalogoEstadosRutas");
const catalogoMemoriaRam = require("./routes/catalogoRAMRutas");
const catalogoAlmacenamiento = require("./routes/catalogoAlmacenamientoRutas");
const comisionesRutas = require("./routes/comisionesRutas");
const mantenimientosRutas = require("./routes/mantenimientosRutas");
const sucursalesRutas = require("./routes/sucursalesRutas");
const catalogoMantenimientoRoutes = require("./routes/catalogoMantenimientoRutas");
const historial = require("./routes/historialRutas");
const configuracion = require("./routes/configuracionesRutas");
const cajaRoutes = require("./routes/cajaRutas");
const ventasRoutes = require("./routes/ventasRutas");
const pedidosRoutes = require("./routes/pedidoRutas");
const garantiasRoutes = require("./routes/garantiaRutas");
const catalogoRoutes = require("./routes/catalogoRutas");
const catalogoCategoriasRoutes = require("./routes/categoriaInventarioRutas");
const configuracionPagos = require("./routes/configuracionPagosRutas");
const reportesRoutes = require("./routes/reportesRutas");
const clientesRoutes = require("./routes/clientesRutas");
const apartadosRoutes = require("./routes/apartadosRutas");
const servicioRoutes = require("./routes/servicioRutas");
const auditoriaRoutes = require("./routes/auditoriaRutas");
const garantiaSolicitudRoutes = require("./routes/garantiaSolicitudRutas");

// Usa las rutas
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/lotes", lotesRoutes);
app.use("/api/equipos", equiposRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/catalogoEstados", catalogoEstados);
app.use("/api/catalogoMemoriaRam", catalogoMemoriaRam);
app.use("/api/catalogoAlmacenamiento", catalogoAlmacenamiento);
app.use("/api/comisiones", comisionesRutas);
app.use("/api/mantenimientos", mantenimientosRutas);
app.use("/api/sucursales", sucursalesRutas);
app.use("/api/catalogoMantenimiento", catalogoMantenimientoRoutes);
app.use("/api/historial-tecnico", historial);
app.use("/api/configuraciones", configuracion);
app.use("/api/caja", cajaRoutes);
app.use("/api/ventas", ventasRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api", garantiasRoutes);
app.use("/api/catalogo", catalogoRoutes);
app.use("/catalogo-img", express.static("uploads/catalogo"));
app.use("/api/catalogo-categorias", catalogoCategoriasRoutes);
app.use("/api/configuracionPagos", configuracionPagos);
app.use("/api/reportes", reportesRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/apartados", apartadosRoutes);
app.use("/api/admin/servicio", servicioRoutes);
app.use("/api/admin/auditoria", auditoriaRoutes);
app.use("/api/garantia-solicitudes", garantiaSolicitudRoutes);

// Manejador global de errores (va al final): siempre JSON { message }, sin stack ni detalles internos
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "El archivo excede el tamaño permitido" : "Archivo no válido";
    return res.status(400).json({ message });
  }

  if (err.code === "CORS_NO_PERMITIDO") {
    return res.status(403).json({ message: "Origen no permitido" });
  }

  // Errores 4xx marcados como públicos (JSON malformado, body demasiado grande, formato de archivo)
  const status = err.status || err.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ message: err.expose ? err.message : "Solicitud inválida" });
  }

  console.error("Error no controlado:", err);
  res.status(500).json({ message: "Error interno del servidor" });
});

module.exports = { app };
