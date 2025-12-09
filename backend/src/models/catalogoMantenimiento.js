const pool = require("../config/db");

// Crear tipo de mantenimiento
async function crearCatalogoMantenimiento({ descripcion, costo, activo = true }) {
  const query = `
    INSERT INTO catalogo_mantenimiento (descripcion, costo, activo)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [descripcion, costo, activo];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Obtener todos los tipos de mantenimiento
async function obtenerCatalogoMantenimientos() {
  const query = `SELECT * FROM catalogo_mantenimiento ORDER BY id ASC;`;
  const { rows } = await pool.query(query);
  return rows;
}

// Obtener un tipo de mantenimiento por ID
async function obtenerCatalogoMantenimientoPorId(id) {
  const query = `SELECT * FROM catalogo_mantenimiento WHERE id = $1;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

// Actualizar tipo de mantenimiento
async function actualizarCatalogoMantenimiento(id, { descripcion, costo, activo }) {
  const query = `
    UPDATE catalogo_mantenimiento
    SET descripcion = $1, costo = $2, activo = $3
    WHERE id = $4
    RETURNING *;
  `;
  const values = [descripcion, costo, activo, id];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Eliminar tipo de mantenimiento
async function eliminarCatalogoMantenimiento(id) {
  const query = `DELETE FROM catalogo_mantenimiento WHERE id = $1 RETURNING *;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

module.exports = {
  crearCatalogoMantenimiento,
  obtenerCatalogoMantenimientos,
  obtenerCatalogoMantenimientoPorId,
  actualizarCatalogoMantenimiento,
  eliminarCatalogoMantenimiento,
};
