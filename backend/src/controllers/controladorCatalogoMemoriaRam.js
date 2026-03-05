const { obtenerMemoriasRam } = require("../models/catalogoRAM");

exports.obtenerMemoriasRam = async (req, res) => {
  try {

    let tipo = req.query.tipo;

    if (tipo) {
      tipo = tipo.toUpperCase();

      if (!['DIMM', 'SODIMM'].includes(tipo)) {
        return res.status(400).json({
          message: "tipo debe ser DIMM o SODIMM"
        });
      }
    }

    const memorias = await obtenerMemoriasRam(tipo);

    res.json(memorias);

  } catch (error) {

    console.error("Error obteniendo memorias RAM:", error);

    res.status(500).json({
      message: "Error en el servidor"
    });

  }
};
