const {
  obtenerConfiguraciones,
  obtenerConfiguracionPorNombre,
  crearConfiguracion,
  actualizarConfiguracion,
  eliminarConfiguracion,
} = require("../models/configuraciones");

/** ----------------------------------------------------
 * OBTENER TODAS LAS CONFIGURACIONES
 * ---------------------------------------------------- */
exports.getConfiguraciones = async (req, res) => {
  try {
    const configs = await obtenerConfiguraciones();
    res.json(configs);
  } catch (error) {
    console.error("Error al obtener configuraciones:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

/** ----------------------------------------------------
 * OBTENER CONFIGURACIÓN POR NOMBRE
 * ---------------------------------------------------- */
exports.getConfiguracionPorNombre = async (req, res) => {
  try {
    const { nombre } = req.params;
    const config = await obtenerConfiguracionPorNombre(nombre);
    if (!config) return res.status(404).json({ message: "Configuración no encontrada" });
    res.json(config);
  } catch (error) {
    console.error("Error al obtener configuración:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

/** ----------------------------------------------------
 * CREAR CONFIGURACIÓN
 * ---------------------------------------------------- */
exports.postConfiguracion = async (req, res) => {
  try {
    const { nombre, valor, descripcion } = req.body;

    if (!nombre || valor == null) {
      return res.status(400).json({ message: "El nombre y valor son requeridos" });
    }

    const nueva = await crearConfiguracion({ nombre, valor, descripcion });
    res.status(201).json(nueva);
  } catch (error) {
    console.error("Error al crear configuración:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

/** ----------------------------------------------------
 * ACTUALIZAR CONFIGURACIÓN
 * ---------------------------------------------------- */
exports.putConfiguracion = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, valor, descripcion } = req.body;

    const actualizada = await actualizarConfiguracion(id, { nombre, valor, descripcion });
    if (!actualizada) return res.status(404).json({ message: "Configuración no encontrada" });

    res.json(actualizada);
  } catch (error) {
    console.error("Error al actualizar configuración:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

/** ----------------------------------------------------
 * ELIMINAR CONFIGURACIÓN
 * ---------------------------------------------------- */
exports.deleteConfiguracion = async (req, res) => {
  try {
    const { id } = req.params;

    const eliminada = await eliminarConfiguracion(id);
    if (!eliminada) return res.status(404).json({ message: "Configuración no encontrada" });

    res.json({ message: "Configuración eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar configuración:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
