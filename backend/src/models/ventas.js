const pool = require("../config/db");
const { CASE_DESCRIPCION_VENTA } = require("../utils/sqlFragments");
const { setAuditContext } = require("../utils/auditContext");
const { descontarStockVenta } = require("./inventario");
const { registrarMovimiento } = require("./caja");
const { crearComision } = require("./comisiones");
const { resolverOCrearCliente } = require("./clientes");

async function registrarVenta({
  cliente,
  telefono,
  correo,
  pagos = [],
  productos = [],
  servicios = [],
  observaciones,
  usuario_id,
  sucursal_id,
  requiere_factura,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 🔹 Calcular subtotal productos
    const subtotalProductos = productos.reduce((acc, p) => {
      return acc + p.cantidad * p.precio_unitario;
    }, 0);

    // 🔹 Calcular subtotal servicios
    let subtotalServicios = 0;

    if (servicios.length > 0) {
      for (const mantenimientoId of servicios) {
        const { rows } = await client.query(
          `
          SELECT
            cm.costo AS precio,
            m.estado
          FROM mantenimientos m
          JOIN catalogo_mantenimiento cm
            ON cm.id = m.catalogo_id
          WHERE m.id = $1
          `,
          [mantenimientoId],
        );

        if (!rows.length) {
          throw new Error(`Mantenimiento ${mantenimientoId} no existe`);
        }

        const { precio, estado } = rows[0];

        if (estado !== "pendiente") {
          throw new Error(`Mantenimiento ${mantenimientoId} ya fue cobrado`);
        }

        subtotalServicios += Number(precio);
      }
    }

    const subtotalReal = subtotalProductos + subtotalServicios;

    const ivaReal = requiere_factura
      ? Number((subtotalReal * 0.16).toFixed(2))
      : 0;

    const totalReal = Number((subtotalReal + ivaReal).toFixed(2));

    // 1️⃣ Insertar encabezado
    const ventaResult = await client.query(
      `
      INSERT INTO ventas (
        cliente,
        telefono,
        correo,        
        observaciones,
        user_venta,
        sucursal_id,
        subtotal,
        iva,
        total,
        requiere_factura
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id;
      `,
      [
        cliente,
        telefono || null,
        correo || null,
        observaciones || "",
        usuario_id,
        sucursal_id,
        subtotalReal,
        ivaReal,
        totalReal,
        requiere_factura || false,
      ],
    );

    const ventaId = ventaResult.rows[0].id;

    await setAuditContext(client, { userId: usuario_id, contexto: 'venta', referenciaId: ventaId });

    // D) Resolver o crear cliente y vincular a la venta
    const clienteId = await resolverOCrearCliente(
      { nombre: cliente, telefono, correo, sucursal_id },
      client
    );
    await client.query(
      "UPDATE ventas SET cliente_id = $1 WHERE id = $2",
      [clienteId, ventaId]
    );

    // 2️⃣ Registrar pagos
    for (const pago of pagos) {
      await client.query(
        `
        INSERT INTO ventas_pagos (
          venta_id,
          metodo_pago,
          monto
        )
        VALUES ($1,$2,$3)
        `,
        [ventaId, pago.metodo, pago.monto],
      );
    }

    // 2️⃣ Insertar productos
    for (const producto of productos) {
      const subtotalProducto = producto.cantidad * producto.precio_unitario;

      await client.query(
        `
        INSERT INTO venta_detalle (
          venta_id,
          tipo,
          producto_id,
          cantidad,
          precio_unitario,
          subtotal
        )
        VALUES ($1,'producto',$2,$3,$4,$5)
        `,
        [
          ventaId,
          producto.id,
          producto.cantidad,
          producto.precio_unitario,
          subtotalProducto,
        ],
      );
    }

    // 3️⃣ Insertar servicios
    for (const mantenimientoId of servicios) {
      const { rows } = await client.query(
        `
        SELECT
          cm.costo AS precio,
          m.estado
        FROM mantenimientos m
        JOIN catalogo_mantenimiento cm
          ON cm.id = m.catalogo_id
        WHERE m.id = $1
        `,
        [mantenimientoId],
      );

      const { precio } = rows[0];

      await client.query(
        `
        INSERT INTO venta_detalle (
          venta_id,
          tipo,
          mantenimiento_id,
          equipo_id,
          cantidad,
          precio_unitario,
          subtotal
        )
        VALUES ($1,'servicio',$2,NULL,1,$3,$3)
        `,
        [ventaId, mantenimientoId, precio],
      );

      await client.query(
        `
        UPDATE mantenimientos
        SET estado = 'cobrado'
        WHERE id = $1
        `,
        [mantenimientoId],
      );
    }

    // A) Descontar stock de cada producto
    for (const producto of productos) {
      await descontarStockVenta(
        { producto_id: producto.id, cantidad: producto.cantidad, sucursal_id, userId: usuario_id },
        client
      );
    }

    // B) Registrar movimiento en caja
    await registrarMovimiento(
      {
        tipo: "venta",
        monto: totalReal,
        descripcion: `Venta #${ventaId} - Cliente: ${cliente}`,
        sucursal_id,
        usuario_id,
      },
      client
    );

    // C) Comisión del vendedor (solo si hay productos)
    if (productos.length > 0) {
      const configComision = await client.query(
        "SELECT valor FROM configuraciones WHERE nombre = 'comision_ventas' LIMIT 1;"
      );
      const tasa =
        configComision.rows.length > 0
          ? parseFloat(configComision.rows[0].valor)
          : 0.03;
      if (!isNaN(tasa) && tasa > 0) {
        const montoComision = Number((subtotalProductos * tasa).toFixed(2));
        await crearComision(
          {
            usuario_id,
            venta_id: ventaId,
            mantenimiento_id: null,
            monto: montoComision,
            fecha_creacion: new Date(),
            equipo_id: null,
          },
          client
        );
      }
    }

    await client.query("COMMIT");

    return {
      venta_id: ventaId,
      subtotal: subtotalReal,
      iva: ivaReal,
      total: totalReal,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error en registrarVenta:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function obtenerTotalesPorMetodo(fecha, sucursal_id) {
  const query = `
    SELECT
      COALESCE(SUM(total), 0) AS total_ventas,

      COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) AS total_efectivo,
      COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) AS total_transferencia,
      COALESCE(SUM(CASE WHEN metodo_pago = 'terminal' THEN total ELSE 0 END), 0) AS total_terminal,
      COALESCE(SUM(CASE WHEN metodo_pago = 'facturacion' THEN total ELSE 0 END), 0) AS total_facturacion
    FROM ventas
    WHERE DATE(fecha_venta) = $1
      AND sucursal_id = $2
  `;

  const { rows } = await pool.query(query, [fecha, sucursal_id]);
  return rows[0];
}

async function obtenerDatosTicket(ventaId) {
  const ventaResult = await pool.query(
    `
    SELECT
      v.id,
      v.cliente,
      v.telefono,
      v.correo,
      v.subtotal,
      v.iva,
      v.total,
      v.requiere_factura,
      v.fecha_venta,
      v.sucursal_id,
      u.nombre AS vendedor
    FROM ventas v
    LEFT JOIN usuarios u ON v.user_venta = u.id
    WHERE v.id = $1
    `,
    [ventaId],
  );

  if (!ventaResult.rows.length) return null;

  const venta = ventaResult.rows[0];

  const itemsResult = await pool.query(
    `
    SELECT
      d.cantidad,
      d.precio_unitario AS precio,
      ${CASE_DESCRIPCION_VENTA} AS descripcion
    FROM venta_detalle d
    JOIN ventas v ON v.id = d.venta_id
    LEFT JOIN inventario i ON i.id = d.producto_id
    LEFT JOIN equipos e ON e.id = i.equipo_id
    LEFT JOIN inventario_especificaciones ie ON ie.inventario_id = d.producto_id
    LEFT JOIN mantenimientos m ON m.id = d.mantenimiento_id
    LEFT JOIN catalogo_mantenimiento cm ON cm.id = m.catalogo_id
    WHERE d.venta_id = $1
    `,
    [ventaId],
  );

  return { venta, items: itemsResult.rows };
}

module.exports = {
  registrarVenta,
  obtenerTotalesPorMetodo,
  obtenerDatosTicket,
};
