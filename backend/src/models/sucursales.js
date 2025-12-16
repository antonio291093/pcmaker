const pool = require("../config/db");

// Crear sucursal
async function crearSucursal({ nombre }) {
  const query = `
    INSERT INTO sucursales (nombre)
    VALUES ($1)
    RETURNING *;
  `;
  const values = [nombre];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Obtener todas las sucursales
async function obtenerSucursales() {
  const query = `SELECT * FROM sucursales ORDER BY id ASC;`;
  const { rows } = await pool.query(query);
  return rows;
}

// Obtener sucursal por ID
async function obtenerSucursalPorId(id) {
  const query = `SELECT * FROM sucursales WHERE id = $1;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

// Actualizar sucursal
async function actualizarSucursal(id, { nombre }) {
  const query = `
    UPDATE sucursales
    SET nombre = $1
    WHERE id = $2
    RETURNING *;
  `;
  const values = [nombre, id];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Eliminar sucursal
async function eliminarSucursal(id) {
  const query = `DELETE FROM sucursales WHERE id = $1 RETURNING *;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

module.exports = {
  crearSucursal,
  obtenerSucursales,
  obtenerSucursalPorId,
  actualizarSucursal,
  eliminarSucursal,
};
