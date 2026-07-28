const pool = require('../config/db');
const { setAuditContext } = require('../utils/auditContext');

const TRANSICIONES_VALIDAS = {
  pendiente: ['en_preparacion'],
  en_preparacion: ['listo'],
  listo: ['completado'],
  completado: [],
  cancelado: []
};

const ESTADOS_CANCELABLES = ['pendiente', 'en_preparacion', 'listo'];

function validarFormaItem(item) {
  if (item.tipo === 'sin_revisar') {
    if (!item.equipo_id || item.inventario_id) {
      throw new Error(`Item inválido (tipo 'sin_revisar'): requiere equipo_id y no debe traer inventario_id`);
    }
  } else if (item.tipo === 'recepcion_directa') {
    if (!item.inventario_id || item.equipo_id) {
      throw new Error(`Item inválido (tipo 'recepcion_directa'): requiere inventario_id y no debe traer equipo_id`);
    }
  } else if (item.tipo === 'armado') {
    if (!item.inventario_id) {
      throw new Error(`Item inválido (tipo 'armado'): requiere inventario_id`);
    }
  } else {
    throw new Error(`Tipo de item desconocido: ${item.tipo}`);
  }
}

async function moverItem(client, item, sucursalDestinoId) {
  if (item.tipo === 'sin_revisar') {
    await client.query(`UPDATE equipos SET sucursal_id = $1 WHERE id = $2`, [sucursalDestinoId, item.equipo_id]);
  } else if (item.tipo === 'recepcion_directa') {
    await client.query(`UPDATE inventario SET sucursal_id = $1 WHERE id = $2`, [sucursalDestinoId, item.inventario_id]);
  } else if (item.tipo === 'armado') {
    await client.query(`UPDATE equipos SET sucursal_id = $1 WHERE id = $2`, [sucursalDestinoId, item.equipo_id]);
    await client.query(`UPDATE inventario SET sucursal_id = $1 WHERE id = $2`, [sucursalDestinoId, item.inventario_id]);
  }
}

async function crearPedido({
  sucursal_origen_id,
  sucursal_destino_id,
  creado_por,
  tecnico_id,
  detalle,
  items
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('El pedido debe incluir al menos un item');
  }
  items.forEach(validarFormaItem);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const equipoIds = items.filter(it => it.equipo_id).map(it => it.equipo_id);
    const inventarioIds = items.filter(it => it.inventario_id).map(it => it.inventario_id);

    // a) Ningún item debe estar en un pedido activo (bloquea las filas
    //    para evitar que dos usuarios arreglen el mismo equipo a la vez)
    const { rows: conflictos } = await client.query(
      `SELECT pi.pedido_id
       FROM pedido_items pi
       JOIN pedidos p ON p.id = pi.pedido_id
       WHERE p.estado NOT IN ('completado', 'cancelado')
         AND (
           (pi.equipo_id IS NOT NULL AND pi.equipo_id = ANY($1::int[]))
           OR (pi.inventario_id IS NOT NULL AND pi.inventario_id = ANY($2::int[]))
         )
       FOR UPDATE OF pi`,
      [equipoIds, inventarioIds]
    );

    if (conflictos.length > 0) {
      const pedidosEnConflicto = [...new Set(conflictos.map(c => c.pedido_id))].join(', ');
      throw new Error(`Uno o más items ya están en un pedido activo (#${pedidosEnConflicto})`);
    }

    // Origen homogéneo: todos los items deben estar hoy en sucursal_origen_id
    if (equipoIds.length > 0) {
      const { rows } = await client.query(
        `SELECT id, sucursal_id FROM equipos WHERE id = ANY($1::int[]) FOR UPDATE`,
        [equipoIds]
      );
      if (rows.length !== equipoIds.length) throw new Error('Uno o más equipos no existen');
      const fueraDeOrigen = rows.find(e => e.sucursal_id !== sucursal_origen_id);
      if (fueraDeOrigen) throw new Error(`El equipo ${fueraDeOrigen.id} no pertenece a la sucursal de origen`);
    }

    if (inventarioIds.length > 0) {
      const { rows } = await client.query(
        `SELECT id, sucursal_id FROM inventario WHERE id = ANY($1::int[]) AND eliminado = FALSE FOR UPDATE`,
        [inventarioIds]
      );
      if (rows.length !== inventarioIds.length) throw new Error('Uno o más items de inventario no existen');
      const fueraDeOrigen = rows.find(i => i.sucursal_id !== sucursal_origen_id);
      if (fueraDeOrigen) throw new Error(`El item de inventario ${fueraDeOrigen.id} no pertenece a la sucursal de origen`);
    }

    // b) INSERT pedidos
    const { rows: pedidoRows } = await client.query(
      `INSERT INTO pedidos (sucursal_origen_id, sucursal_destino_id, creado_por, tecnico_id, detalle)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sucursal_origen_id, sucursal_destino_id, creado_por, tecnico_id, detalle]
    );
    const pedido = pedidoRows[0];

    // c) INSERT pedido_items
    for (const item of items) {
      await client.query(
        `INSERT INTO pedido_items (pedido_id, tipo, equipo_id, inventario_id, estado_equipo_al_pedir)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedido.id, item.tipo, item.equipo_id || null, item.inventario_id || null, item.estado_equipo_al_pedir || null]
      );
    }

    // e) Contexto de auditoría — SET LOCAL vive el resto de la transacción,
    // así que se inyecta una sola vez y cubre todos los UPDATE de inventario de abajo.
    await setAuditContext(client, {
      userId: creado_por,
      contexto: 'traspaso',
      referenciaId: pedido.id
    });

    // d) Mover sucursal_id inmediatamente
    for (const item of items) {
      await moverItem(client, item, sucursal_destino_id);
    }

    await client.query('COMMIT');
    return pedido;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function obtenerPedidos({ estado, sucursal_id, limit = 50, offset = 0 } = {}) {
  const params = [];
  const wheres = [];

  if (estado) {
    params.push(estado);
    wheres.push(`p.estado = $${params.length}`);
  }
  if (sucursal_id) {
    params.push(sucursal_id);
    wheres.push(`(p.sucursal_origen_id = $${params.length} OR p.sucursal_destino_id = $${params.length})`);
  }

  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

  params.push(limit);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;

  const { rows } = await pool.query(
    `SELECT
       p.id,
       p.detalle,
       p.estado,
       p.sucursal_origen_id,
       so.nombre AS sucursal_origen_nombre,
       p.sucursal_destino_id,
       sd.nombre AS sucursal_destino_nombre,
       p.creado_por,
       uc.nombre AS creado_por_nombre,
       p.tecnico_id,
       ut.nombre AS tecnico_nombre,
       p.fecha_creacion,
       p.fecha_completado,
       p.fecha_cancelacion,
       p.motivo_cancelacion,
       (SELECT COUNT(*) FROM pedido_items pi WHERE pi.pedido_id = p.id)::INT AS total_items
     FROM pedidos p
     JOIN sucursales so ON so.id = p.sucursal_origen_id
     JOIN sucursales sd ON sd.id = p.sucursal_destino_id
     JOIN usuarios   uc ON uc.id = p.creado_por
     JOIN usuarios   ut ON ut.id = p.tecnico_id
     ${where}
     ORDER BY p.fecha_creacion DESC
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params
  );
  return rows;
}

async function obtenerPedidoPorId(id) {
  const { rows: pedidoRows } = await pool.query(
    `SELECT
       p.*,
       so.nombre  AS sucursal_origen_nombre,
       sd.nombre  AS sucursal_destino_nombre,
       uc.nombre  AS creado_por_nombre,
       ut.nombre  AS tecnico_nombre,
       uca.nombre AS cancelado_por_nombre
     FROM pedidos p
     JOIN sucursales so ON so.id = p.sucursal_origen_id
     JOIN sucursales sd ON sd.id = p.sucursal_destino_id
     JOIN usuarios   uc ON uc.id = p.creado_por
     JOIN usuarios   ut ON ut.id = p.tecnico_id
     LEFT JOIN usuarios uca ON uca.id = p.cancelado_por
     WHERE p.id = $1`,
    [id]
  );
  if (!pedidoRows.length) return null;

  const { rows: items } = await pool.query(
    `SELECT
       pi.id,
       pi.tipo,
       pi.equipo_id,
       pi.inventario_id,
       pi.estado_equipo_al_pedir,
       ce.nombre        AS estado_equipo_nombre,
       eq.nombre        AS equipo_nombre,
       eq.procesador    AS equipo_procesador,
       eq.sucursal_id   AS equipo_sucursal_actual,
       inv.tipo           AS inventario_tipo,
       inv.especificacion AS inventario_especificacion,
       inv.sku            AS inventario_sku,
       inv.sucursal_id    AS inventario_sucursal_actual
     FROM pedido_items pi
     LEFT JOIN catalogo_estados ce  ON ce.id  = pi.estado_equipo_al_pedir
     LEFT JOIN equipos          eq  ON eq.id  = pi.equipo_id
     LEFT JOIN inventario       inv ON inv.id = pi.inventario_id
     WHERE pi.pedido_id = $1
     ORDER BY pi.id`,
    [id]
  );

  return { ...pedidoRows[0], items };
}

async function cambiarEstadoPedido(id, nuevoEstado) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(`SELECT estado FROM pedidos WHERE id = $1 FOR UPDATE`, [id]);
    if (!rows.length) throw new Error('Pedido no encontrado');

    const estadoActual = rows[0].estado;
    const siguientesValidos = TRANSICIONES_VALIDAS[estadoActual] || [];

    if (!siguientesValidos.includes(nuevoEstado)) {
      throw new Error(`No se puede cambiar de '${estadoActual}' a '${nuevoEstado}'`);
    }

    const { rows: actualizado } = await client.query(
      `UPDATE pedidos
       SET estado = $1,
           fecha_completado = CASE WHEN $1 = 'completado' THEN NOW() ELSE fecha_completado END
       WHERE id = $2
       RETURNING *`,
      [nuevoEstado, id]
    );

    await client.query('COMMIT');
    return actualizado[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function cancelarPedido(id, { cancelado_por, motivo }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: pedidoRows } = await client.query(`SELECT * FROM pedidos WHERE id = $1 FOR UPDATE`, [id]);
    if (!pedidoRows.length) throw new Error('Pedido no encontrado');

    const pedido = pedidoRows[0];
    if (!ESTADOS_CANCELABLES.includes(pedido.estado)) {
      throw new Error(`No se puede cancelar un pedido en estado '${pedido.estado}'`);
    }

    const { rows: items } = await client.query(`SELECT * FROM pedido_items WHERE pedido_id = $1`, [id]);

    await setAuditContext(client, {
      userId: cancelado_por,
      contexto: 'traspaso',
      referenciaId: id
    });

    for (const item of items) {
      await moverItem(client, item, pedido.sucursal_origen_id);
    }

    const { rows: actualizado } = await client.query(
      `UPDATE pedidos
       SET estado = 'cancelado',
           cancelado_por = $1,
           motivo_cancelacion = $2,
           fecha_cancelacion = NOW()
       WHERE id = $3
       RETURNING *`,
      [cancelado_por, motivo || null, id]
    );

    await client.query('COMMIT');
    return actualizado[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function obtenerEquiposDisponibles(sucursal_id) {
  const { rows } = await pool.query(
    `
    -- Tipo 1: sin_revisar (equipos sin inventario)
    SELECT
      'sin_revisar' AS tipo,
      e.id AS equipo_id,
      NULL::int AS inventario_id,
      e.nombre, e.procesador, e.estado_id,
      le.etiqueta, e.sucursal_id, s.nombre AS sucursal_nombre
    FROM equipos e
    LEFT JOIN lotes_etiquetas le ON le.id = e.lote_etiqueta_id
    JOIN sucursales s ON s.id = e.sucursal_id
    WHERE e.sucursal_id = $1
      AND e.estado_id IN (1, 2, 3)
      AND NOT EXISTS (
        SELECT 1 FROM inventario i WHERE i.equipo_id = e.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM pedido_items pi
        JOIN pedidos p ON p.id = pi.pedido_id
        WHERE pi.equipo_id = e.id
          AND p.estado NOT IN ('completado', 'cancelado')
      )

    UNION ALL

    -- Tipo 2: recepcion_directa
    SELECT
      'recepcion_directa' AS tipo,
      NULL::int AS equipo_id,
      i.id AS inventario_id,
      COALESCE(ie.modelo, i.tipo, 'Sin nombre') AS nombre,
      COALESCE(ie.procesador, i.especificacion, '') AS procesador,
      NULL::int AS estado_id,
      COALESCE(i.sku, i.barcode, i.id::text) AS etiqueta,
      i.sucursal_id, s.nombre AS sucursal_nombre
    FROM inventario i
    LEFT JOIN inventario_especificaciones ie ON ie.inventario_id = i.id
    JOIN sucursales s ON s.id = i.sucursal_id
    WHERE i.sucursal_id = $1
      AND i.origen = 'recepcion_directa'
      AND i.eliminado = FALSE
      AND i.cantidad > 0
      AND NOT EXISTS (
        SELECT 1 FROM pedido_items pi
        JOIN pedidos p ON p.id = pi.pedido_id
        WHERE pi.inventario_id = i.id
          AND p.estado NOT IN ('completado', 'cancelado')
      )

    UNION ALL

    -- Tipo 3: armado (en inventario)
    SELECT
      'armado' AS tipo,
      e.id AS equipo_id,
      i.id AS inventario_id,
      e.nombre, e.procesador, e.estado_id,
      le.etiqueta, e.sucursal_id, s.nombre AS sucursal_nombre
    FROM equipos e
    JOIN inventario i ON i.equipo_id = e.id
    LEFT JOIN lotes_etiquetas le ON le.id = e.lote_etiqueta_id
    JOIN sucursales s ON s.id = e.sucursal_id
    WHERE e.sucursal_id = $1
      AND e.estado_id = 4
      AND i.eliminado = FALSE
      AND i.cantidad > 0
      AND NOT EXISTS (
        SELECT 1 FROM pedido_items pi
        JOIN pedidos p ON p.id = pi.pedido_id
        WHERE (pi.equipo_id = e.id OR pi.inventario_id = i.id)
          AND p.estado NOT IN ('completado', 'cancelado')
      )

    ORDER BY tipo, nombre, procesador
    `,
    [sucursal_id]
  );
  return rows;
}

module.exports = {
  crearPedido,
  obtenerPedidos,
  obtenerPedidoPorId,
  cambiarEstadoPedido,
  cancelarPedido,
  obtenerEquiposDisponibles
};
