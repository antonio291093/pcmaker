const pool = require("../config/db");

async function obtenerEstados() {
  const { rows } = await pool.query(
    "SELECT * FROM catalogo_estados ORDER BY id ASC"
  );
  return rows;
}

module.exports = { obtenerEstados };
