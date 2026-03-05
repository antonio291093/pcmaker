const pool = require("../config/db");

async function obtenerMemoriasRam(tipo) {

  let query = `
    SELECT id, descripcion, tipo_modulo
    FROM catalogo_memoria_ram
  `;

  const params = [];

  if (tipo) {
    query += " WHERE tipo_modulo = $1";
    params.push(tipo);
  }

  query += " ORDER BY id ASC";

  const { rows } = await pool.query(query, params);

  return rows;
}

module.exports = { obtenerMemoriasRam };
