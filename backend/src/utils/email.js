const nodemailer = require("nodemailer");

const { obtenerDatosTicket } = require("../models/ventas");
const { generarTicketVentaPDF } = require("./pdf/generarTicketVenta");
const { obtenerDatosGarantia } = require("../models/garantias");
const { generarGarantiaPDF } = require("./pdf/generarGarantia");

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function enviarEmailVenta(destinatario, ventaId) {
  // ── Ticket ──────────────────────────────────────────────
  const datosTicket = await obtenerDatosTicket(ventaId);

  if (!datosTicket || !datosTicket.items.length) {
    throw new Error(`No se encontraron datos de ticket para la venta ${ventaId}`);
  }

  const { venta, items: itemsRaw } = datosTicket;

  const items = itemsRaw.map((p) => ({
    descripcion: p.descripcion,
    cantidad: p.cantidad,
    precio_unitario: Number(p.precio),
    total: Number(p.precio) * p.cantidad,
  }));

  const ticketBytes = await generarTicketVentaPDF({
    ventaId,
    sucursal_id: venta.sucursal_id,
    fecha: formatearFecha(venta.fecha_venta),
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

  // ── Adjuntos ────────────────────────────────────────────
  const attachments = [
    {
      filename: `ticket_venta_${ventaId}.pdf`,
      content: Buffer.from(ticketBytes),
      contentType: "application/pdf",
    },
  ];

  // ── Garantía (opcional) ─────────────────────────────────
  // Si la venta no tiene equipos/productos con garantía, se omite silenciosamente.
  const datosGarantia = await obtenerDatosGarantia(ventaId);

  if (datosGarantia && datosGarantia.equiposRaw.length) {
    const { venta: ventaGarantia, equiposRaw } = datosGarantia;

    const equipos = equiposRaw.map((e) => ({
      cantidad: e.cantidad,
      descripcion: e.descripcion,
      procesador: e.procesador || "",
      ram: e.ram || "",
      disco: e.disco || "",
      precio: Number(e.precio),
    }));

    const totalGarantia = equipos.reduce(
      (acc, e) => acc + e.precio * e.cantidad,
      0,
    );

    const garantiaBytes = await generarGarantiaPDF({
      sucursal_id: ventaGarantia.sucursal_id,
      cliente: ventaGarantia.cliente,
      equipos,
      total: totalGarantia,
      fecha: formatearFecha(ventaGarantia.fecha_venta),
    });

    attachments.push({
      filename: `garantia_venta_${ventaId}.pdf`,
      content: Buffer.from(garantiaBytes),
      contentType: "application/pdf",
    });
  }

  // ── Transporter (Resend SMTP) ────────────────────────────
  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: process.env.RESEND_API_KEY,
    },
  });

  // ── Envío ───────────────────────────────────────────────
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; line-height: 1.6;">
      <h2 style="color: #0f172a;">¡Gracias por tu compra en PCMaker!</h2>
      <p>Hola${venta.cliente ? ` ${venta.cliente}` : ""},</p>
      <p>
        Adjuntamos tu <strong>ticket de compra</strong>${
          attachments.length > 1
            ? " y la <strong>garantía</strong> de tus equipos"
            : ""
        } en formato PDF.
      </p>
      <p>Conserva estos documentos para cualquier aclaración o trámite de garantía.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #64748b;">
        PCMaker &middot; pcmaker.mx<br />
        Este es un correo automático, por favor no respondas a este mensaje.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: "PCMaker <ventas@pcmaker.mx>",
    to: destinatario,
    subject: "Tu compra en PCMaker - Ticket y Garantía",
    html,
    attachments,
  });
}

module.exports = { enviarEmailVenta };
