const {
  crearSolicitud,
  obtenerSolicitudes,
  obtenerSolicitudPorId,
  asignarTecnico,
  registrarDiagnostico,
  resolverGarantia,
  obtenerVentaElegible,
} = require("../models/garantiaSolicitud");

// ==========================
// CREAR
// ==========================
exports.crear = async (req, res) => {
  try {
    const creado_por = req.userId;
    const { venta_id, motivo_cliente, items } = req.body;

    if (!venta_id || !motivo_cliente || !Array.isArray(items) || !items.length) {
      return res.status(400).json({
        message: "venta_id, motivo_cliente e items son requeridos",
      });
    }

    const solicitud = await crearSolicitud({
      venta_id: Number(venta_id),
      motivo_cliente,
      creado_por,
      items,
    });

    res.status(201).json(solicitud);
  } catch (error) {
    console.error("Error al crear solicitud de garantía:", error);
    const status = /no encontrada|no encontrado/i.test(error.message) ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

// ==========================
// LISTAR
// ==========================
exports.listar = async (req, res) => {
  try {
    const { sucursal_id, estado, limit, offset } = req.query;

    const resultado = await obtenerSolicitudes({
      sucursal_id: sucursal_id ? Number(sucursal_id) : undefined,
      estado: estado || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json(resultado);
  } catch (error) {
    console.error("Error al listar solicitudes de garantía:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// ==========================
// DETALLE
// ==========================
exports.detalle = async (req, res) => {
  try {
    const solicitud = await obtenerSolicitudPorId(Number(req.params.id));
    if (!solicitud) {
      return res.status(404).json({ message: "Solicitud de garantía no encontrada" });
    }
    res.json(solicitud);
  } catch (error) {
    console.error("Error al obtener solicitud de garantía:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// ==========================
// ASIGNAR TÉCNICO
// ==========================
exports.asignarTecnico = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { tecnico_id } = req.body;

    if (!tecnico_id) {
      return res.status(400).json({ message: "tecnico_id es requerido" });
    }

    const actualizada = await asignarTecnico(id, Number(tecnico_id));
    if (!actualizada) {
      return res.status(409).json({
        message: "La solicitud no existe o ya no admite asignación de técnico",
      });
    }

    res.json(actualizada);
  } catch (error) {
    console.error("Error al asignar técnico:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// ==========================
// REGISTRAR DIAGNÓSTICO
// ==========================
exports.diagnostico = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { diagnostico, aplica, motivo_rechazo } = req.body;

    if (!diagnostico || typeof aplica !== "boolean") {
      return res.status(400).json({
        message: "diagnostico y aplica (boolean) son requeridos",
      });
    }
    if (!aplica && !motivo_rechazo) {
      return res.status(400).json({
        message: "motivo_rechazo es requerido cuando aplica es false",
      });
    }

    const actualizada = await registrarDiagnostico(id, { diagnostico, aplica, motivo_rechazo });
    if (!actualizada) {
      return res.status(409).json({
        message: "La solicitud no existe o no está en revisión",
      });
    }

    res.json(actualizada);
  } catch (error) {
    console.error("Error al registrar diagnóstico:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// ==========================
// ARTÍCULOS ELEGIBLES DE UNA VENTA
// ==========================
exports.elegibles = async (req, res) => {
  try {
    const ventaId = Number(req.params.venta_id);
    if (!Number.isFinite(ventaId)) {
      return res.status(400).json({ message: "Número de venta inválido" });
    }

    const data = await obtenerVentaElegible(ventaId);
    if (!data) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error al obtener artículos elegibles:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// ==========================
// RESOLVER
// ==========================
exports.resolver = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.userId;
    const { tipo_resolucion, monto_diferencia, componentes, reemplazo_inventario_id } = req.body;

    if (!tipo_resolucion) {
      return res.status(400).json({ message: "tipo_resolucion es requerido" });
    }

    const resuelta = await resolverGarantia(id, {
      tipo_resolucion,
      monto_diferencia: monto_diferencia ? Number(monto_diferencia) : 0,
      componentes,
      reemplazo_inventario_id: reemplazo_inventario_id ? Number(reemplazo_inventario_id) : undefined,
      userId,
    });

    res.json(resuelta);
  } catch (error) {
    console.error("Error al resolver garantía:", error);
    const status = /no encontrada|no encontrado/i.test(error.message) ? 404
                 : /Stock insuficiente|Sin stock/i.test(error.message) ? 409
                 : 400;
    res.status(status).json({ message: error.message });
  }
};
