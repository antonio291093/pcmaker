const { generarGarantiaPDF } = require('../utils/pdf/generarGarantia')
const { obtenerDatosGarantia } = require('../models/garantias')

exports.generarGarantiaPorVenta = async (req, res) => {
  try {
    const { ventaId } = req.params

    const datos = await obtenerDatosGarantia(ventaId)

    if (!datos) {
      return res.status(404).json({ message: 'Venta no encontrada' })
    }

    const { venta, equiposRaw } = datos

    if (!equiposRaw.length) {
      return res
        .status(404)
        .json({ message: 'La venta no tiene productos con garantía' })
    }

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

    const total = equipos.reduce((acc, e) => acc + e.precio * e.cantidad, 0)

    const fechaVenta = new Date(venta.fecha_venta).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    const pdfBytes = await generarGarantiaPDF({
      sucursal_id: venta.sucursal_id,
      cliente: venta.cliente,
      equipos,
      total,
      fecha: fechaVenta,
    })

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
