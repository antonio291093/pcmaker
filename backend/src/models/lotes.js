const pool = require("../config/db");

// Crear lote
async function crearLote({
  etiqueta,
  fecha_recibo,
  total_equipos,
  usuario_recibio,
  fecha_creacion,
}) {
  const query = `
    INSERT INTO lotes (etiqueta, fecha_recibo, total_equipos, usuario_recibio, fecha_creacion)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [
    etiqueta,
    fecha_recibo,
    total_equipos,
    usuario_recibio,
    fecha_creacion,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Obtener todos los lotes
async function obtenerLotes() {
  const query = `SELECT * FROM lotes ORDER BY id ASC;`;
  const { rows } = await pool.query(query);
  return rows;
}

// Generar series para un lote basado en la fecha y total equipos
async function generarSeriesPorLote(loteId) {
  // Primero, obtener la info del lote
  const { rows } = await pool.query("SELECT * FROM lotes WHERE id=$1", [
    loteId,
  ]);
  if (rows.length === 0) return [];

  const lote = rows[0];
  const fecha = new Date(lote.fecha_recibo);
  const fechaNum = fecha.toISOString().slice(0, 10).replace(/-/g, ""); // Ejemplo 20250927

  // Construir las series concatenando fechaNum con 1..total_equipos
  const series = [];
  for (let i = 1; i <= lote.total_equipos; i++) {
    series.push(`${lote.etiqueta} - ${fechaNum}${i}`);
  }
  return series;
}

// Actualizar lote
async function actualizarLote(
  id,
  { etiqueta, fecha_recibo, total_equipos, usuario_recibio, fecha_creacion }
) {
  const query = `
    UPDATE lotes
    SET etiqueta = $1, fecha_recibo = $2, total_equipos = $3, usuario_recibio = $4, fecha_creacion = $5
    WHERE id = $6
    RETURNING *;
  `;
  const values = [
    etiqueta,
    fecha_recibo,
    total_equipos,
    usuario_recibio,
    fecha_creacion,
    id,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Eliminar lote
async function eliminarLote(id) {
  const query = `DELETE FROM lotes WHERE id = $1 RETURNING *;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

// Guardar etiquetas en lotes_etiquetas para un lote dado
async function guardarEtiquetasLote(loteId, etiquetas) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Insertar todas las etiquetas (cada etiqueta es texto con el número de serie)
    for (const etiqueta of etiquetas) {
      await client.query(
        "INSERT INTO lotes_etiquetas (lote_id, etiqueta) VALUES ($1, $2)",
        [loteId, etiqueta]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Obtener etiquetas de un lote específico
async function obtenerEtiquetasPorLote(loteId) {
  const query = `
    SELECT
      le.id AS lote_etiqueta_id,
      le.etiqueta,
      e.id AS equipo_id,
      ce.id AS estado_id,
      ce.nombre AS estado_nombre,
      ce.visual_color
    FROM lotes_etiquetas le
    LEFT JOIN equipos e ON e.lote_etiqueta_id = le.id
    LEFT JOIN catalogo_estados ce ON ce.id = e.estado_id
    WHERE le.lote_id = $1
    ORDER BY le.id ASC;
  `;
  const { rows } = await pool.query(query, [loteId]);
  return rows;
}

module.exports = {
  crearLote,
  obtenerLotes,
  generarSeriesPorLote,
  actualizarLote,
  eliminarLote,
  guardarEtiquetasLote,
  obtenerEtiquetasPorLote,
};
