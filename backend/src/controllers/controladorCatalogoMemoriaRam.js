const { obtenerMemoriasRam } = require("../models/catalogoRAM");

exports.obtenerMemoriasRam = async (req, res) => {
  try {
    const memorias = await obtenerMemoriasRam();
    res.json(memorias);
  } catch (error) {
    console.error("Error obteniendo memorias RAM:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
