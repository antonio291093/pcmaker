const pool = require("../config/db");

// 🔹 Obtener memorias RAM disponibles
async function obtenerMemoriasRamDisponibles() {
  const query = `
    SELECT 
      i.memoria_ram_id AS id,
      cmr.descripcion,
      i.cantidad,
      i.precio,
      s.nombre AS sucursal
    FROM inventario i
    JOIN catalogo_memoria_ram cmr ON i.memoria_ram_id = cmr.id
    LEFT JOIN sucursales s ON i.sucursal_id = s.id
    WHERE i.cantidad > 0
    ORDER BY cmr.descripcion ASC;
  `;
  const { rows } = await pool.query(query);
  return rows;
}

// 🔹 Obtener almacenamientos disponibles
async function obtenerAlmacenamientosDisponibles() {
  const query = `
    SELECT 
      i.almacenamiento_id AS id,
      ca.descripcion,
      i.cantidad,
      i.precio,
      s.nombre AS sucursal
    FROM inventario i
    JOIN catalogo_almacenamiento ca ON i.almacenamiento_id = ca.id
    LEFT JOIN sucursales s ON i.sucursal_id = s.id
    WHERE i.cantidad > 0
    ORDER BY ca.descripcion ASC;
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function actualizarEquipoArmado(id, data) {
  const { nombre, procesador, precio, memorias_ram_ids, almacenamientos_ids } = data;

  console.log("🧠 [INICIO ACTUALIZAR EQUIPO ARMADO]");
  console.log("📦 ID del equipo:", id);
  console.log("📩 Datos recibidos:", data);

  try {
    await pool.query("BEGIN");

    // Obtener relaciones actuales
    const { rows: actuales } = await pool.query(
      `
      SELECT 
        er.memoria_ram_id,
        ea.almacenamiento_id
      FROM equipos e
      LEFT JOIN equipos_ram er ON e.id = er.equipo_id
      LEFT JOIN equipos_almacenamiento ea ON e.id = ea.equipo_id
      WHERE e.id = $1
    `,
      [id]
    );

    const ramsActuales = actuales.map(r => r.memoria_ram_id).filter(Boolean);
    const almacActuales = actuales.map(a => a.almacenamiento_id).filter(Boolean);

    console.log("💾 RAMs actuales:", ramsActuales);
    console.log("💾 Almacenamientos actuales:", almacActuales);

    // 🔹 Solo si el frontend envió las memorias RAM
    if (Array.isArray(memorias_ram_ids)) {
      const ramsRemovidas = ramsActuales.filter(r => !memorias_ram_ids.includes(r));
      const ramsAgregadas = memorias_ram_ids.filter(r => !ramsActuales.includes(r));

      console.log("🧩 RAMs removidas:", ramsRemovidas);
      console.log("🧩 RAMs agregadas:", ramsAgregadas);

      // Reponer stock de las RAM eliminadas
      for (const ramId of ramsRemovidas) {
        console.log(`🔼 Reponiendo stock de RAM ID ${ramId}`);
        await pool.query(
          `UPDATE inventario SET cantidad = cantidad + 1 WHERE memoria_ram_id = $1`,
          [ramId]
        );
      }

      // Descontar stock de las nuevas RAM
      for (const ramId of ramsAgregadas) {
        console.log(`🔽 Descontando stock de nueva RAM ID ${ramId}`);
        await pool.query(
          `UPDATE inventario SET cantidad = cantidad - 1 WHERE memoria_ram_id = $1 AND cantidad > 0`,
          [ramId]
        );
      }

      // Limpiar e insertar nuevas RAM
      await pool.query(`DELETE FROM equipos_ram WHERE equipo_id = $1`, [id]);
      for (const ramId of memorias_ram_ids) {
        console.log(`➕ Insertando RAM ID ${ramId} en equipos_ram`);
        await pool.query(
          `INSERT INTO equipos_ram (equipo_id, memoria_ram_id) VALUES ($1, $2)`,
          [id, ramId]
        );
      }
    } else {
      console.log("⚠️ No se enviaron cambios de RAM, se mantienen las actuales.");
    }

    // 🔹 Solo si el frontend envió los almacenamientos
    if (Array.isArray(almacenamientos_ids)) {
      const almacRemovidos = almacActuales.filter(a => !almacenamientos_ids.includes(a));
      const almacAgregados = almacenamientos_ids.filter(a => !almacActuales.includes(a));

      console.log("💽 Almacenamientos removidos:", almacRemovidos);
      console.log("💽 Almacenamientos agregados:", almacAgregados);

      // Reponer stock de los almacenamientos removidos
      for (const alId of almacRemovidos) {
        console.log(`🔼 Reponiendo stock de almacenamiento ID ${alId}`);
        await pool.query(
          `UPDATE inventario SET cantidad = cantidad + 1 WHERE almacenamiento_id = $1`,
          [alId]
        );
      }

      // Descontar stock de los nuevos almacenamientos
      for (const alId of almacAgregados) {
        console.log(`🔽 Descontando stock de nuevo almacenamiento ID ${alId}`);
        await pool.query(
          `UPDATE inventario SET cantidad = cantidad - 1 WHERE almacenamiento_id = $1 AND cantidad > 0`,
          [alId]
        );
      }

      // Limpiar e insertar nuevos almacenamientos
      await pool.query(`DELETE FROM equipos_almacenamiento WHERE equipo_id = $1`, [id]);
      for (const alId of almacenamientos_ids) {
        console.log(`➕ Insertando almacenamiento ID ${alId} en equipos_almacenamiento`);
        await pool.query(
          `INSERT INTO equipos_almacenamiento (equipo_id, almacenamiento_id) VALUES ($1, $2)`,
          [id, alId]
        );
      }
    } else {
      console.log("⚠️ No se enviaron cambios de almacenamiento, se mantienen los actuales.");
    }

    // 🔹 Actualizar datos del equipo
    console.log("✏️ Actualizando datos básicos del equipo...");
    await pool.query(
      `UPDATE equipos SET nombre = $1, procesador = $2 WHERE id = $3`,
      [nombre, procesador, id]
    );

    console.log("💰 Actualizando precio del inventario del equipo...");
    await pool.query(`UPDATE inventario SET precio = $1 WHERE equipo_id = $2`, [precio, id]);

    await pool.query("COMMIT");
    console.log("✅ [COMMIT] Equipo armado actualizado correctamente");

    return { success: true, message: "Equipo armado actualizado correctamente" };
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ [ROLLBACK] Error al actualizar equipo armado:", error);
    throw error;
  }
}

/** ----------------------------------------------------
 * INSERTAR EQUIPO EN INVENTARIO
 * ---------------------------------------------------- */
async function insertarEquipoEnInventario(
  equipo_id,
  sucursal_id = null,
  precio = 0,
  disponibilidad = true
) {
  const query = `
    INSERT INTO inventario (equipo_id, sucursal_id, tipo, cantidad, estado, disponibilidad, fecha_creacion, precio)
    VALUES ($1, $2, 'Equipo Armado', 1, 'nuevo', $3, NOW(), $4)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    equipo_id,
    sucursal_id,
    disponibilidad,
    precio,
  ]);
  return rows[0];
}

/** ----------------------------------------------------
 * ELIMINAR INVENTARIO
 * ---------------------------------------------------- */
async function eliminarInventario(id) {
  const query = `DELETE FROM inventario WHERE id = $1 RETURNING *;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

/**
 * DESCONTAR STOCK (exclusivo para ventas)
 * ----------------------------------------
 * Disminuye la cantidad de un producto en inventario según su ID.
 */
async function descontarStockVenta({ producto_id, cantidad = 1, sucursal_id }) {
  if (!producto_id || !sucursal_id)
    throw new Error("Debe proporcionar producto_id y sucursal_id");

  // Verificar existencia
  const buscarQuery = `
    SELECT * FROM inventario
    WHERE id = $1 AND sucursal_id = $2
    LIMIT 1;
  `;
  const { rows } = await pool.query(buscarQuery, [producto_id, sucursal_id]);
  const producto = rows[0];

  if (!producto) throw new Error("Producto no encontrado en inventario");

  // Validar stock suficiente
  if (producto.cantidad < cantidad)
    throw new Error(`Stock insuficiente. Disponible: ${producto.cantidad}`);

  // Descontar stock
  const nuevaCantidad = producto.cantidad - cantidad;
  const updateQuery = `
    UPDATE inventario
    SET cantidad = $1
    WHERE id = $2
    RETURNING *;
  `;
  const { rows: updateRows } = await pool.query(updateQuery, [
    nuevaCantidad,
    producto.id,
  ]);

  return updateRows[0];
}

async function agregarOActualizarInventario({
  tipo,
  especificacion,
  cantidad = 1,
  disponibilidad = true,
  estado = "usado",
  precio = 0,
  memoria_ram_id = null,
  almacenamiento_id = null,
  sucursal_id = null,
}) {
  if (!sucursal_id) throw new Error("Debe especificar sucursal_id");

  let buscarQuery, buscarValues;

  if (memoria_ram_id) {
    buscarQuery = `
      SELECT * FROM inventario
      WHERE memoria_ram_id = $1 AND especificacion = $2 AND sucursal_id = $3
      LIMIT 1;
    `;
    buscarValues = [memoria_ram_id, especificacion, sucursal_id];
  } else if (almacenamiento_id) {
    buscarQuery = `
      SELECT * FROM inventario
      WHERE almacenamiento_id = $1 AND especificacion = $2 AND sucursal_id = $3
      LIMIT 1;
    `;
    buscarValues = [almacenamiento_id, especificacion, sucursal_id];
  } else {
    throw new Error("Debe especificar memoria_ram_id o almacenamiento_id");
  }

  const { rows } = await pool.query(buscarQuery, buscarValues);

  if (rows.length > 0) {
    // ✅ Ya existe: actualizar cantidad y precio (opcional)
    const inventario = rows[0];
    const nuevaCantidad = inventario.cantidad + cantidad;

    const updateQuery = `
      UPDATE inventario
      SET cantidad = $1,
          precio = $2
      WHERE id = $3
      RETURNING *;
    `;
    const { rows: updateRows } = await pool.query(updateQuery, [
      nuevaCantidad,
      precio,
      inventario.id,
    ]);
    return updateRows[0];
  } else {
    // 🆕 No existe: crear nuevo registro
    const insertQuery = `
      INSERT INTO inventario 
        (tipo, especificacion, cantidad, disponibilidad, estado, precio, memoria_ram_id, almacenamiento_id, sucursal_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const insertValues = [
      tipo,
      especificacion,
      cantidad,
      disponibilidad,
      estado,
      precio,
      memoria_ram_id,
      almacenamiento_id,
      sucursal_id,
    ];

    const { rows: insertRows } = await pool.query(insertQuery, insertValues);
    return insertRows[0];
  }
}

async function obtenerInventario(sucursalId = null) {
  let query = `
    SELECT 
      i.id,
      i.tipo,
      COALESCE(cm.descripcion, ca.descripcion, i.especificacion) AS descripcion,
      i.cantidad,
      i.precio,
      i.disponibilidad,
      i.estado,
      i.memoria_ram_id,
      i.almacenamiento_id,
      i.sucursal_id,
      i.fecha_creacion
    FROM inventario i
    LEFT JOIN catalogo_memoria_ram cm ON i.memoria_ram_id = cm.id
    LEFT JOIN catalogo_almacenamiento ca ON i.almacenamiento_id = ca.id
    WHERE i.equipo_id IS NULL
  `;

  const values = [];
  if (sucursalId) {
    values.push(sucursalId);
    query += ` AND i.sucursal_id = $${values.length}`;
  }

  query += " ORDER BY i.id ASC;";

  const { rows } = await pool.query(query, values);
  return rows;
}

async function obtenerEquiposArmados(sucursalId = null) {
  let query = `
    SELECT         
      i.id,
      e.nombre,
      e.procesador,
      le.etiqueta,
      e.sucursal_id,
      s.nombre AS sucursal_nombre,
      i.precio,
      i.estado,
      i.cantidad,
      i.disponibilidad,
      -- Agrupa las memorias RAM asociadas
      COALESCE(
        (
          SELECT json_agg(cmr.descripcion)
          FROM equipos_ram er
          JOIN catalogo_memoria_ram cmr ON er.memoria_ram_id = cmr.id
          WHERE er.equipo_id = e.id
        ),
        '[]'
      ) AS memorias_ram,
      -- Agrupa los almacenamientos asociados
      COALESCE(
        (
          SELECT json_agg(ca.descripcion)
          FROM equipos_almacenamiento ea
          JOIN catalogo_almacenamiento ca ON ea.almacenamiento_id = ca.id
          WHERE ea.equipo_id = e.id
        ),
        '[]'
      ) AS almacenamientos
    FROM inventario i
    JOIN equipos e ON i.equipo_id = e.id
    JOIN lotes_etiquetas le ON e.lote_etiqueta_id = le.id
    LEFT JOIN sucursales s ON e.sucursal_id = s.id
    WHERE e.estado_id = 4 -- Armado
  `;

  const values = [];
  if (sucursalId && !isNaN(sucursalId)) {
    values.push(Number(sucursalId));
    query += ` AND e.sucursal_id = $${values.length}`;
  }

  query += " ORDER BY e.id ASC;";

  const { rows } = await pool.query(query, values);
  return rows;
}

/** ----------------------------------------------------
 * OBTENER INVENTARIO POR ID
 * ---------------------------------------------------- */
async function obtenerInventarioPorId(id) {
  const query = `SELECT * FROM inventario WHERE id = $1;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

async function actualizarInventario(
  id,
  {
    tipo,
    especificacion,
    descripcion,
    cantidad,
    disponibilidad,
    estado,
    precio,
    memoria_ram_id = null,
    almacenamiento_id = null,
    sucursal_id = null,
  }
) {
  // 🧩 Si no hay especificacion pero sí descripcion, úsala
  if (!especificacion && descripcion) {
    especificacion = descripcion;
  }

  const updateQuery = `
    UPDATE inventario
    SET tipo = $1,
        especificacion = $2,
        cantidad = $3,
        disponibilidad = $4,
        estado = $5,
        precio = $6,
        memoria_ram_id = $7,
        almacenamiento_id = $8,
        sucursal_id = $9
    WHERE id = $10;
  `;

  const values = [
    tipo,
    especificacion,
    cantidad,
    disponibilidad,
    estado,
    precio,
    memoria_ram_id,
    almacenamiento_id,
    sucursal_id,
    id,
  ];

  await pool.query(updateQuery, values);

  const selectQuery = `
    SELECT 
      i.id,
      i.tipo,
      COALESCE(cm.descripcion, ca.descripcion, i.especificacion) AS descripcion,
      i.cantidad,
      i.disponibilidad,
      i.estado,
      i.precio, -- ✅ incluir el precio en el retorno
      i.memoria_ram_id,
      i.almacenamiento_id,
      i.sucursal_id,
      i.fecha_creacion
    FROM inventario i
    LEFT JOIN catalogo_memoria_ram cm ON i.memoria_ram_id = cm.id
    LEFT JOIN catalogo_almacenamiento ca ON i.almacenamiento_id = ca.id
    WHERE i.id = $1;
  `;

  const { rows } = await pool.query(selectQuery, [id]);
  return rows[0];
}

/** ----------------------------------------------------
 * ELIMINAR INVENTARIO
 * ---------------------------------------------------- */
async function eliminarInventario(id) {
  const query = `DELETE FROM inventario WHERE id = $1 RETURNING *;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

/** ----------------------------------------------------
 * DESCONTAR STOCK
 * ---------------------------------------------------- */
async function descontarStockInventario({
  memoria_ram_id = null,
  almacenamiento_id = null,
  cantidad = 1,
  sucursal_id = null,
}) {
  if (!sucursal_id) throw new Error("Debe especificar sucursal_id");

  let query, id;
  if (memoria_ram_id) {
    query = `SELECT * FROM inventario WHERE memoria_ram_id = $1 AND sucursal_id = $2`;
    id = memoria_ram_id;
  } else if (almacenamiento_id) {
    query = `SELECT * FROM inventario WHERE almacenamiento_id = $1 AND sucursal_id = $2`;
    id = almacenamiento_id;
  } else {
    throw new Error("Debe proporcionar memoria_ram_id o almacenamiento_id");
  }

  const { rows } = await pool.query(query, [id, sucursal_id]);
  const inventario = rows[0];
  if (!inventario) throw new Error("Item inventario no encontrado");

  const nuevaCantidad = Math.max(0, inventario.cantidad - cantidad);
  const updateQuery = `
    UPDATE inventario
    SET cantidad = $1
    WHERE id = $2
    RETURNING *;
  `;
  const { rows: updateRows } = await pool.query(updateQuery, [
    nuevaCantidad,
    inventario.id,
  ]);
  return updateRows[0];
}

/** ----------------------------------------------------
 * AUMENTAR STOCK
 * ---------------------------------------------------- */
async function aumentarStockInventario({
  memoria_ram_id = null,
  almacenamiento_id = null,
  cantidad = 1,
  sucursal_id = null,
}) {
  if (!sucursal_id) throw new Error("Debe especificar sucursal_id");

  let query, id;
  if (memoria_ram_id) {
    query = `SELECT * FROM inventario WHERE memoria_ram_id = $1 AND sucursal_id = $2`;
    id = memoria_ram_id;
  } else if (almacenamiento_id) {
    query = `SELECT * FROM inventario WHERE almacenamiento_id = $1 AND sucursal_id = $2`;
    id = almacenamiento_id;
  } else {
    throw new Error("Debe proporcionar memoria_ram_id o almacenamiento_id");
  }

  const { rows } = await pool.query(query, [id, sucursal_id]);
  const inventario = rows[0];
  if (!inventario) throw new Error("Ítem inventario no encontrado");

  const nuevaCantidad = inventario.cantidad + cantidad;
  const updateQuery = `
    UPDATE inventario SET cantidad = $1 WHERE id = $2 RETURNING *;
  `;
  const { rows: updatedRows } = await pool.query(updateQuery, [
    nuevaCantidad,
    inventario.id,
  ]);
  return updatedRows[0];
}

/** ----------------------------------------------------
 * VALIDAR STOCK
 * ---------------------------------------------------- */
async function validarStockInventario({
  memoria_ram_id = null,
  almacenamiento_id = null,
  cantidad = 1,
  sucursal_id = null,
}) {
  if (!sucursal_id) throw new Error("Debe especificar sucursal_id");

  let query, id;
  if (memoria_ram_id) {
    query = `SELECT cantidad FROM inventario WHERE memoria_ram_id = $1 AND sucursal_id = $2 LIMIT 1`;
    id = memoria_ram_id;
  } else if (almacenamiento_id) {
    query = `SELECT cantidad FROM inventario WHERE almacenamiento_id = $1 AND sucursal_id = $2 LIMIT 1`;
    id = almacenamiento_id;
  } else {
    throw new Error("Debe proporcionar memoria_ram_id o almacenamiento_id");
  }

  const { rows } = await pool.query(query, [id, sucursal_id]);
  if (!rows.length) throw new Error("Item de inventario no encontrado");

  return rows[0].cantidad >= cantidad;
}

async function crearInventarioGeneral({
  tipo,
  descripcion,
  cantidad = 1,
  disponibilidad = true,
  estado = "usado",
  sucursal_id,
  precio = 0, // ✅ nuevo campo
}) {
  if (!tipo || !descripcion || !sucursal_id)
    throw new Error("Faltan datos requeridos");

  const insertQuery = `
    INSERT INTO inventario 
      (tipo, especificacion, cantidad, disponibilidad, estado, sucursal_id, precio)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    tipo,
    descripcion,
    cantidad,
    disponibilidad,
    estado,
    sucursal_id,
    precio, // ✅ incluirlo en la inserción
  ];

  const { rows } = await pool.query(insertQuery, values);
  return rows[0];
}

module.exports = {
  agregarOActualizarInventario,
  obtenerInventario,
  obtenerInventarioPorId,
  actualizarInventario,
  eliminarInventario,
  descontarStockInventario,
  aumentarStockInventario,
  validarStockInventario,
  crearInventarioGeneral,
  descontarStockVenta,
  insertarEquipoEnInventario,
  eliminarInventario,
  obtenerEquiposArmados,
  actualizarEquipoArmado,
  obtenerMemoriasRamDisponibles,
  obtenerAlmacenamientosDisponibles,
};
