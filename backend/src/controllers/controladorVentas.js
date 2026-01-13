const { registrarVenta, obtenerReporteVentas } = require("../models/ventas");

exports.crearVenta = async (req, res) => {
  try {
    const {
      cliente,
      telefono,
      correo,
      metodo_pago,
      productos = [],
      servicios = [],
      observaciones,
      usuario_id,
      sucursal_id,
      total
    } = req.body;

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

    const { venta_id } = await registrarVenta({
      cliente,
      telefono,
      correo,
      metodo_pago,
      productos,
      servicios,
      observaciones,
      usuario_id,
      sucursal_id,
      total
    });

    res.status(201).json({
      message: "Venta registrada correctamente",
      venta_id
    });

  } catch (error) {
    console.error("Error al registrar venta:", error);
    res.status(500).json({
      message: error.message || "Error al registrar venta"
    });
  }
};

exports.reporteVentas = async (req, res) => {
  try {
    const { from, to } = req.query;
    const sucursal_id = req.user?.sucursal_id || null;

    if (!from || !to) {
      return res.status(400).json({ message: 'Fechas requeridas' });
    }

    const data = await obtenerReporteVentas({ from, to, sucursal_id });
    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar reporte' });
  }
};
