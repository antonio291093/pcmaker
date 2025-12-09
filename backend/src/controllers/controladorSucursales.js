const {
  crearSucursal,
  obtenerSucursales,
  obtenerSucursalPorId,
  actualizarSucursal,
  eliminarSucursal,
} = require("../models/sucursales");

// Crear sucursal
exports.crearSucursal = async (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res
      .status(400)
      .json({ message: "El nombre de la sucursal es obligatorio" });
  }

  try {
    const nuevaSucursal = await crearSucursal({ nombre });
    res.status(201).json(nuevaSucursal);
  } catch (error) {
    console.error("Error creando sucursal:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener todas las sucursales
exports.obtenerSucursales = async (req, res) => {
  try {
    const sucursales = await obtenerSucursales();
    res.json(sucursales);
  } catch (error) {
    console.error("Error al obtener sucursales:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener sucursal por ID
exports.obtenerSucursalPorId = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "ID de sucursal inválido" });
  }

  try {
    const sucursal = await obtenerSucursalPorId(id);
    if (!sucursal)
      return res.status(404).json({ message: "Sucursal no encontrada" });
    res.json(sucursal);
  } catch (error) {
    console.error("Error al obtener sucursal:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar sucursal
exports.actualizarSucursal = async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID de sucursal inválido" });
  }

  try {
    const sucursalActualizada = await actualizarSucursal(id, { nombre });
    if (!sucursalActualizada)
      return res.status(404).json({ message: "Sucursal no encontrada" });
    res.json(sucursalActualizada);
  } catch (error) {
    console.error("Error al actualizar sucursal:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar sucursal
exports.eliminarSucursal = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID de sucursal inválido" });
  }

  try {
    const sucursalEliminada = await eliminarSucursal(id);
    if (!sucursalEliminada)
      return res.status(404).json({ message: "Sucursal no encontrada" });
    res.json({ message: "Sucursal eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar sucursal:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
