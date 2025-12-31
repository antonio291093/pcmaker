const pool = require("../config/db");

async function crearEquipo(
  {
    nombre,
    descripcion,
    cantidad = 1,
    tipo,
    procesador,
    lote_etiqueta_id,
    estado_id,
    sucursal_id,
    tecnico_id,
  },
  client
) {
  const query = `
    INSERT INTO equipos (
      nombre, descripcion, cantidad, tipo, procesador,
      lote_etiqueta_id, estado_id, sucursal_id, tecnico_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [
    nombre,
    descripcion,
    cantidad,
    tipo,
    procesador,
    lote_etiqueta_id,
    estado_id,
    sucursal_id,
    tecnico_id,
  ];

  const { rows } = await client.query(query, values); // 👈 usar client, no pool
  return rows[0];
}

async function asignarRamAEquipo(equipo_id, ramModules, client = pool) {
  for (const ram of ramModules) {
    const query = `
      INSERT INTO equipos_ram (equipo_id, memoria_ram_id, cantidad)
      VALUES ($1, $2, $3);
    `;
    await client.query(query, [
      equipo_id,
      ram.memoria_ram_id,
      ram.cantidad || 1,
    ]);
  }
}

async function asignarAlmacenamientoAEquipo(
  equipo_id,
  storages,
  client = pool
) {
  for (const storage of storages) {
    const query = `
      INSERT INTO equipos_almacenamiento (equipo_id, almacenamiento_id, rol)
      VALUES ($1, $2, $3);
    `;
    await client.query(query, [
      equipo_id,
      storage.almacenamiento_id,
      storage.rol || null,
    ]);
  }
}

// Obtener todos los equipos
async function obtenerEquipos() {
  const query = `SELECT * FROM equipos ORDER BY id ASC;`;
  const { rows } = await pool.query(query);
  return rows;
}

// Obtener equipo por ID
async function obtenerEquipoPorId(id) {
  const query = `SELECT * FROM equipos WHERE id = $1;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

async function actualizarEquipo(id, campos) {
  // Armar arrays dinámicos de fields y values
  const keys = Object.keys(campos);
  if (keys.length === 0) throw new Error("No hay campos para actualizar");

  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", "); // ejemplo: "nombre = $1, sucursal_id = $2"
  const values = keys.map((k) => campos[k]);
  values.push(id); // último para el WHERE

  const query = `
    UPDATE equipos
    SET ${setClause}
    WHERE id = $${values.length}
    RETURNING *;
  `;
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Eliminar equipo
async function eliminarEquipo(id) {
  const query = `DELETE FROM equipos WHERE id = $1 RETURNING *;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

async function buscarEquipoPorEtiquetaTexto(texto) {
  const query = `
   SELECT equipos.*, lotes_etiquetas.lote_id
    FROM equipos
    INNER JOIN lotes_etiquetas ON equipos.lote_etiqueta_id = lotes_etiquetas.id
    WHERE lotes_etiquetas.etiqueta ILIKE $1
    LIMIT 1
  `;
  const parametroBusqueda = `%${texto}`; // Aquí el % para buscar "contiene"
  const { rows } = await pool.query(query, [parametroBusqueda]);
  return rows[0];
}

async function obtenerEquiposPorEstado(estadoId) {
  const query = `
    SELECT 
      e.id,
      e.nombre,
      e.procesador,
      le.etiqueta,
      e.sucursal_id,
      cs.nombre AS sucursal_nombre,
      -- Agrupa las memorias RAM en array
      COALESCE(
        (
          SELECT json_agg(cmr.descripcion)
          FROM equipos_ram er
          JOIN catalogo_memoria_ram cmr ON er.memoria_ram_id = cmr.id
          WHERE er.equipo_id = e.id
        ),
        '[]'
      ) AS memorias_ram,
      -- Agrupa los almacenamientos en array
      COALESCE(
        (
          SELECT json_agg(ca.descripcion)
          FROM equipos_almacenamiento ea
          JOIN catalogo_almacenamiento ca ON ea.almacenamiento_id = ca.id
          WHERE ea.equipo_id = e.id
        ),
        '[]'
      ) AS almacenamientos
    FROM equipos e
    JOIN lotes_etiquetas le ON e.lote_etiqueta_id = le.id
    LEFT JOIN sucursales cs ON e.sucursal_id = cs.id
    WHERE e.estado_id = $1
    ORDER BY e.id ASC;
  `;
  const { rows } = await pool.query(query, [estadoId]);
  return rows;
}

async function obtenerEquiposParaPedido(busqueda = '') {
  const query = `
    SELECT 
      e.id,
      e.nombre,
      e.procesador,
      e.estado_id,
      le.etiqueta,
      e.sucursal_id,
      cs.nombre AS sucursal_nombre,
      COALESCE(
        (
          SELECT json_agg(cmr.descripcion)
          FROM equipos_ram er
          JOIN catalogo_memoria_ram cmr ON er.memoria_ram_id = cmr.id
          WHERE er.equipo_id = e.id
        ),
        '[]'
      ) AS memorias_ram,
      COALESCE(
        (
          SELECT json_agg(ca.descripcion)
          FROM equipos_almacenamiento ea
          JOIN catalogo_almacenamiento ca ON ea.almacenamiento_id = ca.id
          WHERE ea.equipo_id = e.id
        ),
        '[]'
      ) AS almacenamientos
    FROM equipos e
    JOIN lotes_etiquetas le ON e.lote_etiqueta_id = le.id
    LEFT JOIN sucursales cs ON e.sucursal_id = cs.id
    WHERE e.estado_id IN (2, 4)
      AND (
        e.nombre ILIKE '%' || $1 || '%'
        OR le.etiqueta ILIKE '%' || $1 || '%'
      )
    ORDER BY e.id DESC;
  `;

  const { rows } = await pool.query(query, [busqueda]);
  return rows;
}

module.exports = {
  crearEquipo,
  obtenerEquipos,
  obtenerEquipoPorId,
  actualizarEquipo,
  eliminarEquipo,
  buscarEquipoPorEtiquetaTexto,
  asignarRamAEquipo,
  asignarAlmacenamientoAEquipo,
  obtenerEquiposPorEstado,
  obtenerEquiposParaPedido,
};
