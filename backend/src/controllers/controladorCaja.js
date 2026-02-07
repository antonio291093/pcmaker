const {
  registrarMovimiento,
  obtenerResumenPorFecha,
  crearCorteCaja,
  obtenerCortes,
  abrirDiaOperativo,
  obtenerDiaAbierto,
  cerrarDiaOperativo,
  obtenerCortePendiente,
  obtenerMovimientosPorDia,
} = require('../models/caja')

const { obtenerTotalesPorMetodo } = require('../models/ventas')

// ==========================
// ABRIR DÍA OPERATIVO
// ==========================
exports.abrirDia = async (req, res) => {
  try {
    const usuario_id = req.userId
    const { sucursal_id } = req.body

    if (!usuario_id || !sucursal_id) {
      return res.status(400).json({ message: 'Datos incompletos' })
    }

    await abrirDiaOperativo(usuario_id, sucursal_id)

    res.json({ message: 'Día operativo activo' })
  } catch (error) {
    console.error('Error al abrir día:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

// ==========================
// REGISTRAR MOVIMIENTO
// ==========================
exports.crearMovimiento = async (req, res) => {
  try {
    const {
      tipo,
      monto,
      descripcion,
      sucursal_id,
      metodo_pago
    } = req.body

    const usuario_id = req.userId || null

    if (!tipo || !monto || !sucursal_id) {
      return res.status(400).json({
        message: 'Tipo, monto y sucursal son obligatorios'
      })
    }

    const movimiento = await registrarMovimiento({
      tipo,
      monto,
      descripcion,
      sucursal_id,
      usuario_id      
    })

    res.status(201).json(movimiento)
  } catch (error) {
    console.error('Error al registrar movimiento:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

// ==========================
// RESUMEN POR FECHA
// ==========================
exports.obtenerResumenPorFecha = async (req, res) => {
  try {
    const { sucursal_id, fecha } = req.query

    if (!sucursal_id || !fecha) {
      return res.status(400).json({
        message: 'Sucursal y fecha son obligatorias'
      })
    }

    const resumen = await obtenerResumenPorFecha(
      fecha,
      Number(sucursal_id)
    )

    res.json(resumen)
  } catch (error) {
    console.error('Error al obtener resumen:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

// ==========================
// GENERAR CORTE DE CAJA
// (CON O SIN MOVIMIENTOS)
// ==========================
exports.generarCorte = async (req, res) => {
  try {
    const usuario_id = req.userId
    const sucursal_id = req.body?.sucursal_id || req.query?.sucursal_id
    const fecha = req.body?.fecha || new Date().toISOString().split('T')[0]    

    if (!usuario_id || !sucursal_id) {
      return res.status(400).json({
        message: 'Datos incompletos'
      })
    }
    
    const diaAbierto = await obtenerDiaAbierto(
      sucursal_id,
      fecha
    )

    if (!diaAbierto) {
      return res.status(409).json({
        message: 'El día ya fue cerrado o no existe'
      })
    }

    const resumenCaja = await obtenerResumenPorFecha(fecha, sucursal_id)
    const resumenVentas = await obtenerTotalesPorMetodo(fecha, sucursal_id)

    const total_ingresos =
      Number(resumenCaja.total_ingresos) +
      Number(resumenVentas.total_ventas)

    const total_gastos = Number(resumenCaja.total_gastos)

    const balance_final = total_ingresos - total_gastos

    const corte = await crearCorteCaja({
      fecha,
      sucursal_id,
      usuario_id,
      total_ventas: resumenVentas.total_ventas,
      total_ingresos,
      total_gastos,
      balance_final,
      total_efectivo: resumenVentas.total_efectivo,
      total_transferencia: resumenVentas.total_transferencia,
      total_terminal: resumenVentas.total_terminal,
      total_facturacion: resumenVentas.total_facturacion
    })
    
    await cerrarDiaOperativo(sucursal_id, fecha)

    res.status(201).json({
      message: 'Corte de caja realizado correctamente',
      corte
    })
  } catch (error) {
    console.error('Error al generar corte:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

// ==========================
// HISTORIAL DE CORTES
// ==========================
exports.obtenerCortes = async (req, res) => {
  try {
    const { sucursal_id } = req.query
    const cortes = await obtenerCortes(sucursal_id)
    res.json(cortes)
  } catch (error) {
    console.error('Error al obtener cortes:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

exports.obtenerCortePendiente = async (req, res) => {
  try {
    const { sucursal_id } = req.query

    if (!sucursal_id) {
      return res.json({ requiere_corte: false })
    }
    
    const resultado = await obtenerCortePendiente(sucursal_id)

    res.json(resultado)
  } catch (error) {
    console.error('Error al obtener corte pendiente:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

exports.obtenerMovimientosPorDia = async (req, res) => {
  try {
    const { sucursal_id, fecha } = req.query

    if (!sucursal_id || !fecha) {
      return res.status(400).json({
        message: 'Sucursal y fecha son requeridas'
      })
    }

    const rows = await obtenerMovimientosPorDia(
      sucursal_id,
      fecha
    )

    const ingresos = rows.filter(r =>
      r.tipo === 'ingreso' || r.tipo === 'venta'
    )

    const gastos = rows.filter(r => r.tipo === 'gasto')

    res.json({ ingresos, gastos })
  } catch (error) {
    console.error('Error obteniendo movimientos del día:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

