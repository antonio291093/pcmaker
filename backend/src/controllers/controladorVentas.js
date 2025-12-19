const { registrarVenta, obtenerVentas } = require("../models/ventas");

exports.crearVenta = async (req, res) => {
  try {
    const {
      cliente,
      productos = [],
      servicios = [],
      observaciones,
      usuario_id,
      sucursal_id,
      total
    } = req.body;

    // 🧠 Validaciones correctas
    if (!cliente) {
      return res.status(400).json({
        message: "El cliente es obligatorio"
      });
    }

    if (productos.length === 0 && servicios.length === 0) {
      return res.status(400).json({
        message: "Debes registrar al menos un producto o un servicio"
      });
    }

    const resultado = await registrarVenta({
      cliente,
      productos,
      servicios,
      observaciones,
      usuario_id,
      sucursal_id,
      total
    });

    res.status(201).json({
      message: resultado.message || "Venta registrada correctamente",
      venta_id: resultado.ventas?.[0]?.id,
      total: resultado.total,
      ventas: resultado.ventas
    });

  } catch (error) {
    console.error("Error al registrar venta:", error);
    res.status(500).json({
      message: "Error al registrar venta",
      error: error.message
    });
  }
};

// Obtener listado de ventas
exports.obtenerVentas = async (req, res) => {
  try {
    const sucursal_id = req.user?.sucursal_id || null;
    const ventas = await obtenerVentas(sucursal_id);
    res.json(ventas);
  } catch (error) {
    console.error("Error al obtener ventas:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
