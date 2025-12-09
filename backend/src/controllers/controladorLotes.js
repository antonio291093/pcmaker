const {
  crearLote,
  obtenerLotes,
  generarSeriesPorLote,
  actualizarLote,
  eliminarLote,
  guardarEtiquetasLote,
  obtenerEtiquetasPorLote,
} = require("../models/lotes");

exports.crearLote = async (req, res) => {
  const {
    etiqueta,
    total_equipos,
    usuario_recibio,
    fecha_recibo,
    fecha_creacion,
  } = req.body;

  try {
    const loteCreado = await crearLote({
      etiqueta,
      total_equipos,
      usuario_recibio,
      fecha_recibo,
      fecha_creacion,
    });

    // Generar las etiquetas con la misma lógica que la función generarSeriesPorLote
    const fecha = new Date(loteCreado.fecha_recibo);
    const fechaNum = fecha.toISOString().slice(0, 10).replace(/-/g, "");
    const etiquetas = [];
    for (let i = 1; i <= loteCreado.total_equipos; i++) {
      etiquetas.push(`${loteCreado.etiqueta} - ${fechaNum}${i}`);
    }

    // Guardar etiquetas en la tabla correspondiente
    await guardarEtiquetasLote(loteCreado.id, etiquetas);

    res.status(201).json(loteCreado);
  } catch (error) {
    console.error("Error creando lote:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener todos los lotes
exports.obtenerLotes = async (req, res) => {
  try {
    const lotes = await obtenerLotes();
    res.json(lotes);
  } catch (error) {
    console.error("Error al obtener lotes:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Generar series para un lote
exports.generarSeriesPorLote = async (req, res) => {
  const loteId = parseInt(req.params.id);
  if (isNaN(loteId)) {
    return res.status(400).json({ message: "ID de lote inválido" });
  }
  try {
    const series = await generarSeriesPorLote(loteId);
    res.json(series);
  } catch (error) {
    console.error("Error al generar series:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar lote
exports.actualizarLote = async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    etiqueta,
    fecha_recibo,
    total_equipos,
    usuario_recibio,
    fecha_creacion,
  } = req.body;
  try {
    const loteActualizado = await actualizarLote(id, {
      etiqueta,
      fecha_recibo,
      total_equipos,
      usuario_recibio,
      fecha_creacion,
    });
    if (!loteActualizado)
      return res.status(404).json({ message: "Lote no encontrado" });
    res.json(loteActualizado);
  } catch (error) {
    console.error("Error al actualizar lote:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar lote
exports.eliminarLote = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const loteEliminado = await eliminarLote(id);
    if (!loteEliminado)
      return res.status(404).json({ message: "Lote no encontrado" });
    res.json({ message: "Lote eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar lote:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.obtenerEtiquetasPorLote = async (req, res) => {
  const loteId = parseInt(req.params.id);
  if (isNaN(loteId)) {
    return res.status(400).json({ message: "ID de lote inválido" });
  }

  try {
    const etiquetas = await obtenerEtiquetasPorLote(loteId);
    res.json(etiquetas);
  } catch (error) {
    console.error("Error al obtener etiquetas por lote:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
