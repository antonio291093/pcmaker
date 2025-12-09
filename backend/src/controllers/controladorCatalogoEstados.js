const { obtenerEstados } = require("../models/catalogoEstados");

exports.obtenerEstados = async (req, res) => {
  try {
    const estados = await obtenerEstados();
    res.json(estados);
  } catch (error) {
    console.error("Error obteniendo estados:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
