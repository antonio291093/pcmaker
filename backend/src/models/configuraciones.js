const pool = require("../config/db");

/** ----------------------------------------------------
 * OBTENER TODAS LAS CONFIGURACIONES
 * ---------------------------------------------------- */
async function obtenerConfiguraciones() {
  const { rows } = await pool.query("SELECT * FROM configuraciones ORDER BY id ASC;");
  return rows;
}

/** ----------------------------------------------------
 * OBTENER CONFIGURACIÓN POR NOMBRE
 * ---------------------------------------------------- */
async function obtenerConfiguracionPorNombre(nombre) {
  const { rows } = await pool.query(
    "SELECT * FROM configuraciones WHERE nombre = $1 LIMIT 1;",
    [nombre]
  );
  return rows[0];
}

/** ----------------------------------------------------
 * CREAR NUEVA CONFIGURACIÓN
 * ---------------------------------------------------- */
async function crearConfiguracion({ nombre, valor, descripcion }) {
  const { rows } = await pool.query(
    `
    INSERT INTO configuraciones (nombre, valor, descripcion)
    VALUES ($1, $2, $3)
    RETURNING *;
    `,
    [nombre, valor, descripcion]
  );
  return rows[0];
}

/** ----------------------------------------------------
 * ACTUALIZAR CONFIGURACIÓN
 * ---------------------------------------------------- */
async function actualizarConfiguracion(id, { nombre, valor, descripcion }) {
  const { rows } = await pool.query(
    `
    UPDATE configuraciones
    SET nombre = COALESCE($1, nombre),
        valor = COALESCE($2, valor),
        descripcion = COALESCE($3, descripcion)
    WHERE id = $4
    RETURNING *;
    `,
    [nombre, valor, descripcion, id]
  );
  return rows[0];
}

/** ----------------------------------------------------
 * ELIMINAR CONFIGURACIÓN
 * ---------------------------------------------------- */
async function eliminarConfiguracion(id) {
  const { rowCount } = await pool.query("DELETE FROM configuraciones WHERE id = $1;", [id]);
  return rowCount > 0;
}

module.exports = {
  obtenerConfiguraciones,
  obtenerConfiguracionPorNombre,
  crearConfiguracion,
  actualizarConfiguracion,
  eliminarConfiguracion,  
};