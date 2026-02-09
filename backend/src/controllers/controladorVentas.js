const { registrarVenta, obtenerReporteVentas } = require("../models/ventas");
const { generarTicketVentaPDF } = require('../utils/pdf/generarTicketVenta')
const pool = require('../config/db')

exports.generarTicketVenta = async (req, res) => {
  try {
    const { ventaId } = req.params

    // 1️⃣ Venta (fuente única)
    const ventaResult = await pool.query(
      `
      SELECT
        v.id,
        v.cliente,
        v.telefono,
        v.correo,
        v.total,
        v.fecha_venta,
        u.nombre AS vendedor
      FROM ventas v
      LEFT JOIN usuarios u ON v.user_venta = u.id
      WHERE v.id = $1
      `,
      [ventaId]
    )

    if (!ventaResult.rows.length) {
      return res.status(404).json({ message: 'Venta no encontrada' })
    }

    const venta = ventaResult.rows[0]

    //console.log('🧾 VENTA OBTENIDA:', venta)

    const productosResult = await pool.query(
      `
      SELECT
        d.cantidad,
        d.precio_unitario AS precio,

        -- 🔹 DESCRIPCIÓN UNIFICADA (TODOS LOS CASOS)
        CASE
          -- Equipo armado
          WHEN i.equipo_id IS NOT NULL THEN e.nombre

          -- Recepción directa
          WHEN ie.inventario_id IS NOT NULL THEN ie.modelo

          -- Artículo genérico de inventario
          WHEN i.id IS NOT NULL THEN i.especificacion

          -- Mantenimiento / servicio
          ELSE cm.descripcion
        END AS descripcion

      FROM venta_detalle d

      JOIN ventas v ON v.id = d.venta_id

      -- Inventario base
      LEFT JOIN inventario i ON i.id = d.producto_id
      LEFT JOIN equipos e ON e.id = i.equipo_id

      -- Recepción directa
      LEFT JOIN inventario_especificaciones ie
        ON ie.inventario_id = d.producto_id

      -- Servicios
      LEFT JOIN mantenimientos m ON m.id = d.mantenimiento_id
      LEFT JOIN catalogo_mantenimiento cm ON cm.id = m.catalogo_id

      WHERE d.venta_id = $1
      `,
      [ventaId]
    )
    

    if (!productosResult.rows.length) {
      return res
        .status(404)
        .json({ message: 'La venta no tiene productos' })
    }

    //console.log('📦 PRODUCTOS RAW:', productosResult.rows)

    const items = productosResult.rows.map(p => ({
      descripcion: p.descripcion,
      cantidad: p.cantidad,
      precio_unitario: Number(p.precio),
      total: Number(p.precio) * p.cantidad,
    }))

    //console.log('🧮 ITEMS NORMALIZADOS:', items)

    // 4️⃣ Fecha formateada
    const fecha = new Date(venta.fecha_venta).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    // 5️⃣ Generar PDF
    const pdfBytes = await generarTicketVentaPDF({
      ventaId,
      fecha,
      cliente: venta.cliente,
      telefono: venta.telefono || '',
      email: venta.correo || '',
      vendedor: venta.vendedor || '',
      items,
      total: venta.total,
    })

    // 6️⃣ Respuesta
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename=ticket_venta_${ventaId}.pdf`
    )

    res.send(Buffer.from(pdfBytes))

  } catch (error) {
    console.error('Error al generar ticket:', error)
    res.status(500).json({
      message: 'Error al generar ticket de venta',
    })
  }
}

exports.crearVenta = async (req, res) => {
  try {
    const {
      cliente,
      telefono,
      correo,
      metodo_pago,
      productos = [],
      servicios = [],
      observaciones,
      usuario_id,
      sucursal_id,
      total
    } = req.body;

    if (!cliente) {
      return res.status(400).json({
        message: "El cliente es obligatorio"
      });
    }

    if (productos.length === 0 && servicios.length === 0) {
      return res.status(400).json({
        message: "Debes registrar al menos un producto o un servicio"
      });
    }

    const { venta_id } = await registrarVenta({
      cliente,
      telefono,
      correo,
      metodo_pago,
      productos,
      servicios,
      observaciones,
      usuario_id,
      sucursal_id,
      total
    });

    res.status(201).json({
      message: "Venta registrada correctamente",
      venta_id
    });

  } catch (error) {
    console.error("Error al registrar venta:", error);
    res.status(500).json({
      message: error.message || "Error al registrar venta"
    });
  }
};

exports.reporteVentas = async (req, res) => {
  try {
    const { from, to } = req.query;
    const sucursal_id = req.user?.sucursal_id || null;

    if (!from || !to) {
      return res.status(400).json({ message: 'Fechas requeridas' });
    }

    const data = await obtenerReporteVentas({ from, to, sucursal_id });
    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar reporte' });
  }
};
