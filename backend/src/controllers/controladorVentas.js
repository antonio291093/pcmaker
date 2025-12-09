const { registrarVenta, obtenerVentas } = require("../models/ventas");

exports.crearVenta = async (req, res) => {
  try {
    const { cliente, productos, observaciones, usuario_id, sucursal_id, total } = req.body;

    if (!cliente || !productos || productos.length === 0) {
      return res.status(400).json({ message: "Faltan datos requeridos o productos vacíos" });
    }

    const resultado = await registrarVenta({
      cliente,
      productos,
      observaciones,
      usuario_id,
      sucursal_id,
      total,
    });

    res.status(201).json({
      message: resultado.message,
      venta_id: resultado.ventas[0].id,
      total: resultado.total,
      ventas: resultado.ventas
    });
  } catch (error) {
    console.error("Error al registrar venta:", error);
    res.status(500).json({ message: "Error al registrar venta", error: error.message });
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
