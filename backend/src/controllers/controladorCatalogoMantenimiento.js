const {
  crearCatalogoMantenimiento,
  obtenerCatalogoMantenimientos,
  obtenerCatalogoMantenimientoPorId,
  actualizarCatalogoMantenimiento,
  eliminarCatalogoMantenimiento,
} = require("../models/catalogoMantenimiento");

// Crear un tipo de mantenimiento
exports.crearCatalogoMantenimiento = async (req, res) => {
  const { descripcion, costo, activo } = req.body;
  try {
    const nuevoMantenimiento = await crearCatalogoMantenimiento({ descripcion, costo, activo });
    res.status(201).json(nuevoMantenimiento);
  } catch (error) {
    console.error("Error creando mantenimiento:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener todos los tipos de mantenimiento
exports.obtenerCatalogoMantenimientos = async (req, res) => {
  try {
    const mantenimientos = await obtenerCatalogoMantenimientos();
    res.json(mantenimientos);
  } catch (error) {
    console.error("Error obteniendo mantenimientos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener un mantenimiento por ID
exports.obtenerCatalogoMantenimientoPorId = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const mantenimiento = await obtenerCatalogoMantenimientoPorId(id);
    if (!mantenimiento) {
      return res.status(404).json({ message: "Tipo de mantenimiento no encontrado" });
    }
    res.json(mantenimiento);
  } catch (error) {
    console.error("Error obteniendo mantenimiento:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar mantenimiento
exports.actualizarCatalogoMantenimiento = async (req, res) => {
  const id = parseInt(req.params.id);
  const { descripcion, costo, activo } = req.body;
  try {
    const mantenimientoActualizado = await actualizarCatalogoMantenimiento(id, { descripcion, costo, activo });
    if (!mantenimientoActualizado) {
      return res.status(404).json({ message: "Tipo de mantenimiento no encontrado" });
    }
    res.json(mantenimientoActualizado);
  } catch (error) {
    console.error("Error actualizando mantenimiento:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar mantenimiento
exports.eliminarCatalogoMantenimiento = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const mantenimientoEliminado = await eliminarCatalogoMantenimiento(id);
    if (!mantenimientoEliminado) {
      return res.status(404).json({ message: "Tipo de mantenimiento no encontrado" });
    }
    res.json({ message: "Tipo de mantenimiento eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando mantenimiento:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
