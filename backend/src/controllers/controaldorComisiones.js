const {
  crearComision,
  obtenerComisiones,
  actualizarComision,
  eliminarComision,
  obtenerComisionPorEquipo,
  obtenerComisionesSemanaActualPorUsuario,
} = require("../models/comisiones");

// Crear comisión
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
    // Validar si ya existe una comisión para el equipo
    const existente = await obtenerComisionPorEquipo(equipo_id);
    if (existente)
      return res
        .status(409)
        .json({ message: "Ya existe una comisión para este equipo" });

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

// Obtener comisiones de la semana actual para un usuario
exports.obtenerComisionesSemanaActual = async (req, res) => {
  // El usuario_id debe venir de sesión o de request según tu autenticación
  const usuario_id = req.params.usuario_id;
  if (!usuario_id) {
    return res.status(400).json({ message: "Falta el usuario_id" });
  }

  try {
    const comisionesSemana = await obtenerComisionesSemanaActualPorUsuario(
      usuario_id
    );
    res.json(comisionesSemana ?? null);
  } catch (error) {
    console.error("Error al obtener comisiones de la semana:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
