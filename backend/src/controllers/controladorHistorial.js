const { obtenerHistorialTecnico } = require("../models/historial");

exports.obtenerHistorialTecnico = async (req, res) => {
  try {
    const tecnicoId = req.userId; // viene del token JWT
    const { page = 1, limit = 10 } = req.query;

    const historial = await obtenerHistorialTecnico(tecnicoId, page, limit);
    res.json(historial);
  } catch (error) {
    console.error("❌ Error obteniendo historial del técnico:", error.message, error.stack);
    res.status(500).json({ message: "Error al obtener historial" });
  }
};
