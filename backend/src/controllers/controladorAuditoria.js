const { obtenerAuditoriaInventario } = require('../models/auditoria')

exports.auditoriaInventario = async (req, res) => {
  try {
    const {
      inventario_id,
      usuario_id,
      accion,
      campo,
      fecha_inicio,
      fecha_fin,
      page  = 1,
      limit = 50,
    } = req.query

    const limitNum  = Math.min(parseInt(limit) || 50, 200)
    const pageNum   = Math.max(parseInt(page)  || 1,  1)
    const offset    = (pageNum - 1) * limitNum

    // fecha_fin se extiende al final del día para incluir todos los registros de esa fecha
    const fechaFinAjustada = fecha_fin ? `${fecha_fin} 23:59:59` : null

    const resultado = await obtenerAuditoriaInventario({
      inventario_id: inventario_id || null,
      usuario_id:    usuario_id    || null,
      accion:        accion        || null,
      campo:         campo         || null,
      fecha_inicio:  fecha_inicio  || null,
      fecha_fin:     fechaFinAjustada,
      limit:         limitNum,
      offset,
    })

    res.json({
      registros:   resultado.registros,
      total:       resultado.total,
      page:        pageNum,
      limit:       limitNum,
      totalPages:  Math.ceil(resultado.total / limitNum),
    })
  } catch (error) {
    console.error('Error auditoría inventario:', error)
    res.status(500).json({ message: 'Error al obtener auditoría' })
  }
}
