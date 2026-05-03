const {
  obtenerResumenSucursales,
  obtenerReporteVentas,
  obtenerDetalleDiario,
  obtenerArticulosEliminados,
} = require("../models/reportes");

exports.resumenSucursales = async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split("T")[0];

    const data = await obtenerResumenSucursales({ fecha });

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo resumen de sucursales" });
  }
};

exports.reporteVentas = async (req, res) => {
  try {
    const { from, to } = req.query;

    const sucursal_id = Number(req.query.sucursal_id) || null;

    if (!from || !to) {
      return res.status(400).json({ message: "Fechas requeridas" });
    }

    const data = await obtenerReporteVentas({
      from,
      to,
      sucursal_id,
    });

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al generar reporte" });
  }
};

exports.detalleDiario = async (req, res) => {
  try {
    const { sucursal_id, fecha } = req.query;

    if (!sucursal_id) {
      return res.status(400).json({ error: "sucursal_id es requerido" });
    }

    const fechaFinal = fecha || new Date().toISOString().split("T")[0];

    const data = await obtenerDetalleDiario({
      sucursal_id,
      fecha: fechaFinal,
    });

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo detalle diario" });
  }
};

exports.articulosEliminados = async (req, res) => {
  try {
    const { from, to } = req.query;

    const data = await obtenerArticulosEliminados({
      from,
      to,
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error obteniendo artículos eliminados",
    });
  }
};
