const {
  crearMantenimiento,
  obtenerMantenimientos,
  obtenerMantenimientosPendientesParaVenta,
  actualizarMantenimiento,
  eliminarMantenimiento,
} = require("../models/mantenimientos");

// Crear mantenimiento
exports.crearMantenimiento = async (req, res) => {
  const {
    fecha_mantenimiento,
    detalle,
    tecnico_id,
    sucursal_id,
    catalogo_id,
    costo_personalizado,
  } = req.body;

  try {
    const fecha_creacion = new Date();
    const mantenimiento = await crearMantenimiento({
      fecha_mantenimiento,
      detalle,
      tecnico_id,
      sucursal_id,
      fecha_creacion,
      catalogo_id,
      costo_personalizado,
    });
    res.status(201).json(mantenimiento);
  } catch (error) {
    console.error("Error creando mantenimiento:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener todos los mantenimientos
exports.obtenerMantenimientos = async (req, res) => {
  try {
    const mantenimientos = await obtenerMantenimientos();
    res.json(mantenimientos);
  } catch (error) {
    console.error("Error obteniendo mantenimientos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.obtenerServiciosPendientesVenta = async (req, res) => {
  try {
    const { sucursal_id } = req.query;

    if (!sucursal_id) {
      return res.status(400).json({ message: "Sucursal requerida" });
    }

    const servicios = await obtenerMantenimientosPendientesParaVenta({
      sucursal_id: Number(sucursal_id)
    });

    res.json(servicios);
  } catch (error) {
    console.error("Error obteniendo servicios pendientes para venta:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar mantenimiento
exports.actualizarMantenimiento = async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    fecha_mantenimiento,
    detalle,
    tecnico_id,
    catalogo_id,
    costo_personalizado,
  } = req.body;

  try {
    const mantenimientoActualizado = await actualizarMantenimiento(id, {
      fecha_mantenimiento,
      detalle,
      tecnico_id,
      catalogo_id,
      costo_personalizado,
    });
    if (!mantenimientoActualizado) {
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }
    res.json(mantenimientoActualizado);
  } catch (error) {
    console.error("Error actualizando mantenimiento:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar mantenimiento
exports.eliminarMantenimiento = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const mantenimientoEliminado = await eliminarMantenimiento(id);
    if (!mantenimientoEliminado) {
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }
    res.json({ message: "Mantenimiento eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando mantenimiento:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
