const pool = require("../config/db");

async function obtenerMemoriasRam() {
  const { rows } = await pool.query(
    "SELECT id, descripcion FROM catalogo_memoria_ram ORDER BY id ASC"
  );
  return rows;
}

module.exports = { obtenerMemoriasRam };
