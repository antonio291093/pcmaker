const pool = require("../config/db");

async function crearPedido({
  detalle,
  sucursalDestinoId,
  tecnicoId,
  creadoPor,
  equipos
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pedidoQuery = `
      INSERT INTO pedidos (detalle, sucursal_destino_id, tecnico_id, creado_por)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;

    const pedidoResult = await client.query(pedidoQuery, [
      detalle,
      sucursalDestinoId,
      tecnicoId,
      creadoPor
    ]);

    const pedidoId = pedidoResult.rows[0].id;

    for (const equipo of equipos) {
      await client.query(
        `INSERT INTO pedido_equipos (pedido_id, equipo_id, estado_equipo_al_pedir)
         VALUES ($1, $2, $3)`,
        [pedidoId, equipo.id, equipo.estado_id]
      );
    }

    await client.query('COMMIT');
    return pedidoId;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  crearPedido
};
