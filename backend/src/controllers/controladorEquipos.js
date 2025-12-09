const pool = require("../config/db");

const {
  crearEquipo,
  obtenerEquipos,
  obtenerEquipoPorId,
  actualizarEquipo,
  eliminarEquipo,
  buscarEquipoPorEtiquetaTexto,
  asignarRamAEquipo,
  asignarAlmacenamientoAEquipo,
  obtenerEquiposPorEstado,
} = require("../models/equipos");

exports.crearEquipo = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tecnico_id = req.userId;
    const dataEquipo = { ...req.body, tecnico_id };

    // 1. Crear equipo principal con el técnico asignado
    const equipo = await crearEquipo(dataEquipo, client);

    await client.query("COMMIT");
    res.status(201).json(equipo);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creando equipo:", error);
    res.status(500).json({ message: "Error en el servidor" });
  } finally {
    client.release();
  }
};

// Obtener todos los equipos
exports.obtenerEquipos = async (req, res) => {
  try {
    const equipos = await obtenerEquipos();
    res.json(equipos);
  } catch (error) {
    console.error("Error al obtener equipos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener equipo por ID
exports.obtenerEquipoPorId = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const equipo = await obtenerEquipoPorId(id);
    if (!equipo) {
      return res.status(404).json({ message: "Equipo no encontrado" });
    }
    res.json(equipo);
  } catch (error) {
    console.error("Error al obtener equipo:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.actualizarEquipo = async (req, res) => {
  const id = parseInt(req.params.id);
  const tecnico_id = req.userId;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --- Campos válidos que se pueden actualizar ---
    const camposValidos = [
      "nombre",
      "descripcion",
      "cantidad",
      "tipo",
      "procesador",
      "lote_etiqueta_id",
      "estado_id",
      "sucursal_id",
    ];

    const body = Object.fromEntries(
      Object.entries(req.body).filter(
        ([k, v]) => camposValidos.includes(k) && v !== undefined
      )
    );

    // Agregar técnico que hizo la modificación
    body.tecnico_id = tecnico_id;

    if (Object.keys(body).length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    // --- Actualizar equipo principal ---
    const equipoActualizado = await actualizarEquipo(id, body, client);
    if (!equipoActualizado) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Equipo no encontrado" });
    }

    // --- Actualizar RAM y almacenamiento si el estado es ARMADO (4) ---
    if (req.body.estado_id === 4) {
      // Limpiar las asociaciones anteriores (opcional)
      await client.query("DELETE FROM equipos_ram WHERE equipo_id = $1", [id]);
      await client.query(
        "DELETE FROM equipos_almacenamiento WHERE equipo_id = $1",
        [id]
      );

      // Asignar nuevas
      if (req.body.ramModules && req.body.ramModules.length > 0) {
        await asignarRamAEquipo(id, req.body.ramModules, client);
      }
      if (req.body.storages && req.body.storages.length > 0) {
        await asignarAlmacenamientoAEquipo(id, req.body.storages, client);
      }
    }

    await client.query("COMMIT");
    res.status(200).json(equipoActualizado);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al actualizar equipo:", error);
    res.status(500).json({ message: "Error en el servidor" });
  } finally {
    client.release();
  }
};

// Eliminar equipo
exports.eliminarEquipo = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const equipoEliminado = await eliminarEquipo(id);
    if (!equipoEliminado) {
      return res.status(404).json({ message: "Equipo no encontrado" });
    }
    res.json({ message: "Equipo eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar equipo:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.buscarEquipoPorEtiqueta = async (req, res) => {
  const { texto } = req.query;
  if (!texto || texto.trim() === "") {
    return res.status(400).json({ message: "Parámetro 'texto' obligatorio" });
  }
  try {
    const equipo = await buscarEquipoPorEtiquetaTexto(texto.trim());
    if (!equipo) {
      return res.status(404).json({ message: "Equipo no encontrado" });
    }
    res.json(equipo);
  } catch (error) {
    console.error("Error al buscar equipo por etiqueta:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.obtenerEquiposPorEstado = async (req, res) => {
  const estadoId = parseInt(req.params.estado_id);
  if (isNaN(estadoId)) {
    return res.status(400).json({ message: "Parámetro 'estado_id' inválido" });
  }
  try {
    const equipos = await obtenerEquiposPorEstado(estadoId);
    res.json(equipos);
  } catch (error) {
    console.error("Error al obtener equipos filtrados por estado:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
