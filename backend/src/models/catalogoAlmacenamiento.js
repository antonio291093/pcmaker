const pool = require("../config/db");

async function obtenerAlmacenamiento() {
  const { rows } = await pool.query(
    "SELECT id, descripcion FROM catalogo_almacenamiento ORDER BY id ASC"
  );
  return rows;
}

module.exports = { obtenerAlmacenamiento };
