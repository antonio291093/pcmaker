const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // URL de conexión en .env
  ssl: false,
});

pool.on("connect", () => {
  console.log("Conectado a la base de datos PostgreSQL");
});

module.exports = pool;
