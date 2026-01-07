const {
  registrarMovimiento,
  obtenerResumen,
  crearCorteCaja,
  obtenerCortes,
  existeCorteHoy,
} = require("../models/caja");

// Registrar un movimiento (venta, gasto o ingreso)
exports.crearMovimiento = async (req, res) => {
  try {
    const { tipo, monto, descripcion, sucursal_id } = req.body;
    const usuario_id = req.userId || null; // si usas authMiddleware

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

// Obtener resumen del día actual
exports.obtenerResumen = async (req, res) => {
  try {
    const sucursal_id = req.user?.sucursal_id || null;
    const resumen = await obtenerResumen(sucursal_id);
    res.json(resumen);
  } catch (error) {
    console.error("Error al obtener resumen:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Generar corte de caja (guardar totales)
exports.generarCorte = async (req, res) => {
  try {
    const sucursal_id = req.user?.sucursal_id || null;
    const usuario_id = req.user?.id || null;
      
    const yaExiste = await existeCorteHoy(usuario_id)

    if (yaExiste) {
      return res.status(409).json({
        message: "Ya existe un corte de caja hoy"
      })
    }

    const resumen = await obtenerResumen(sucursal_id);
    const balance_final =
      parseFloat(resumen.total_ventas) +
      parseFloat(resumen.total_ingresos) -
      parseFloat(resumen.total_gastos);

    const corte = await crearCorteCaja({
      total_ventas: resumen.total_ventas,
      total_gastos: resumen.total_gastos,
      total_ingresos: resumen.total_ingresos,
      balance_final,
      sucursal_id,
      usuario_id,
    });

    res.status(201).json(corte);
  } catch (error) {
    console.error("Error al generar corte de caja:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener historial de cortes
exports.obtenerCortes = async (req, res) => {
  try {
    const sucursal_id = req.user?.sucursal_id || null;
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

    const yaHizoCorte = await existeCorteHoy(user.id)

    res.json({
      requiere_corte: !yaHizoCorte
    })
  } catch (error) {
    console.error("Error en estadoCaja:", error)
    res.status(500).json({ message: "Error en el servidor" })
  }
}
