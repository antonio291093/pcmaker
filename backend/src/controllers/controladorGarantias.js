const { generarGarantiaPDF } = require('../utils/pdf/generarGarantia')
const fs = require('fs')
const path = require('path')
const pool = require('../config/db')

exports.generarGarantiaPorVenta = async (req, res) => {
  try {
    const { ventaId } = req.params

    // 1️⃣ Obtener venta
    const ventaResult = await pool.query(
      `
      SELECT id, cliente, fecha_venta, sucursal_id
      FROM ventas
      WHERE id = $1
      `,
      [ventaId]
    )

    if (!ventaResult.rows.length) {
      return res.status(404).json({ message: 'Venta no encontrada' })
    }

    const venta = ventaResult.rows[0]

    let equiposRaw = []

    // 2️⃣ Equipos ARMADOS
    const equiposArmadosResult = await pool.query(
      `
      SELECT
        d.cantidad,
        d.precio_unitario AS precio,

        e.nombre AS descripcion,
        e.procesador,

        COALESCE(
          (
            SELECT json_agg(
              substring(cmr.descripcion FROM '([0-9]+[ ]*GB)')
            )
            FROM equipos_ram er
            JOIN catalogo_memoria_ram cmr
              ON er.memoria_ram_id = cmr.id
            WHERE er.equipo_id = e.id
          ),
          '[]'
        ) AS memorias_ram,

        COALESCE(
          (
            SELECT json_agg(ca.descripcion)
            FROM equipos_almacenamiento ea
            JOIN catalogo_almacenamiento ca
              ON ea.almacenamiento_id = ca.id
            WHERE ea.equipo_id = e.id
          ),
          '[]'
        ) AS almacenamientos

      FROM venta_detalle d
      JOIN inventario i ON d.producto_id = i.id
      JOIN equipos e ON i.equipo_id = e.id
      WHERE d.venta_id = $1
        AND i.equipo_id IS NOT NULL
      `,
      [ventaId]
    )

    if (equiposArmadosResult.rows.length > 0) {
      equiposRaw = [...equiposRaw, ...equiposArmadosResult.rows]
    }

    // 3️⃣ Equipos de RECEPCIÓN DIRECTA
    const recepcionDirectaResult = await pool.query(
      `
      SELECT
        d.cantidad,
        d.precio_unitario AS precio,

        i.modelo AS descripcion,
        i.procesador,
        CONCAT(i.ram_gb, 'GB ', i.ram_tipo) AS ram,
        CONCAT(i.almacenamiento_gb, 'GB ', i.almacenamiento_tipo) AS disco

      FROM venta_detalle d
      JOIN inventario_especificaciones i
        ON d.producto_id = i.inventario_id
      WHERE d.venta_id = $1
      `,
      [ventaId]
    )

    if (recepcionDirectaResult.rows.length > 0) {
      equiposRaw = [...equiposRaw, ...recepcionDirectaResult.rows]
    }

    // 4️⃣ PRODUCTOS DE INVENTARIO (teclado, mouse, audífonos, etc)
    const productosInventarioResult = await pool.query(
      `
      SELECT
        d.cantidad,
        d.precio_unitario AS precio,
        i.especificacion AS descripcion
      FROM venta_detalle d
      JOIN inventario i
        ON d.producto_id = i.id
      WHERE d.venta_id = $1
        AND i.equipo_id IS NULL
        AND i.especificacion IS NOT NULL
      `,
      [ventaId]
    )

    if (productosInventarioResult.rows.length > 0) {
      equiposRaw = [
        ...equiposRaw,
        ...productosInventarioResult.rows.map(p => ({
          cantidad: p.cantidad,
          precio: p.precio,
          descripcion: p.descripcion,
          procesador: '',
          memorias_ram: [],
          almacenamientos: [],
          ram: '',
          disco: ''
        }))
      ]
    }

    if (!equiposRaw.length) {
      return res
        .status(404)
        .json({ message: 'La venta no tiene productos con garantía' })
    }

    // 5️⃣ Normalizar salida
    const equipos = equiposRaw.map(e => ({
      cantidad: e.cantidad,
      descripcion: e.descripcion,
      procesador: e.procesador || '',
      ram: Array.isArray(e.memorias_ram)
        ? e.memorias_ram.join(', ')
        : e.ram || '',
      disco: Array.isArray(e.almacenamientos)
        ? e.almacenamientos.join(', ')
        : e.disco || '',
      precio: Number(e.precio)
    }))

    const total = equipos.reduce(
      (acc, e) => acc + e.precio * e.cantidad,
      0
    )

    // 6️⃣ Formatear fecha
    const fechaVenta = new Date(venta.fecha_venta).toLocaleDateString(
      'es-MX',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    )

    // 7️⃣ Generar PDF
    const pdfBytes = await generarGarantiaPDF({
      sucursal_id: venta.sucursal_id,
      cliente: venta.cliente,
      equipos,
      total,
      fecha: fechaVenta,
    })

    // 8️⃣ Responder
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename=garantia_venta_${ventaId}.pdf`
    )

    res.send(Buffer.from(pdfBytes))

  } catch (error) {
    console.error('Error al generar garantía por venta:', error)
    res.status(500).json({ message: 'Error al generar garantía' })
  }
}
