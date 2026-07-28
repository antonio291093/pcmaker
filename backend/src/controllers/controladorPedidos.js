const pedidosModel = require('../models/pedido');
const inventarioModel = require('../models/inventario');

const TIPOS_VALIDOS = ['sin_revisar', 'recepcion_directa', 'armado'];
const ESTADOS_EQUIPO_PERMITIDOS = [1, 2, 3, 4];
const ESTADOS_PEDIDO_VALIDOS = ['pendiente', 'en_preparacion', 'listo', 'completado'];

function mapearError(error) {
  const msg = error.message || '';
  if (msg.includes('no encontrado')) return 404;
  if (msg.includes('no existen')) return 404;
  if (msg.includes('ya está en un pedido activo')) return 409;
  if (msg.includes('no pertenece a la sucursal de origen')) return 409;
  if (msg.includes('No se puede cambiar')) return 409;
  if (msg.includes('No se puede cancelar')) return 409;
  if (msg.includes('inválido') || msg.includes('obligator')) return 400;
  return 500;
}

exports.crear = async (req, res) => {
  try {
    const {
      sucursal_origen_id,
      sucursal_destino_id,
      tecnico_id,
      detalle,
      items
    } = req.body;
    const creado_por = req.userId;

    if (!detalle?.trim()) {
      return res.status(400).json({ message: 'El detalle es obligatorio' });
    }
    if (!sucursal_origen_id || !sucursal_destino_id) {
      return res.status(400).json({ message: 'Sucursal de origen y destino son obligatorias' });
    }
    if (Number(sucursal_origen_id) === Number(sucursal_destino_id)) {
      return res.status(400).json({ message: 'La sucursal de origen y destino no pueden ser la misma' });
    }
    if (!tecnico_id) {
      return res.status(400).json({ message: 'El técnico responsable es obligatorio' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Debe incluir al menos un item' });
    }

    for (const item of items) {
      if (!TIPOS_VALIDOS.includes(item.tipo)) {
        return res.status(400).json({ message: `Tipo de item inválido: ${item.tipo}` });
      }
      if (item.tipo !== 'recepcion_directa' && !ESTADOS_EQUIPO_PERMITIDOS.includes(item.estado_id)) {
        return res.status(400).json({ message: `El equipo ${item.equipo_id} no tiene un estado permitido para pedido` });
      }
      if (item.tipo === 'armado') {
        const stock = await inventarioModel.obtenerStockEquipo(item.equipo_id);
        if (stock <= 0) {
          return res.status(400).json({ message: `El equipo ${item.equipo_id} no tiene stock disponible` });
        }
      }
    }

    const itemsNormalizados = items.map(item => ({
      tipo: item.tipo,
      equipo_id: item.equipo_id || null,
      inventario_id: item.inventario_id || null,
      estado_equipo_al_pedir: item.estado_id || null
    }));

    const pedido = await pedidosModel.crearPedido({
      sucursal_origen_id,
      sucursal_destino_id,
      creado_por,
      tecnico_id,
      detalle,
      items: itemsNormalizados
    });

    res.status(201).json({ message: 'Pedido generado correctamente', pedido });
  } catch (error) {
    console.error('Error al crear pedido:', error);
    res.status(mapearError(error)).json({ message: error.message || 'Error en el servidor' });
  }
};

exports.listar = async (req, res) => {
  try {
    const { estado, sucursal_id, limit, offset } = req.query;

    const pedidos = await pedidosModel.obtenerPedidos({
      estado: estado || undefined,
      sucursal_id: sucursal_id ? Number(sucursal_id) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined
    });

    res.json(pedidos);
  } catch (error) {
    console.error('Error al listar pedidos:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.detalle = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const pedido = await pedidosModel.obtenerPedidoPorId(id);

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    res.json(pedido);
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { estado } = req.body;

    if (!estado || !ESTADOS_PEDIDO_VALIDOS.includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const pedido = await pedidosModel.cambiarEstadoPedido(id, estado);
    res.json({ message: 'Estado actualizado', pedido });
  } catch (error) {
    console.error('Error al cambiar estado del pedido:', error);
    res.status(mapearError(error)).json({ message: error.message || 'Error en el servidor' });
  }
};

exports.equiposDisponibles = async (req, res) => {
  try {
    const { sucursal_id } = req.query;

    if (!sucursal_id) {
      return res.status(400).json({ message: 'sucursal_id es obligatorio' });
    }

    const equipos = await pedidosModel.obtenerEquiposDisponibles(Number(sucursal_id));
    res.json(equipos);
  } catch (error) {
    console.error('Error al obtener equipos disponibles para pedido:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.cancelar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { motivo } = req.body;
    const cancelado_por = req.userId;

    const pedido = await pedidosModel.cancelarPedido(id, { cancelado_por, motivo });
    res.json({ message: 'Pedido cancelado', pedido });
  } catch (error) {
    console.error('Error al cancelar pedido:', error);
    res.status(mapearError(error)).json({ message: error.message || 'Error en el servidor' });
  }
};
