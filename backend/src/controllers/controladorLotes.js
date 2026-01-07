const {
  crearLote,
  obtenerLotes,
  generarSeriesPorLote,
  actualizarLote,
  eliminarLote,
  guardarEtiquetasLote,
  obtenerEtiquetasPorLote,
} = require("../models/lotes");

const { generarBarcodeBase64 } = require('../utils/barcode');

exports.crearLote = async (req, res) => {
  const {
    etiqueta,
    total_equipos,
    usuario_recibio,
    fecha_recibo,
    fecha_creacion,
  } = req.body;

  try {
    // 1️⃣ Crear lote
    const loteCreado = await crearLote({
      etiqueta,
      total_equipos,
      usuario_recibio,
      fecha_recibo,
      fecha_creacion,
    });

    // 2️⃣ Preparar datos base
    const fecha =  new Date(); // hora actual REAL

    const yyyy = fecha.getFullYear();
    const MM = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    const HH = String(fecha.getHours()).padStart(2, '0');
    const mm = String(fecha.getMinutes()).padStart(2, '0');
    const fechaNum = `${yyyy}${MM}${dd}${HH}${mm}`;     // 202601021505    

    // 3️⃣ Generar etiquetas (ARRAY REAL)
    const etiquetas = [];

    for (let i = 1; i <= loteCreado.total_equipos; i++) {
      const consecutivo = String(i).padStart(3, '0');
      const serie = `${fechaNum}${consecutivo}`; // 202601021505001      
      console.log(serie);
      const barcode = await generarBarcodeBase64(serie);

      etiquetas.push({
        lote_id: loteCreado.id,
        etiqueta: `${loteCreado.etiqueta} - ${serie}`,
        serie,
        barcode,
      });
    }
    
    await guardarEtiquetasLote(etiquetas);

    res.status(201).json({
      lote: loteCreado,
      etiquetas,
    });

  } catch (error) {
    console.error('Error creando lote:', error);
    res.status(500).json({ message: 'Error en el servidor' });
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
