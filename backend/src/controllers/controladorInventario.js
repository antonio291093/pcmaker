const {
  agregarOActualizarInventario,
  obtenerInventario,
  obtenerInventarioPorId,
  actualizarInventario,
  eliminarInventario,
  descontarStockInventario,
  aumentarStockInventario,
  validarStockInventario,
  crearInventarioGeneral,
  descontarStockVenta,
  insertarEquipoEnInventario,
  obtenerEquiposArmados,
  actualizarEquipoArmado,
  obtenerMemoriasRamDisponibles,
  obtenerAlmacenamientosDisponibles,
  insertarInventarioRecepcionDirecta,
  obtenerInventarioRecepcionDirecta,
  obtenerEquipoPorInventario,
  traspasarInventario,
  eliminarInventarioRecepcionDirecta,
} = require("../models/inventario");

exports.eliminarRecepcionDirecta = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "ID de inventario es obligatorio"
      });
    }

    const eliminado = await eliminarInventarioRecepcionDirecta(id);

    if (!eliminado) {
      return res.status(404).json({
        message: "Inventario no encontrado o no es de recepción directa"
      });
    }

    res.json({
      success: true,
      message: "Inventario de recepción directa eliminado correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar recepción directa:", error);
    res.status(500).json({
      message: "Error al eliminar recepción directa"
    });
  }
};

exports.obtenerEquipoPorInventario = async (req, res) => {
  const inventarioId = parseInt(req.params.inventario_id);

  if (isNaN(inventarioId)) {
    return res.status(400).json({
      message: "Parámetro 'inventario_id' inválido"
    });
  }

  try {
    const equipo = await obtenerEquipoPorInventario(inventarioId);

    if (!equipo) {
      return res.status(404).json({
        message: "No se encontró equipo para este inventario"
      });
    }

    res.json(equipo);
  } catch (error) {
    console.error("Error al obtener equipo por inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};


exports.obtenerInventarioRecepcionDirecta = async (req, res) => {
  try {
    const { sucursal_id } = req.query;

    const inventario = await obtenerInventarioRecepcionDirecta(sucursal_id);

    res.json(inventario);
  } catch (error) {
    console.error("Error al obtener inventario de recepción directa:", error);
    res.status(500).json({
      message: "Error al obtener inventario de recepción directa",
    });
  }
};


exports.registrarRecepcionDirecta = async (req, res) => {
  try {
    const {
      sucursal_id,
      cantidad,
      precio,

      modelo,
      procesador,
      ram_gb,
      ram_tipo,
      almacenamiento_gb,
      almacenamiento_tipo,
      observaciones
    } = req.body;

    if (!modelo || !procesador) {
      return res.status(400).json({
        message: "Modelo y procesador son obligatorios"
      });
    }

    const nuevo = await insertarInventarioRecepcionDirecta({
      sucursal_id,
      cantidad,
      precio,

      modelo,
      procesador,
      ram_gb,
      ram_tipo,
      almacenamiento_gb,
      almacenamiento_tipo,
      observaciones
    });

    res.status(201).json({
      success: true,
      data: nuevo
    });
  } catch (error) {
    console.error("Error en recepción directa:", error);
    res.status(500).json({
      message: "Error al registrar recepción directa"
    });
  }
};

exports.actualizarEquipoArmado = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const resultado = await actualizarEquipoArmado(id, data);
    res.json(resultado);
  } catch (error) {
    console.error("Error en controlador al actualizar equipo armado:", error);
    res.status(500).json({ message: "Error al actualizar equipo armado" });
  }
};

exports.obtenerMemoriasRamDisponibles = async (req, res) => {
  try {
    const rams = await obtenerMemoriasRamDisponibles();
    res.json(rams);
  } catch (error) {
    console.error("Error al obtener memorias RAM disponibles:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.obtenerAlmacenamientosDisponibles = async (req, res) => {
  try {
    const almacenamientos = await obtenerAlmacenamientosDisponibles();
    res.json(almacenamientos);
  } catch (error) {
    console.error("Error al obtener almacenamientos disponibles:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.registrarEquipo = async (req, res) => {
  try {
    const { equipo_id, sucursal_id, precio } = req.body;

    if (!equipo_id) {
      return res
        .status(400)
        .json({ error: "El campo equipo_id es obligatorio." });
    }

    const nuevoRegistro = await insertarEquipoEnInventario(
      equipo_id,
      sucursal_id,
      precio
    );

    res.status(201).json({
      success: true,
      message: "Equipo registrado en inventario correctamente.",
      data: nuevoRegistro,
    });
  } catch (error) {
    console.error("Error registrando equipo en inventario:", error);
    res.status(500).json({ error: "Error registrando equipo en inventario." });
  }
};

exports.aumentarStockInventario = async (req, res) => {
  try {
    const { memoria_ram_id, almacenamiento_id, cantidad } = req.body;
    const itemActualizado = await aumentarStockInventario({
      memoria_ram_id,
      almacenamiento_id,
      cantidad,
    });
    res.json(itemActualizado);
  } catch (error) {
    console.error("Error aumentando stock inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.descontarStockInventario = async (req, res) => {
  try {
    const { memoria_ram_id, almacenamiento_id, cantidad, sucursal_id } =
      req.body;
    const itemActualizado = await descontarStockInventario({
      memoria_ram_id,
      almacenamiento_id,
      cantidad,
      sucursal_id,
    });
    res.json(itemActualizado);
  } catch (error) {
    console.error("Error descontando stock inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.crearInventario = async (req, res) => {
  try {
    const item = await agregarOActualizarInventario(req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error("Error creando inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.crearInventarioGeneral = async (req, res) => {
  try {
    const nuevo = await crearInventarioGeneral(req.body);
    res.status(201).json(nuevo);
  } catch (error) {
    console.error("Error al crear inventario general:", error);
    res.status(500).json({ message: "Error al crear inventario general" });
  }
};

exports.obtenerInventario = async (req, res) => {
  try {
     const { sucursal_id } = req.query;

    const items = await obtenerInventario(sucursal_id);
    res.json(items);    
  } catch (error) {
    console.error("Error al obtener inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.obtenerEquiposArmados = async (req, res) => {
  try {
    let { sucursal_id } = req.query;

    if (sucursal_id === "null" || sucursal_id === "undefined" || !sucursal_id) {
      sucursal_id = null;
    } else {
      sucursal_id = parseInt(sucursal_id);
      if (isNaN(sucursal_id)) sucursal_id = null;
    }

    const equipos = await obtenerEquiposArmados(sucursal_id);
    res.json(equipos);
  } catch (error) {
    console.error("Error al obtener equipos armados:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.obtenerInventarioPorId = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const item = await obtenerInventarioPorId(id);
    if (!item) {
      return res.status(404).json({ message: "Ítem no encontrado" });
    }
    res.json(item);
  } catch (error) {
    console.error("Error al obtener ítem inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.actualizarInventario = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;

    const actualizado = await actualizarInventario(id, datos);

    if (!actualizado)
      return res.status(404).json({ message: "Inventario no encontrado" });

    res.json(actualizado);
  } catch (error) {
    console.error("Error al actualizar inventario:", error);
    res.status(500).json({ message: "Error al actualizar inventario" });
  }
};

exports.eliminarInventario = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const itemEliminado = await eliminarInventario(id);
    if (!itemEliminado) {
      return res.status(404).json({ message: "Ítem no encontrado" });
    }
    res.json({ message: "Ítem eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar inventario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.validarStockInventario = async (req, res) => {
  try {
    const { memoria_ram_id, almacenamiento_id, cantidad, sucursal_id } =
      req.query;
    if (!cantidad)
      return res.status(400).json({ error: "Debe indicar cantidad a validar" });

    const cantidadNum = parseInt(cantidad);
    const tieneStock = await validarStockInventario({
      memoria_ram_id: memoria_ram_id ? parseInt(memoria_ram_id) : null,
      almacenamiento_id: almacenamiento_id ? parseInt(almacenamiento_id) : null,
      cantidad: cantidadNum,
      sucursal_id: sucursal_id,
    });

    res.json({ tieneStock });
  } catch (error) {
    console.error("Error validando stock:", error);
    res.status(500).json({ error: "Error interno al validar stock" });
  }
};

exports.descontarStockVenta = async (req, res) => {
  try {
    const { productos, sucursal_id } = req.body;
    
    if (!sucursal_id || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        message: "sucursal_id y al menos un producto son requeridos",
      });
    }

    const resultados = [];
   
    for (const item of productos) {
      const { producto_id, cantidad_vendida } = item;

      if (!producto_id || !cantidad_vendida) {
        return res.status(400).json({
          message: "Cada producto debe tener producto_id y cantidad_vendida",
        });
      }

      const actualizado = await descontarStockVenta({
        producto_id,
        cantidad: cantidad_vendida,
        sucursal_id,
      });

      resultados.push(actualizado);
    }

    res.status(200).json({
      message: "Stock actualizado correctamente para todos los productos",
      resultados,
    });
  } catch (error) {
    console.error("❌ Error al descontar stock desde venta:", error);
    res.status(500).json({
      message: "Error en el servidor al descontar stock",
      error: error.message,
    });
  }
};


exports.traspasarInventario = async (req, res) => {
  try {
    const { id } = req.params;
    const { sucursal_id } = req.body;

    if (!sucursal_id) {
      return res
        .status(400)
        .json({ message: "La sucursal es requerida para el traspaso" });
    }

    const actualizado = await traspasarInventario(id, sucursal_id);

    if (!actualizado) {
      return res
        .status(404)
        .json({ message: "Inventario no encontrado" });
    }

    res.json(actualizado);
  } catch (error) {
    console.error("Error al traspasar inventario:", error);
    res.status(500).json({ message: "Error al traspasar inventario" });
  }
};

