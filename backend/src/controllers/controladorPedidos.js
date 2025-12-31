const pedidosModel = require('../models/pedido');
const inventarioModel = require('../models/inventario');

exports.crearPedido = async (req, res) => {
  try {
    const { detalle, sucursalDestinoId, tecnicoId, equipos } = req.body;
    const usuarioId = req.user.id;

    // 🔒 Validaciones base
    if (!detalle?.trim()) {
      return res.status(400).json({ message: 'El detalle es obligatorio' });
    }

    if (!Array.isArray(equipos) || equipos.length === 0) {
      return res.status(400).json({ message: 'Debe incluir al menos un equipo' });
    }

    if (!sucursalDestinoId || !tecnicoId) {
      return res.status(400).json({ message: 'Sucursal y técnico son obligatorios' });
    }

    // Estados permitidos
    const estadosPermitidos = [2, 4];

    for (const eq of equipos) {

      if (!estadosPermitidos.includes(eq.estado_id)) {
        return res.status(400).json({
          message: `Equipo ${eq.id} no permitido para pedido`
        });
      }

      // 🔐 VALIDACIÓN CLAVE DE INVENTARIO
      if (eq.estado_id === 4) { // Armado
        const stock = await inventarioModel.obtenerStockEquipo(eq.id);

        if (stock <= 0) {
          return res.status(400).json({
            message: `El equipo ${eq.id} no tiene stock disponible`
          });
        }
      }
    }

    // ✔️ Crear pedido si todo es válido
    const pedidoId = await pedidosModel.crearPedido({
      detalle,
      sucursalDestinoId,
      tecnicoId,
      creadoPor: usuarioId,
      equipos
    });

    res.status(201).json({
      message: 'Pedido generado correctamente',
      pedidoId
    });

  } catch (error) {
    console.error('Error al crear pedido:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};
