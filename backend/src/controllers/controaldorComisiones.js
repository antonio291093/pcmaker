const {
  crearComision,
  obtenerComisiones,
  actualizarComision,
  eliminarComision,
  obtenerComisionPorEquipo,
  obtenerComisionesSemanaActualPorUsuario,
  obtenerComisionPorVenta,
  obtenerResumenComisiones,
  obtenerDetalleComisiones,
} = require("../models/comisiones");

exports.crearComision = async (req, res) => {
  const {
    usuario_id,
    venta_id,
    mantenimiento_id,
    monto,
    fecha_creacion,
    equipo_id,
  } = req.body;

  try {
    // 🔹 VALIDACIONES SEGÚN TIPO
    if (equipo_id) {
      const existente = await obtenerComisionPorEquipo(equipo_id);
      if (existente) {
        return res.status(409).json({
          message: "Ya existe una comisión para este equipo",
        });
      }
    }

    if (venta_id) {
      const existenteVenta = await obtenerComisionPorVenta(venta_id);
      if (existenteVenta) {
        return res.status(409).json({
          message: "Ya existe una comisión para esta venta",
        });
      }
    }

    const comisionCreada = await crearComision({
      usuario_id,
      venta_id,
      mantenimiento_id,
      monto,
      fecha_creacion,
      equipo_id,
    });

    res.status(201).json(comisionCreada);
  } catch (error) {
    console.error("Error creando comisión:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};


// Obtener todas las comisiones
exports.obtenerComisiones = async (req, res) => {
  try {
    const comisiones = await obtenerComisiones();
    res.json(comisiones);
  } catch (error) {
    console.error("Error al obtener comisiones:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar comisión
exports.actualizarComision = async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    usuario_id,
    venta_id,
    mantenimiento_id,
    monto,
    fecha_creacion,
    equipo_id,
  } = req.body;
  try {
    const comisionActualizada = await actualizarComision(id, {
      usuario_id,
      venta_id,
      mantenimiento_id,
      monto,
      fecha_creacion,
      equipo_id,
    });
    if (!comisionActualizada)
      return res.status(404).json({ message: "Comisión no encontrada" });
    res.json(comisionActualizada);
  } catch (error) {
    console.error("Error al actualizar comisión:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar comisión
exports.eliminarComision = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const comisionEliminada = await eliminarComision(id);
    if (!comisionEliminada)
      return res.status(404).json({ message: "Comisión no encontrada" });
    res.json({ message: "Comisión eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar comisión:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener comisión por equipo
exports.obtenerComisionPorEquipo = async (req, res) => {
  const equipoId = parseInt(req.params.equipo_id);
  if (isNaN(equipoId)) {
    return res.status(400).json({ message: "ID de equipo inválido" });
  }

  try {
    const comision = await obtenerComisionPorEquipo(equipoId);
    res.json(comision ?? null);
  } catch (error) {
    console.error("Error al obtener comisión por equipo:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.obtenerReporteComisiones = async (req, res) => {
  const { fecha_inicio, fecha_fin, sucursal_id } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({ message: "fecha_inicio y fecha_fin son requeridos" });
  }

  try {
    const [resumen, detalle] = await Promise.all([
      obtenerResumenComisiones({
        fecha_inicio,
        fecha_fin,
        sucursal_id: sucursal_id ? Number(sucursal_id) : null,
      }),
      obtenerDetalleComisiones({
        fecha_inicio,
        fecha_fin,
        sucursal_id: sucursal_id ? Number(sucursal_id) : null,
      }),
    ]);

    res.json({ resumen, detalle });
  } catch (error) {
    console.error("Error al obtener reporte de comisiones:", error);
    res.status(500).json({ message: "Error al obtener reporte de comisiones" });
  }
};

// Obtener comisiones de la semana actual (o rango) para un usuario
exports.obtenerComisionesSemanaActual = async (req, res) => {
  const usuario_id = req.params.usuario_id;
  if (!usuario_id) {
    return res.status(400).json({ message: "Falta el usuario_id" });
  }

  const { fecha_inicio, fecha_fin } = req.query;

  try {
    const comisionesSemana = await obtenerComisionesSemanaActualPorUsuario({
      usuario_id,
      fecha_inicio: fecha_inicio ?? null,
      fecha_fin: fecha_fin ?? null,
    });
    res.json(comisionesSemana ?? null);
  } catch (error) {
    console.error("Error al obtener comisiones de la semana:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
