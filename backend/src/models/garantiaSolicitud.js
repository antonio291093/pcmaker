const pool = require("../config/db");
const { withAuditContext } = require("../utils/auditContext");

/** ----------------------------------------------------
 * CREAR SOLICITUD
 * ---------------------------------------------------- */
async function crearSolicitud({ venta_id, motivo_cliente, creado_por, items }) {
  if (!venta_id || !motivo_cliente || !creado_por) {
    throw new Error("venta_id, motivo_cliente y creado_por son requeridos");
  }
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Debe seleccionar al menos un artículo a reclamar");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: configRows } = await client.query(
      `SELECT valor FROM configuraciones WHERE nombre = 'garantias_meses_validez' LIMIT 1`,
    );
    const mesesValidez = Number(configRows[0]?.valor || 6);

    const { rows: ventaRows } = await client.query(
      `SELECT id, sucursal_id, fecha_venta,
              (fecha_venta + ($1 || ' months')::INTERVAL) >= NOW() AS vigente
       FROM ventas
       WHERE id = $2
       FOR UPDATE`,
      [mesesValidez, venta_id],
    );
    if (!ventaRows.length) throw new Error("Venta no encontrada");
    const venta = ventaRows[0];
    if (!venta.vigente) {
      throw new Error(
        `La garantía de esta venta ya venció (más de ${mesesValidez} meses)`,
      );
    }

    const ventaDetalleIds = items.map(Number);

    const { rows: detalleRows } = await client.query(
      `SELECT id, producto_id, equipo_id
       FROM venta_detalle
       WHERE id = ANY($1::INT[]) AND venta_id = $2 AND tipo = 'producto'`,
      [ventaDetalleIds, venta_id],
    );
    if (detalleRows.length !== ventaDetalleIds.length) {
      throw new Error("Alguno de los artículos no pertenece a esta venta");
    }

    const { rows: yaReclamados } = await client.query(
      `SELECT gi.venta_detalle_id
       FROM garantia_solicitud_items gi
       JOIN garantia_solicitudes gs ON gs.id = gi.garantia_solicitud_id
       WHERE gi.venta_detalle_id = ANY($1::INT[]) AND gs.estado != 'rechazada'`,
      [ventaDetalleIds],
    );
    if (yaReclamados.length) {
      throw new Error(
        "Uno o más artículos ya tienen una solicitud de garantía activa",
      );
    }

    const { rows: solicitudRows } = await client.query(
      `INSERT INTO garantia_solicitudes
         (venta_id, sucursal_id, motivo_cliente, creado_por, fecha_venta_snapshot)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [venta_id, venta.sucursal_id, motivo_cliente, creado_por, venta.fecha_venta],
    );
    const solicitud = solicitudRows[0];

    const itemsInsertados = [];
    for (const detalle of detalleRows) {
      const { rows } = await client.query(
        `INSERT INTO garantia_solicitud_items
           (garantia_solicitud_id, venta_detalle_id, inventario_id, equipo_id)
         VALUES ($1,$2,$3,$4)
         RETURNING *`,
        [solicitud.id, detalle.id, detalle.producto_id, detalle.equipo_id],
      );
      itemsInsertados.push(rows[0]);
    }

    await client.query("COMMIT");
    return { ...solicitud, items: itemsInsertados };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** ----------------------------------------------------
 * LISTAR SOLICITUDES (paginado)
 * ---------------------------------------------------- */
async function obtenerSolicitudes({ sucursal_id, estado, limit = 25, offset = 0 } = {}) {
  const params = [sucursal_id || null, estado || null];

  const query = `
    SELECT
      gs.id,
      gs.estado,
      gs.tipo_resolucion,
      gs.motivo_cliente,
      gs.monto_diferencia,
      gs.fecha_venta_snapshot,
      gs.fecha_creacion,
      gs.fecha_resolucion,
      gs.venta_id,
      v.cliente   AS cliente_nombre,
      v.telefono  AS cliente_telefono,
      s.nombre    AS sucursal,
      uc.nombre   AS creado_por_nombre,
      ut.nombre   AS tecnico_nombre,
      (
        SELECT COUNT(*)::INT
        FROM garantia_solicitud_items gi
        WHERE gi.garantia_solicitud_id = gs.id
      ) AS total_items
    FROM garantia_solicitudes gs
    JOIN ventas v         ON v.id = gs.venta_id
    JOIN sucursales s     ON s.id = gs.sucursal_id
    JOIN usuarios uc      ON uc.id = gs.creado_por
    LEFT JOIN usuarios ut ON ut.id = gs.tecnico_id
    WHERE ($1::INT IS NULL OR gs.sucursal_id = $1)
      AND ($2::TEXT IS NULL OR gs.estado = $2)
    ORDER BY gs.fecha_creacion DESC
    LIMIT $3 OFFSET $4;
  `;

  const countQuery = `
    SELECT COUNT(*)::INT AS total
    FROM garantia_solicitudes gs
    WHERE ($1::INT IS NULL OR gs.sucursal_id = $1)
      AND ($2::TEXT IS NULL OR gs.estado = $2);
  `;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(query, [...params, limit, offset]),
    pool.query(countQuery, params),
  ]);

  return {
    solicitudes: rows,
    total: countRows[0].total,
    limit,
    offset,
  };
}

/** ----------------------------------------------------
 * DETALLE DE SOLICITUD
 * ---------------------------------------------------- */
async function obtenerSolicitudPorId(id) {
  const { rows: cabeceraRows } = await pool.query(
    `SELECT
       gs.*,
       v.cliente   AS cliente_nombre,
       v.telefono  AS cliente_telefono,
       v.correo    AS cliente_correo,
       s.nombre    AS sucursal,
       uc.nombre   AS creado_por_nombre,
       ut.nombre   AS tecnico_nombre
     FROM garantia_solicitudes gs
     JOIN ventas v         ON v.id = gs.venta_id
     JOIN sucursales s     ON s.id = gs.sucursal_id
     JOIN usuarios uc      ON uc.id = gs.creado_por
     LEFT JOIN usuarios ut ON ut.id = gs.tecnico_id
     WHERE gs.id = $1`,
    [id],
  );
  if (!cabeceraRows.length) return null;
  const solicitud = cabeceraRows[0];

  const { rows: items } = await pool.query(
    `SELECT
       gi.id,
       gi.venta_detalle_id,
       gi.inventario_id,
       gi.equipo_id,
       gi.estado_item,
       CASE
         WHEN gi.equipo_id IS NOT NULL THEN e.nombre
         WHEN ie.inventario_id IS NOT NULL THEN ie.modelo
         ELSE i.especificacion
       END AS producto_descripcion,
       i.sku
     FROM garantia_solicitud_items gi
     LEFT JOIN inventario i ON i.id = gi.inventario_id
     LEFT JOIN equipos e ON e.id = gi.equipo_id
     LEFT JOIN inventario_especificaciones ie ON ie.inventario_id = gi.inventario_id
     WHERE gi.garantia_solicitud_id = $1
     ORDER BY gi.id ASC`,
    [id],
  );

  const itemIds = items.map((i) => i.id);
  let componentesPorItem = {};
  if (itemIds.length) {
    const { rows: componentes } = await pool.query(
      `SELECT
         gc.id,
         gc.garantia_solicitud_item_id,
         gc.inventario_id,
         gc.cantidad,
         gc.descripcion,
         i.especificacion AS inventario_descripcion,
         i.sku
       FROM garantia_solicitud_componentes gc
       JOIN inventario i ON i.id = gc.inventario_id
       WHERE gc.garantia_solicitud_item_id = ANY($1::INT[])
       ORDER BY gc.id ASC`,
      [itemIds],
    );
    componentesPorItem = componentes.reduce((acc, c) => {
      (acc[c.garantia_solicitud_item_id] ||= []).push(c);
      return acc;
    }, {});
  }

  return {
    ...solicitud,
    items: items.map((item) => ({
      ...item,
      componentes: componentesPorItem[item.id] || [],
    })),
  };
}

/** ----------------------------------------------------
 * ASIGNAR TÉCNICO
 * ---------------------------------------------------- */
async function asignarTecnico(id, tecnico_id) {
  const { rows } = await pool.query(
    `UPDATE garantia_solicitudes
     SET tecnico_id = $1,
         estado = 'en_revision',
         fecha_revision = COALESCE(fecha_revision, NOW()),
         fecha_actualizacion = NOW()
     WHERE id = $2 AND estado IN ('solicitada', 'en_revision')
     RETURNING *`,
    [tecnico_id, id],
  );
  return rows[0] || null;
}

/** ----------------------------------------------------
 * REGISTRAR DIAGNÓSTICO (aprueba o rechaza)
 * ---------------------------------------------------- */
async function registrarDiagnostico(id, { diagnostico, aplica, motivo_rechazo }) {
  const nuevoEstado = aplica ? "aprobada" : "rechazada";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE garantia_solicitudes
       SET diagnostico_tecnico = $1,
           estado = $2,
           motivo_rechazo = $3,
           fecha_resolucion = CASE WHEN $2 = 'rechazada' THEN NOW() ELSE fecha_resolucion END,
           fecha_actualizacion = NOW()
       WHERE id = $4 AND estado = 'en_revision'
       RETURNING *`,
      [diagnostico, nuevoEstado, aplica ? null : motivo_rechazo || null, id],
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return null;
    }

    if (nuevoEstado === "rechazada") {
      await client.query(
        `UPDATE garantia_solicitud_items SET estado_item = 'rechazado' WHERE garantia_solicitud_id = $1`,
        [id],
      );
    }

    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** ----------------------------------------------------
 * RESOLVER GARANTÍA (reparación / reemplazo / devolución)
 * ---------------------------------------------------- */
async function resolverGarantia(
  id,
  { tipo_resolucion, monto_diferencia = 0, componentes = [], reemplazo_inventario_id, userId = null },
) {
  if (!["reparacion", "reemplazo", "devolucion"].includes(tipo_resolucion)) {
    throw new Error("tipo_resolucion inválido");
  }

  return withAuditContext(
    { userId, contexto: "garantia", referenciaId: id },
    async (client) => {
      const { rows: solicitudRows } = await client.query(
        `SELECT id, estado FROM garantia_solicitudes WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (!solicitudRows.length) throw new Error("Solicitud de garantía no encontrada");
      if (solicitudRows[0].estado !== "aprobada") {
        throw new Error("Solo se puede resolver una solicitud aprobada");
      }

      const { rows: items } = await client.query(
        `SELECT id, inventario_id FROM garantia_solicitud_items WHERE garantia_solicitud_id = $1`,
        [id],
      );
      if (!items.length) throw new Error("La solicitud no tiene artículos");

      if (tipo_resolucion === "reparacion") {
        if (!Array.isArray(componentes) || !componentes.length) {
          throw new Error("Debe especificar los componentes usados en la reparación");
        }

        for (const comp of componentes) {
          const { garantia_solicitud_item_id, inventario_id, cantidad = 1, descripcion } = comp;

          const { rows: invRows } = await client.query(
            `SELECT cantidad FROM inventario WHERE id = $1 FOR UPDATE`,
            [inventario_id],
          );
          if (!invRows.length) throw new Error(`Componente ${inventario_id} no encontrado en inventario`);
          if (invRows[0].cantidad < cantidad) {
            throw new Error(`Stock insuficiente para el componente ${inventario_id}`);
          }

          await client.query(`UPDATE inventario SET cantidad = cantidad - $1 WHERE id = $2`, [
            cantidad,
            inventario_id,
          ]);

          await client.query(
            `INSERT INTO garantia_solicitud_componentes
               (garantia_solicitud_item_id, inventario_id, cantidad, descripcion)
             VALUES ($1,$2,$3,$4)`,
            [garantia_solicitud_item_id, inventario_id, cantidad, descripcion || null],
          );

          await client.query(
            `UPDATE garantia_solicitud_items SET estado_item = 'reparado' WHERE id = $1`,
            [garantia_solicitud_item_id],
          );
        }
      }

      if (tipo_resolucion === "reemplazo") {
        if (!reemplazo_inventario_id) throw new Error("Debe indicar el producto de reemplazo");

        const { rows: invRows } = await client.query(
          `SELECT cantidad FROM inventario WHERE id = $1 FOR UPDATE`,
          [reemplazo_inventario_id],
        );
        if (!invRows.length) throw new Error("Producto de reemplazo no encontrado");
        if (invRows[0].cantidad < 1) throw new Error("Sin stock disponible del producto de reemplazo");

        await client.query(`UPDATE inventario SET cantidad = cantidad - 1 WHERE id = $1`, [
          reemplazo_inventario_id,
        ]);

        for (const item of items) {
          if (item.inventario_id) {
            await client.query(
              `UPDATE inventario
               SET estado = 'defectuoso', disponibilidad = FALSE, visible_catalogo = FALSE
               WHERE id = $1`,
              [item.inventario_id],
            );
          }
          await client.query(
            `UPDATE garantia_solicitud_items SET estado_item = 'reemplazado' WHERE id = $1`,
            [item.id],
          );
        }
      }

      if (tipo_resolucion === "devolucion") {
        await client.query(
          `UPDATE garantia_solicitud_items SET estado_item = 'devuelto' WHERE garantia_solicitud_id = $1`,
          [id],
        );
      }

      const { rows: actualizada } = await client.query(
        `UPDATE garantia_solicitudes
         SET estado = 'resuelta',
             tipo_resolucion = $1,
             monto_diferencia = $2,
             fecha_resolucion = NOW(),
             fecha_actualizacion = NOW()
         WHERE id = $3
         RETURNING *`,
        [tipo_resolucion, monto_diferencia, id],
      );

      return actualizada[0];
    },
  );
}

/** ----------------------------------------------------
 * ARTÍCULOS ELEGIBLES DE UNA VENTA (para crear solicitud)
 * ---------------------------------------------------- */
async function obtenerVentaElegible(venta_id) {
  const { rows: configRows } = await pool.query(
    `SELECT valor FROM configuraciones WHERE nombre = 'garantias_meses_validez' LIMIT 1`,
  );
  const mesesValidez = Number(configRows[0]?.valor || 6);

  const { rows: ventaRows } = await pool.query(
    `SELECT id, cliente, telefono, fecha_venta,
            (fecha_venta + ($1 || ' months')::INTERVAL) >= NOW() AS vigente
     FROM ventas
     WHERE id = $2`,
    [mesesValidez, venta_id],
  );
  if (!ventaRows.length) return null;
  const venta = ventaRows[0];

  const { rows: items } = await pool.query(
    `SELECT
       d.id AS venta_detalle_id,
       CASE
         WHEN i.equipo_id IS NOT NULL THEN e.nombre
         WHEN ie.inventario_id IS NOT NULL THEN ie.modelo
         ELSE i.especificacion
       END AS descripcion,
       i.sku,
       EXISTS (
         SELECT 1 FROM garantia_solicitud_items gi
         JOIN garantia_solicitudes gs ON gs.id = gi.garantia_solicitud_id
         WHERE gi.venta_detalle_id = d.id AND gs.estado != 'rechazada'
       ) AS ya_reclamado
     FROM venta_detalle d
     JOIN inventario i ON d.producto_id = i.id
     LEFT JOIN equipos e ON i.equipo_id = e.id
     LEFT JOIN inventario_especificaciones ie ON ie.inventario_id = d.producto_id
     WHERE d.venta_id = $1 AND d.tipo = 'producto'
     ORDER BY d.id ASC`,
    [venta_id],
  );

  return { ...venta, meses_validez: mesesValidez, items };
}

module.exports = {
  crearSolicitud,
  obtenerSolicitudes,
  obtenerSolicitudPorId,
  asignarTecnico,
  registrarDiagnostico,
  resolverGarantia,
  obtenerVentaElegible,
};
