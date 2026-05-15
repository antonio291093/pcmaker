const {
  crearApartado,
  registrarAbono,
  cancelarApartado,
  liquidarApartado,
  obtenerApartados,
  obtenerApartadoPorId,
  obtenerConfiguracionesApartado,
  calcularStockDisponible,
} = require('../models/apartados')

const { registrarVenta } = require('../models/ventas')
const { resolverOCrearCliente } = require('../models/clientes')
const pool = require('../config/db')

// ==========================
// LISTAR
// ==========================
exports.listar = async (req, res) => {
  try {
    const { sucursal_id, estado, cliente_id } = req.query
    const apartados = await obtenerApartados({
      sucursal_id: sucursal_id ? Number(sucursal_id) : undefined,
      estado:      estado      || undefined,
      cliente_id:  cliente_id  ? Number(cliente_id) : undefined,
    })
    res.json(apartados)
  } catch (error) {
    console.error('Error al listar apartados:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

// ==========================
// DETALLE
// ==========================
exports.detalle = async (req, res) => {
  try {
    const apartado = await obtenerApartadoPorId(Number(req.params.id))
    if (!apartado) return res.status(404).json({ message: 'Apartado no encontrado' })
    res.json(apartado)
  } catch (error) {
    console.error('Error al obtener apartado:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

// ==========================
// CONFIGURACIONES
// ==========================
exports.obtenerConfiguraciones = async (req, res) => {
  try {
    const config = await obtenerConfiguracionesApartado()
    res.json(config)
  } catch (error) {
    console.error('Error al obtener configuraciones de apartados:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

// ==========================
// CREAR
// ==========================
exports.crear = async (req, res) => {
  try {
    const usuario_id = req.userId
    const {
      producto_id,
      cantidad = 1,
      sucursal_id,
      cliente,          // { nombre, telefono, correo }
      monto_enganche,   // primer pago que realiza el cliente al apartar
      metodo_pago_enganche,
      observaciones_enganche,
    } = req.body

    if (!producto_id || !sucursal_id || !cliente?.nombre) {
      return res.status(400).json({ message: 'Datos incompletos: producto_id, sucursal_id y cliente.nombre son requeridos' })
    }
    if (!monto_enganche || !metodo_pago_enganche) {
      return res.status(400).json({ message: 'Se requiere el enganche inicial y su método de pago' })
    }

    // Verificar stock disponible
    const stock = await calcularStockDisponible(producto_id)
    if (!stock) return res.status(404).json({ message: 'Producto no encontrado' })
    if (stock.cantidad_disponible < Number(cantidad)) {
      return res.status(409).json({
        message: `Stock insuficiente. Disponible: ${stock.cantidad_disponible}, solicitado: ${cantidad}`
      })
    }

    // Leer precio del producto y configuraciones
    const { rows: prod } = await pool.query(
      'SELECT precio FROM inventario WHERE id = $1 AND eliminado = FALSE',
      [producto_id]
    )
    if (!prod.length) return res.status(404).json({ message: 'Producto no encontrado' })

    const precio_unitario = Number(prod[0].precio)
    const precio_total    = Number((precio_unitario * Number(cantidad)).toFixed(2))

    const config = await obtenerConfiguracionesApartado()

    const enganche_minimo = config.enganche_tipo === 'fijo'
      ? Number(config.enganche_valor)
      : Number((precio_total * config.enganche_valor / 100).toFixed(2))

    if (Number(monto_enganche) < enganche_minimo) {
      return res.status(400).json({
        message: `El enganche mínimo es $${enganche_minimo.toFixed(2)}`
      })
    }

    // Calcular fecha límite (días calendario desde hoy)
    const fecha_limite = new Date()
    fecha_limite.setDate(fecha_limite.getDate() + config.dias_limite)
    const fecha_limite_str = fecha_limite.toISOString().split('T')[0]

    // Resolver o crear cliente
    const cliente_id = await resolverOCrearCliente({
      nombre:     cliente.nombre,
      telefono:   cliente.telefono || null,
      correo:     cliente.correo   || null,
      sucursal_id,
    })

    // Crear apartado
    const apartado = await crearApartado({
      cliente_id,
      sucursal_id: Number(sucursal_id),
      usuario_id,
      producto_id: Number(producto_id),
      cantidad:    Number(cantidad),
      precio_unitario,
      precio_total,
      enganche_minimo,
      fecha_limite: fecha_limite_str,
    })

    // Registrar el enganche como primer abono
    await registrarAbono(apartado.id, {
      usuario_id,
      monto:       Number(monto_enganche),
      metodo_pago: metodo_pago_enganche,
      observaciones: observaciones_enganche || null,
    })

    res.status(201).json({
      message: 'Apartado creado',
      apartado_id: apartado.id,
      precio_total,
      enganche_minimo,
      monto_abonado: Number(monto_enganche),
      fecha_limite:  fecha_limite_str,
    })
  } catch (error) {
    console.error('Error al crear apartado:', error)
    res.status(500).json({ message: error.message || 'Error en el servidor' })
  }
}

// ==========================
// REGISTRAR ABONO
// ==========================
exports.abonar = async (req, res) => {
  try {
    const apartado_id = Number(req.params.id)
    const usuario_id  = req.userId
    const { monto, metodo_pago, observaciones } = req.body

    if (!monto || !metodo_pago) {
      return res.status(400).json({ message: 'Se requieren monto y metodo_pago' })
    }

    const abono = await registrarAbono(apartado_id, {
      usuario_id,
      monto:    Number(monto),
      metodo_pago,
      observaciones: observaciones || null,
    })

    res.status(201).json({ message: 'Abono registrado', abono })
  } catch (error) {
    console.error('Error al registrar abono:', error)
    const status = error.message.includes('no encontrado') ? 404
                 : error.message.includes('no está activo') ? 409
                 : error.message.includes('supera el total') ? 400
                 : 500
    res.status(status).json({ message: error.message })
  }
}

// ==========================
// CANCELAR
// ==========================
exports.cancelar = async (req, res) => {
  try {
    const apartado_id = Number(req.params.id)
    const { motivo_cancelacion } = req.body

    const actualizado = await cancelarApartado(apartado_id, motivo_cancelacion || null)
    if (!actualizado) {
      return res.status(409).json({ message: 'El apartado no está activo o no existe' })
    }

    res.json({ message: 'Apartado cancelado' })
  } catch (error) {
    console.error('Error al cancelar apartado:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

// ==========================
// LIQUIDAR
// ==========================
exports.liquidar = async (req, res) => {
  try {
    const apartado_id    = Number(req.params.id)
    const usuario_id     = req.userId
    const {
      pagos = [],       // métodos de pago para el saldo restante
      requiere_factura = false,
      observaciones,
    } = req.body

    const apartado = await obtenerApartadoPorId(apartado_id)
    if (!apartado) return res.status(404).json({ message: 'Apartado no encontrado' })
    if (apartado.estado !== 'activo') {
      return res.status(409).json({ message: `El apartado ya está ${apartado.estado}` })
    }

    // Construir pagos de la venta:
    // todos los abonos previos + los nuevos pagos del saldo final
    const pagosVenta = [
      ...apartado.abonos.map(ab => ({ metodo: ab.metodo_pago, monto: Number(ab.monto) })),
      ...pagos.map(p => ({ metodo: p.metodo, monto: Number(p.monto) })),
    ]

    // Registrar la venta con los precios snapshot del apartado
    const venta = await registrarVenta({
      cliente:          apartado.cliente_nombre,
      telefono:         apartado.cliente_telefono,
      correo:           apartado.cliente_correo,
      pagos:            pagosVenta,
      productos:        [{
        id:              Number(apartado.producto_id),
        cantidad:        Number(apartado.cantidad),
        precio_unitario: Number(apartado.precio_unitario),
      }],
      servicios:        [],
      observaciones:    observaciones || `Liquidación de apartado #${apartado.id}`,
      usuario_id,
      sucursal_id:      Number(apartado.sucursal_id),
      requiere_factura,
    })

    // Marcar apartado como liquidado
    const actualizado = await liquidarApartado(apartado_id, { venta_id: venta.venta_id })
    if (!actualizado) {
      return res.status(409).json({ message: 'El apartado ya fue liquidado o cancelado' })
    }

    res.json({ message: 'Apartado liquidado', venta_id: venta.venta_id })
  } catch (error) {
    console.error('Error al liquidar apartado:', error)
    res.status(500).json({ message: error.message || 'Error en el servidor' })
  }
}
