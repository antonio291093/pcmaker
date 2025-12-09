const { obtenerAlmacenamiento } = require("../models/catalogoAlmacenamiento");

exports.obtenerAlmacenamiento = async (req, res) => {
  try {
    const almacenamiento = await obtenerAlmacenamiento();
    res.json(almacenamiento);
  } catch (error) {
    console.error("Error obteniendo almacenamiento:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
