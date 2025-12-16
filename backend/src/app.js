require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Pool } = require("pg");

const app = express();
const allowedOrigins = ["http://localhost:3000", process.env.CORS_ORIGIN||"https://erp.pcmaker.mx"];

app.use(
  cors({
    origin: function (origin, callback) {
      console.log("CORS origin request:", origin);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
app.use("/api/historial-tecnico",historial);
app.use("/api/configuraciones", configuracion)
app.use("/api/caja", cajaRoutes);
app.use("/api/ventas", ventasRoutes);

module.exports = { app, pool };
