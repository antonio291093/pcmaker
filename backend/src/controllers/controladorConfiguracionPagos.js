const {
  obtenerConfiguracionPago,
  obtenerConfiguraciones,
  crearConfiguracion,
  actualizarConfiguracion,
  eliminarConfiguracion,
} = require("../models/configuracionPagos");

exports.obtenerConfiguracionPago = async (req, res) => {
  try {
    let { tipo_pago, requiere_factura } = req.query;

    if (!tipo_pago) {
      return res.status(400).json({
        message: "tipo_pago es requerido",
      });
    }

    tipo_pago = tipo_pago.toUpperCase();

    if (requiere_factura !== undefined) {
      requiere_factura = requiere_factura === "true";
    }

    const config = await obtenerConfiguracionPago(tipo_pago, requiere_factura);

    if (!config) {
      return res.status(404).json({
        message: "No se encontró configuración",
      });
    }

    res.json(config);
  } catch (error) {
    console.error("Error obteniendo configuración de pago:", error);

    res.status(500).json({
      message: "Error en el servidor",
    });
  }
};

// 🔹 GET ALL (admin)
exports.obtenerConfiguraciones = async (req, res) => {
  try {
    const data = await obtenerConfiguraciones();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// 🔹 CREATE
exports.crearConfiguracion = async (req, res) => {
  try {
    const nueva = await crearConfiguracion(req.body);
    res.status(201).json(nueva);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear" });
  }
};

// 🔹 UPDATE
exports.actualizarConfiguracion = async (req, res) => {
  try {
    const actualizada = await actualizarConfiguracion(req.params.id, req.body);

    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar" });
  }
};

// 🔹 DELETE (soft)
exports.eliminarConfiguracion = async (req, res) => {
  try {
    await eliminarConfiguracion(req.params.id);
    res.json({ message: "Eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar" });
  }
};
