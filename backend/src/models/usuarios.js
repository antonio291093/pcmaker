const pool = require("../config/db");

// Crear usuario con sucursal_id
async function crearUsuario({
  nombre,
  email,
  contraseña,
  rol_id,
  activo = true,
  sucursal_id,
}) {
  const query = `
    INSERT INTO usuarios (nombre, email, contraseña, rol_id, activo, sucursal_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [nombre, email, contraseña, rol_id, activo, sucursal_id];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Obtener todos los usuarios
async function obtenerUsuarios() {
  const query = `SELECT * FROM usuarios ORDER BY id ASC;`;
  const { rows } = await pool.query(query);
  return rows;
}

// Actualizar usuario con sucursal_id
async function actualizarUsuario(
  id,
  { nombre, email, contraseña, rol_id, activo, sucursal_id }
) {
  let query;
  let values;

  if (contraseña) {
    query = `
      UPDATE usuarios
      SET nombre = $1, email = $2, contraseña = $3, rol_id = $4, activo = $5, sucursal_id = $6
      WHERE id = $7
      RETURNING *;
    `;
    values = [nombre, email, contraseña, rol_id, activo, sucursal_id, id];
  } else {
    query = `
      UPDATE usuarios
      SET nombre = $1, email = $2, rol_id = $3, activo = $4, sucursal_id = $5
      WHERE id = $6
      RETURNING *;
    `;
    values = [nombre, email, rol_id, activo, sucursal_id, id];
  }

  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Eliminar usuario
async function eliminarUsuario(id) {
  const query = `DELETE FROM usuarios WHERE id = $1 RETURNING *;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

module.exports = {
  crearUsuario,
  obtenerUsuarios,
  actualizarUsuario,
  eliminarUsuario,
};
