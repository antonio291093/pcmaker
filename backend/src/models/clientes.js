const pool = require("../config/db");

async function obtenerClientes({ sucursal_id, busqueda, pagina = 1, por_pagina = 25 }) {
  const offset = (pagina - 1) * por_pagina;
  const busquedaLike = busqueda ? `%${busqueda}%` : null;

  const query = `
    SELECT
      c.id,
      c.nombre,
      c.telefono,
      c.correo,
      c.fecha_registro,
      s.nombre AS sucursal,

      COUNT(v.id)::INT          AS numero_visitas,
      COALESCE(SUM(v.total), 0) AS total_gastado,
      MAX(v.fecha_venta)        AS ultima_compra

    FROM clientes c
    LEFT JOIN sucursales s ON s.id = c.sucursal_id
    LEFT JOIN ventas v     ON v.cliente_id = c.id

    WHERE ($1::INTEGER IS NULL OR c.sucursal_id = $1)
      AND (
        $2::TEXT IS NULL
        OR c.nombre   ILIKE $2
        OR c.telefono ILIKE $2
        OR c.correo   ILIKE $2
      )

    GROUP BY c.id, s.nombre
    ORDER BY MAX(v.fecha_venta) DESC NULLS LAST, c.nombre ASC
    LIMIT $3 OFFSET $4;
  `;

  const countQuery = `
    SELECT COUNT(*)::INT AS total
    FROM clientes c
    WHERE ($1::INTEGER IS NULL OR c.sucursal_id = $1)
      AND (
        $2::TEXT IS NULL
        OR c.nombre   ILIKE $2
        OR c.telefono ILIKE $2
        OR c.correo   ILIKE $2
      );
  `;

  const params = [sucursal_id || null, busquedaLike];

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(query, [...params, por_pagina, offset]),
    pool.query(countQuery, params),
  ]);

  return {
    clientes: rows,
    total: countRows[0].total,
    pagina,
    por_pagina,
  };
}

async function obtenerClientePorId(id) {
  const clienteQuery = `
    SELECT
      c.id,
      c.nombre,
      c.telefono,
      c.correo,
      c.fecha_registro,
      c.sucursal_id,
      s.nombre AS sucursal,

      COUNT(v.id)::INT          AS numero_visitas,
      COALESCE(SUM(v.total), 0) AS total_gastado,
      MAX(v.fecha_venta)        AS ultima_compra

    FROM clientes c
    LEFT JOIN sucursales s ON s.id = c.sucursal_id
    LEFT JOIN ventas v     ON v.cliente_id = c.id
    WHERE c.id = $1
    GROUP BY c.id, s.nombre;
  `;

  const historialQuery = `
    SELECT
      v.id,
      v.fecha_venta,
      v.total,
      v.subtotal,
      v.iva,
      v.requiere_factura,
      s.nombre AS sucursal,
      (
        SELECT string_agg(metodo_pago || ': $' || monto, ' + ')
        FROM ventas_pagos vp
        WHERE vp.venta_id = v.id
      ) AS metodos_pago,
      (
        SELECT COUNT(*) FROM venta_detalle vd WHERE vd.venta_id = v.id
      )::INT AS num_articulos

    FROM ventas v
    LEFT JOIN sucursales s ON s.id = v.sucursal_id
    WHERE v.cliente_id = $1
    ORDER BY v.fecha_venta DESC;
  `;

  const [{ rows: clienteRows }, { rows: historial }] = await Promise.all([
    pool.query(clienteQuery, [id]),
    pool.query(historialQuery, [id]),
  ]);

  if (!clienteRows.length) return null;

  return {
    ...clienteRows[0],
    historial,
  };
}

async function crearCliente({ nombre, telefono, correo, sucursal_id }) {
  const { rows } = await pool.query(
    `INSERT INTO clientes (nombre, telefono, correo, sucursal_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [nombre, telefono || null, correo || null, sucursal_id || null]
  );
  return rows[0];
}

async function actualizarCliente(id, { nombre, telefono, correo, sucursal_id }) {
  const { rows } = await pool.query(
    `UPDATE clientes
     SET nombre      = COALESCE($2, nombre),
         telefono    = $3,
         correo      = $4,
         sucursal_id = COALESCE($5, sucursal_id)
     WHERE id = $1
     RETURNING *`,
    [id, nombre || null, telefono || null, correo || null, sucursal_id || null]
  );
  return rows[0] || null;
}

async function resolverOCrearCliente(
  { nombre, telefono, correo, sucursal_id },
  client = pool
) {
  const tel = telefono?.trim() || null

  if (tel) {
    const { rows } = await client.query(
      'SELECT id FROM clientes WHERE telefono = $1',
      [tel]
    )
    if (rows.length) return rows[0].id

    const { rows: nuevo } = await client.query(
      `INSERT INTO clientes (nombre, telefono, correo, sucursal_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [nombre, tel, correo || null, sucursal_id || null]
    )
    return nuevo[0].id
  }

  // Sin teléfono: buscar por nombre exacto entre los que tampoco tienen teléfono
  const { rows } = await client.query(
    'SELECT id FROM clientes WHERE nombre = $1 AND telefono IS NULL',
    [nombre]
  )
  if (rows.length) return rows[0].id

  const { rows: nuevo } = await client.query(
    `INSERT INTO clientes (nombre, telefono, correo, sucursal_id)
     VALUES ($1, NULL, $2, $3) RETURNING id`,
    [nombre, correo || null, sucursal_id || null]
  )
  return nuevo[0].id
}

module.exports = {
  obtenerClientes,
  obtenerClientePorId,
  crearCliente,
  actualizarCliente,
  resolverOCrearCliente,
};
