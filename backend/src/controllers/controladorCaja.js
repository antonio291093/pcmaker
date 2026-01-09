const {
  registrarMovimiento,
  obtenerResumenPorFecha,  
  crearCorteCaja,
  obtenerCortes,
  existeCortePorFecha,  
  obtenerCortePendiente,
} = require("../models/caja");

exports.obtenerCortePendiente = async (req, res) => {
  try {
    const usuario_id = req.userId
    const { sucursal_id } = req.query

    if (!usuario_id || !sucursal_id) {
      return res.json({ requiere_corte: false })
    }

    const resultado = await obtenerCortePendiente(
      usuario_id,
      sucursal_id
    )

    res.json(resultado)
  } catch (error) {
    console.error('Error al obtener corte pendiente:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

// Registrar un movimiento (venta, gasto o ingreso)
exports.crearMovimiento = async (req, res) => {
  try {
    const { tipo, monto, descripcion, sucursal_id } = req.body;
    const usuario_id = req.userId || null;

    if (!tipo || !monto) {
      return res.status(400).json({ message: "Tipo y monto son requeridos" });
    }

    const movimiento = await registrarMovimiento({
      tipo,
      monto,
      descripcion,
      sucursal_id,
      usuario_id,
    });

    res.status(201).json(movimiento);
  } catch (error) {
    console.error("Error al registrar movimiento:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.obtenerResumenPorFecha = async (req, res) => {
  try {
    const { sucursal_id, fecha } = req.query

    if (!sucursal_id) {
      return res.status(400).json({
        message: 'La sucursal es obligatoria'
      })
    }

    if (!fecha) {
      return res.status(400).json({
        message: 'La fecha es obligatoria'
      })
    }

    const resumen = await obtenerResumenPorFecha(fecha, Number(sucursal_id))
    res.json(resumen)
  } catch (error) {
    console.error('Error al obtener resumen por fecha:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

// Generar corte de caja (guardar totales)
exports.generarCorte = async (req, res) => {
  try {    
    const { sucursal_id} = req.query
    const usuario_id = req.userId || null; 

    // 🔹 Fecha del corte (pendiente o hoy)
    const fechaCorte = req.body?.fecha || new Date().toISOString().split('T')[0]

    // 🔹 Validar si ya existe corte para ESA fecha
    const yaExiste = await existeCortePorFecha(usuario_id, fechaCorte)

    if (yaExiste) {
      return res.status(409).json({
        message: `Ya existe un corte de caja para la fecha ${fechaCorte}`
      })
    }

    // 🔹 Obtener resumen PARA ESA FECHA
    const resumen = await obtenerResumenPorFecha(fechaCorte, sucursal_id)

    const balance_final =
      parseFloat(resumen.total_ventas) +
      parseFloat(resumen.total_ingresos) -
      parseFloat(resumen.total_gastos)

    // 🔹 Crear corte PARA ESA FECHA
    const corte = await crearCorteCaja({
      fecha: fechaCorte,
      total_ventas: resumen.total_ventas,
      total_gastos: resumen.total_gastos,
      total_ingresos: resumen.total_ingresos,
      balance_final,
      sucursal_id,
      usuario_id
    })

    res.status(201).json(corte)
  } catch (error) {
    console.error('Error al generar corte de caja:', error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}


// Obtener historial de cortes
exports.obtenerCortes = async (req, res) => {
  try {
    const { sucursal_id} = req.query
    const cortes = await obtenerCortes(sucursal_id);
    res.json(cortes);
  } catch (error) {
    console.error("Error al obtener cortes:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener estado de caja (si requiere corte)
exports.estadoCaja = async (req, res) => {
  try {
    const user = req.user
    
    if (!user || user.rol !== 'ventas') {
      return res.json({ requiere_corte: false })
    }

    const yaHizoCorte = await existeCortePorFecha(user.id)

    res.json({
      requiere_corte: !yaHizoCorte
    })
  } catch (error) {
    console.error("Error en estadoCaja:", error)
    res.status(500).json({ message: "Error en el servidor" })
  }
}
