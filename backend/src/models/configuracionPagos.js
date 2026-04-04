const pool = require("../config/db");

async function obtenerConfiguracionPago(tipo_pago, requiere_factura) {
  let query = `
    SELECT id, tipo_pago, requiere_factura, banco, titular, numero_cuenta, clabe, referencia
    FROM configuracion_pagos
    WHERE activo = true
  `;

  const params = [];

  if (tipo_pago) {
    params.push(tipo_pago);
    query += ` AND tipo_pago = $${params.length}`;
  }

  if (requiere_factura !== undefined) {
    params.push(requiere_factura);
    query += ` AND requiere_factura = $${params.length}`;
  } else {    
    query += ` AND requiere_factura = false`;
  }

  query += " LIMIT 1";

  const { rows } = await pool.query(query, params);
  return rows[0];
}

// 🔹 Obtener todos
async function obtenerConfiguraciones() {
  const { rows } = await pool.query(`
    SELECT *
    FROM configuracion_pagos
    ORDER BY id ASC
  `);

  return rows;
}

// 🔹 Crear
async function crearConfiguracion(data) {
  const {
    tipo_pago,
    requiere_factura,
    banco,
    titular,
    numero_cuenta,
    clabe,
    referencia,
    descripcion,
  } = data;

  const { rows } = await pool.query(
    `
    INSERT INTO configuracion_pagos
    (tipo_pago, requiere_factura, banco, titular, numero_cuenta, clabe, referencia, descripcion)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
    `,
    [
      tipo_pago,
      requiere_factura,
      banco,
      titular,
      numero_cuenta,
      clabe,
      referencia,
      descripcion,
    ],
  );

  return rows[0];
}

// 🔹 Actualizar
async function actualizarConfiguracion(id, data) {
  const {
    tipo_pago,
    requiere_factura,
    banco,
    titular,
    numero_cuenta,
    clabe,
    referencia,
    descripcion,
    activo,
  } = data;

  const { rows } = await pool.query(
    `
    UPDATE configuracion_pagos
    SET tipo_pago = $1,
        requiere_factura = $2,
        banco = $3,
        titular = $4,
        numero_cuenta = $5,
        clabe = $6,
        referencia = $7,
        descripcion = $8,
        activo = $9
    WHERE id = $10
    RETURNING *
    `,
    [
      tipo_pago,
      requiere_factura,
      banco,
      titular,
      numero_cuenta,
      clabe,
      referencia,
      descripcion,
      activo,
      id,
    ],
  );

  return rows[0];
}

// 🔹 Eliminar (hard delete)
async function eliminarConfiguracion(id) {
  await pool.query(`DELETE FROM configuracion_pagos WHERE id = $1`, [id]);
}

module.exports = {
  obtenerConfiguraciones,
  crearConfiguracion,
  actualizarConfiguracion,
  eliminarConfiguracion,
  obtenerConfiguracionPago,
};
