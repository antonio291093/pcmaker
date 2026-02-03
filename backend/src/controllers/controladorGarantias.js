const { generarGarantiaPDF } = require('../utils/pdf/generarGarantia')
const fs = require('fs')
const path = require('path')
const pool = require('../config/db')

exports.generarGarantia = async (req, res) => {
  try {
    const { venta_id, cliente, equipos, total } = req.body

    if (!venta_id || !cliente || !equipos || equipos.length === 0) {
      return res.status(400).json({
        message: 'Datos incompletos para generar garantía',
      })
    }

    const fileName = `garantia_venta_${venta_id}.pdf`
    const uploadDir = path.join(__dirname, '../uploads/garantias')
    const filePath = path.join(uploadDir, fileName)

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const ventaResult = await pool.query(
      'SELECT fecha_venta FROM ventas WHERE id = $1',
      [venta_id]
    )

    if (!ventaResult.rows.length) {
      return res.status(404).json({ message: 'Venta no encontrada' })
    }

    const fechaVenta = new Date(ventaResult.rows[0].fecha_venta)
    .toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })    

    const pdfBytes = await generarGarantiaPDF({
      cliente,
      equipos,
      total,
      fecha: fechaVenta,
    })

    fs.writeFileSync(filePath, Buffer.from(pdfBytes))

    await pool.query(
      `
      INSERT INTO garantias (venta_id, cliente, archivo)
      VALUES ($1, $2, $3)
      `,
      [venta_id, cliente, fileName]
    )

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename=${fileName}`
    )

    res.send(Buffer.from(pdfBytes))

  } catch (error) {
    console.error('Error al generar garantía:', error)
    res.status(500).json({
      message: 'Error al generar PDF de garantía',
    })
  }
}

exports.generarGarantiaPorVenta = async (req, res) => {
  try {
    const { ventaId } = req.params

    // 1️⃣ Obtener venta
    const ventaResult = await pool.query(
      `
      SELECT id, cliente, fecha_venta
      FROM ventas
      WHERE id = $1
      `,
      [ventaId]
    )

    if (!ventaResult.rows.length) {
      return res.status(404).json({ message: 'Venta no encontrada' })
    }

    const venta = ventaResult.rows[0]

    // 2️⃣ Intentar obtener equipos ARMADOS
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

    let equiposRaw = []

    // 3️⃣ Si NO hay equipos armados → intentar RECEPCIÓN DIRECTA
    if (equiposArmadosResult.rows.length > 0) {
      equiposRaw = equiposArmadosResult.rows
    } else {
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

      if (!recepcionDirectaResult.rows.length) {
        return res
          .status(404)
          .json({ message: 'La venta no tiene equipos con garantía' })
      }

      equiposRaw = recepcionDirectaResult.rows
    }

    // 4️⃣ Normalizar salida (CLAVE)
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

    // 5️⃣ Formatear fecha
    const fechaVenta = new Date(venta.fecha_venta).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    // 6️⃣ Generar PDF
    const pdfBytes = await generarGarantiaPDF({
      cliente: venta.cliente,
      equipos,
      total,
      fecha: fechaVenta,
    })

    // 7️⃣ Responder
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

