const pool = require("../config/db");
const { generarBarcodeBase64 } = require('../utils/barcode');

async function traspasarInventario(id, sucursal_id) {
  const updateQuery = `
    UPDATE inventario
    SET sucursal_id = $1
    WHERE id = $2
    RETURNING 
      id,
      tipo,
      especificacion,
      cantidad,
      disponibilidad,
      estado,
      precio,
      memoria_ram_id,
      almacenamiento_id,
      sucursal_id,
      fecha_creacion,
      sku,
      es_codigo_generado;
  `;

  const { rows } = await pool.query(updateQuery, [sucursal_id, id]);

  return rows[0];
}

async function generarSkuYBarcode({ sucursal_id }) {
  const fecha = new Date();

  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mi = String(fecha.getMinutes()).padStart(2, '0');
  const ss = String(fecha.getSeconds()).padStart(2, '0');

  // 🔢 consecutivo por segundo y sucursal
  const { rows } = await pool.query(
    `
    SELECT COUNT(*) FROM inventario
    WHERE sku LIKE $1 AND sucursal_id = $2
    `,
    [`${yyyy}${mm}${dd}${hh}${mi}${ss}%`, sucursal_id]
  );

  const consecutivo = String(Number(rows[0].count) + 1).padStart(3, '0');

  const skuFinal = `${yyyy}${mm}${dd}${hh}${mi}${ss}${consecutivo}`;

  // 🧾 Barcode
  const barcode = await generarBarcodeBase64(skuFinal);

  return {
    sku: skuFinal,
    barcode,
    es_codigo_generado: true
  };
}

async function obtenerStockEquipo(equipoId) {
  const query = `
    SELECT cantidad
    FROM inventario
    WHERE equipo_id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [equipoId]);

  if (rows.length === 0) return 0;
  return rows[0].cantidad;
}

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
  console.log("📦 ID de inventario:", id);
  console.log("📩 Datos recibidos:", data);

  try {
    await pool.query("BEGIN");

    const { rows } = await pool.query(
      `SELECT equipo_id FROM inventario WHERE id = $1`,
      [id]
    );

    if (!rows.length || !rows[0].equipo_id) {
      throw new Error("No se encontró equipo_id para el inventario proporcionado");
    }

    const equipoId = rows[0].equipo_id;

    console.log("🧩 equipo_id resuelto:", equipoId);

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
      [equipoId]
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
      await pool.query(`DELETE FROM equipos_ram WHERE equipo_id = $1`, [equipoId]);
      for (const ramId of memorias_ram_ids) {
        console.log(`➕ Insertando RAM ID ${ramId} en equipos_ram`);
        await pool.query(
          `INSERT INTO equipos_ram (equipo_id, memoria_ram_id) VALUES ($1, $2)`,
          [equipoId, ramId]
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
      await pool.query(`DELETE FROM equipos_almacenamiento WHERE equipo_id = $1`, [equipoId]);
      for (const alId of almacenamientos_ids) {
        console.log(`➕ Insertando almacenamiento ID ${alId} en equipos_almacenamiento`);
        await pool.query(
          `INSERT INTO equipos_almacenamiento (equipo_id, almacenamiento_id) VALUES ($1, $2)`,
          [equipoId, alId]
        );
      }
    } else {
      console.log("⚠️ No se enviaron cambios de almacenamiento, se mantienen los actuales.");
    }

    // 🔹 Actualizar datos del equipo
    console.log("✏️ Actualizando datos básicos del equipo...");
    await pool.query(
      `UPDATE equipos SET nombre = $1, procesador = $2 WHERE id = $3`,
      [nombre, procesador, equipoId]
    );

    console.log("💰 Actualizando precio del inventario del equipo...");
    await pool.query(`UPDATE inventario SET precio = $1 WHERE equipo_id = $2`, [precio, equipoId]);

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
    INSERT INTO inventario (equipo_id, sucursal_id, tipo, cantidad, estado, disponibilidad, fecha_creacion, precio, origen)
    VALUES ($1, $2, 'Equipo Armado', 1, 'nuevo', $3, NOW(), $4, 'tecnico')
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

async function insertarInventarioRecepcionDirecta({
  sucursal_id,
  cantidad,
  precio = 0,

  modelo,
  procesador,
  ram_gb,
  ram_tipo,
  almacenamiento_gb,
  almacenamiento_tipo,
  observaciones
}) {
  const client = await pool.connect();

  try {
    if (!sucursal_id) throw new Error("sucursal_id es obligatorio");

    await client.query("BEGIN");

    // 🧠 SKU + Barcode
    const { sku, barcode, es_codigo_generado } =
      await generarSkuYBarcode({ sucursal_id });

    // 1️⃣ Inventario
    const inventarioQuery = `
      INSERT INTO inventario (
        sucursal_id,
        tipo,
        cantidad,
        estado,
        disponibilidad,
        fecha_creacion,
        precio,
        origen,
        sku,
        barcode,
        es_codigo_generado
      )
      VALUES (
        $1,
        'Equipo',
        $2,
        'nuevo',
        true,
        NOW(),
        $3,
        'recepcion_directa',
        $4,
        $5,
        $6
      )
      RETURNING *;
    `;

    const inventarioResult = await client.query(inventarioQuery, [
      sucursal_id,
      cantidad,
      precio,
      sku,
      barcode,
      es_codigo_generado
    ]);

    const inventario = inventarioResult.rows[0];

    // 2️⃣ Especificaciones
    const especificacionesQuery = `
      INSERT INTO inventario_especificaciones (
        inventario_id,
        modelo,
        procesador,
        ram_gb,
        ram_tipo,
        almacenamiento_gb,
        almacenamiento_tipo,
        observaciones
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;
    `;

    await client.query(especificacionesQuery, [
      inventario.id,
      modelo,
      procesador,
      ram_gb,
      ram_tipo,
      almacenamiento_gb,
      almacenamiento_tipo,
      observaciones || null
    ]);

    await client.query("COMMIT");

    return inventario;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
      i.fecha_creacion,
      i.es_codigo_generado,
      i.barcode,
      i.sku
    FROM inventario i
    LEFT JOIN catalogo_memoria_ram cm ON i.memoria_ram_id = cm.id
    LEFT JOIN catalogo_almacenamiento ca ON i.almacenamiento_id = ca.id
    WHERE i.equipo_id IS NULL
    AND i.origen <> 'recepcion_directa'
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
      le.serie,
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
    sku = null,                     
    es_codigo_generado = false,    
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
        sucursal_id = $9,
        sku = $10,
        es_codigo_generado = $11
    WHERE id = $12;
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
    sku,
    es_codigo_generado,
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
      i.fecha_creacion,
      i.sku,
      i.es_codigo_generado
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
  sku = null,
  cantidad = 1,
  disponibilidad = true,
  estado = "usado",
  sucursal_id,
  precio = 0,
}) {
  if (!tipo || !descripcion || !sucursal_id) {
    throw new Error("Faltan datos requeridos");
  }

  let skuFinal = sku;
  let barcode = null;
  let esGenerado = false;

  // 🧠 1. Generar SKU + barcode SOLO si no viene SKU
  if (!skuFinal) {
    const generado = await generarSkuYBarcode({ sucursal_id });
    skuFinal = generado.sku;
    barcode = generado.barcode;
    esGenerado = generado.es_codigo_generado;
  } else {
    // 🧾 Si el SKU viene manual, igual generamos barcode
    barcode = await generarBarcodeBase64(skuFinal);
  }

  // 🔎 2. Verificar duplicado (solo inventario general)
  const existe = await pool.query(
    `
    SELECT id FROM inventario
    WHERE sku = $1
      AND sucursal_id = $2
      AND equipo_id IS NULL
    `,
    [skuFinal, sucursal_id]
  );

  // 🔁 3. Si existe, solo sumar cantidad
  if (existe.rows.length > 0) {
    await pool.query(
      `
      UPDATE inventario
      SET cantidad = cantidad + $1
      WHERE id = $2
      `,
      [cantidad, existe.rows[0].id]
    );

    const { rows } = await pool.query(
      `SELECT * FROM inventario WHERE id = $1`,
      [existe.rows[0].id]
    );

    return rows[0];
  }

  // 🆕 4. Insertar nuevo artículo
  const insertQuery = `
    INSERT INTO inventario (
      tipo,
      especificacion,
      cantidad,
      disponibilidad,
      estado,
      sucursal_id,
      precio,
      sku,
      es_codigo_generado,
      barcode
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *;
  `;

  const values = [
    tipo,
    descripcion,
    cantidad,
    disponibilidad,
    estado,
    sucursal_id,
    precio,
    skuFinal,
    esGenerado,
    barcode,
  ];

  const { rows } = await pool.query(insertQuery, values);
  return rows[0];
}

async function obtenerInventarioRecepcionDirecta(sucursalId = null) {
  let query = `
    SELECT
      i.id,

      ie.modelo        AS nombre,
      ie.procesador,

      -- 🔑 campos reales
      i.sku,
      i.barcode,
      TRUE             AS es_codigo_generado,

      -- etiquetas visuales
      i.sku            AS etiqueta,
      i.sku            AS serie,

      i.sucursal_id,
      s.nombre         AS sucursal_nombre,

      i.precio,
      i.estado,
      i.cantidad,
      i.disponibilidad,

      -- 🧠 RAM
      COALESCE(
        json_agg(
          CONCAT(
            ie.ram_tipo,
            ' - ',
            ie.ram_gb,
            ' GB'
          )
        ) FILTER (WHERE ie.ram_gb IS NOT NULL),
        '[]'
      ) AS memorias_ram,

      -- 💾 Almacenamiento
      COALESCE(
        json_agg(
          CONCAT(
            ie.almacenamiento_tipo,
            ' ',
            ie.almacenamiento_gb,
            ' GB'
          )
        ) FILTER (WHERE ie.almacenamiento_gb IS NOT NULL),
        '[]'
      ) AS almacenamientos

    FROM inventario i
    JOIN inventario_especificaciones ie
      ON ie.inventario_id = i.id
    LEFT JOIN sucursales s
      ON s.id = i.sucursal_id

    WHERE i.origen = 'recepcion_directa'
  `;

  const values = [];

  if (sucursalId) {
    values.push(sucursalId);
    query += ` AND i.sucursal_id = $${values.length}`;
  }

  query += `
    GROUP BY
      i.id,
      ie.modelo,
      ie.procesador,
      s.nombre
    ORDER BY i.id DESC;
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}


async function obtenerEquipoPorInventario(inventarioId) {
  // 1️⃣ Intentar EQUIPO ARMADO
  const equipoArmadoQuery = `
    SELECT 
      e.id,
      e.nombre,
      e.procesador,
      le.etiqueta,
      e.sucursal_id,
      cs.nombre AS sucursal_nombre,
      i.origen,
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

    FROM inventario i
    JOIN equipos e ON i.equipo_id = e.id
    JOIN lotes_etiquetas le ON e.lote_etiqueta_id = le.id
    LEFT JOIN sucursales cs ON e.sucursal_id = cs.id
    WHERE i.id = $1
    LIMIT 1;
  `

  const equipoArmadoResult = await pool.query(equipoArmadoQuery, [inventarioId])

  if (equipoArmadoResult.rows.length > 0) {
    return equipoArmadoResult.rows[0]
  }

  // 2️⃣ Fallback → RECEPCIÓN DIRECTA
  const recepcionDirectaQuery = `
    SELECT
      i.inventario_id AS id,
      i.modelo AS nombre,
      i.procesador,
      NULL AS etiqueta,
      inv.sucursal_id,
      cs.nombre AS sucursal_nombre,
      inv.origen,
      json_build_array(
        CONCAT(i.ram_gb, 'GB ', i.ram_tipo)
      ) AS memorias_ram,

      json_build_array(
        CONCAT(i.almacenamiento_gb, 'GB ', i.almacenamiento_tipo)
      ) AS almacenamientos

    FROM inventario_especificaciones i
    JOIN inventario inv ON i.inventario_id = inv.id
    LEFT JOIN sucursales cs ON inv.sucursal_id = cs.id
    WHERE i.inventario_id = $1
    LIMIT 1;
  `

  const recepcionDirectaResult = await pool.query(
    recepcionDirectaQuery,
    [inventarioId]
  )

  if (recepcionDirectaResult.rows.length > 0) {
    return recepcionDirectaResult.rows[0]
  }

  return null
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
  obtenerStockEquipo,
  insertarInventarioRecepcionDirecta,
  obtenerInventarioRecepcionDirecta,
  obtenerEquipoPorInventario,
  traspasarInventario,
};