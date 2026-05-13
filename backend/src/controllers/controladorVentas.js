const { registrarVenta, obtenerDatosTicket } = require("../models/ventas");
const { generarTicketVentaPDF } = require("../utils/pdf/generarTicketVenta");

exports.generarTicketVenta = async (req, res) => {
  try {
    const { ventaId } = req.params;

    const datos = await obtenerDatosTicket(ventaId);

    if (!datos) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    const { venta, items: itemsRaw } = datos;

    if (!itemsRaw.length) {
      return res.status(404).json({ message: "La venta no tiene productos" });
    }

    const items = itemsRaw.map((p) => ({
      descripcion: p.descripcion,
      cantidad: p.cantidad,
      precio_unitario: Number(p.precio),
      total: Number(p.precio) * p.cantidad,
    }));

    const fecha = new Date(venta.fecha_venta).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const pdfBytes = await generarTicketVentaPDF({
      ventaId,
      sucursal_id: venta.sucursal_id,
      fecha,
      cliente: venta.cliente,
      telefono: venta.telefono || "",
      email: venta.correo || "",
      vendedor: venta.vendedor || "",
      items,
      subtotal: venta.subtotal,
      iva: venta.iva,
      total: venta.total,
      requiere_factura: venta.requiere_factura,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=ticket_venta_${ventaId}.pdf`,
    );

    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Error al generar ticket:", error);
    res.status(500).json({
      message: "Error al generar ticket de venta",
    });
  }
};

exports.crearVenta = async (req, res) => {
  try {
    const {
      cliente,
      telefono,
      correo,
      pagos = [],
      productos = [],
      servicios = [],
      observaciones,
      usuario_id,
      sucursal_id,
      subtotal,
      iva,
      total,
      requiere_factura,
    } = req.body;

    if (!cliente) {
      return res.status(400).json({
        message: "El cliente es obligatorio",
      });
    }

    if (productos.length === 0 && servicios.length === 0) {
      return res.status(400).json({
        message: "Debes registrar al menos un producto o un servicio",
      });
    }

    if (!pagos.length) {
      return res.status(400).json({
        message: "Debes registrar al menos un método de pago",
      });
    }

    const venta = await registrarVenta({
      cliente,
      telefono,
      correo,
      pagos,
      productos,
      servicios,
      observaciones,
      usuario_id,
      sucursal_id,
      subtotal,
      iva,
      total,
      requiere_factura,
    });

    res.status(201).json({
      message: "Venta registrada correctamente",
      ...venta,
    });
  } catch (error) {
    console.error("Error al registrar venta:", error);
    res.status(500).json({
      message: error.message || "Error al registrar venta",
    });
  }
};
