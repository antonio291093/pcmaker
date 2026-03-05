const fs = require('fs')
const path = require('path')
const { PDFDocument, StandardFonts } = require('pdf-lib')

  async function generarTicketVentaPDF({
    ventaId,
    sucursal_id,
    fecha,
    cliente,
    telefono,
    email,
    vendedor,
    items,
    subtotal,
    iva,
    total,
    requiere_factura
  }) {
  //console.log('🧠 DATA RECIBIDA EN PDF:', fecha, cliente, telefono, email, vendedor, items, total)
  const ticketTemplates = {
    1: 'ticket_base_saltillo.pdf',
    2: 'ticket_base_monterrey.pdf'    
  }

  const sucursal = Number(sucursal_id)
  const baseFile = ticketTemplates[sucursal] || 'ticket_base_saltillo.pdf'

  const pdfPath = path.join(__dirname, baseFile)
  const pdfBytes = fs.readFileSync(pdfPath)

  const pdfDoc = await PDFDocument.load(pdfBytes)
  const page = pdfDoc.getPages()[0]

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontSize = 12

  // 🔹 Header
  page.drawText(fecha, { x: 220, y: 415, size: 12, font })
  page.drawText(cliente || '', { x: 220, y: 365, size: 12, font })
  page.drawText(telefono || '', { x: 220, y: 345, size: 12, font })
  page.drawText(email || '', { x: 220, y: 325, size: 12, font })
  page.drawText(vendedor || '', { x: 540, y: 310, size: 12, font })

  // 🔹 Items
  let startY = 230
  const rowGap = 18

  items.slice(0, 12).forEach((item, index) => {
    const y = startY - index * rowGap

    page.drawText(item.descripcion, { x: 165, y, size: fontSize, font })

    page.drawText(String(item.cantidad), { x: 450, y, size: fontSize, font })

    page.drawText(`$${item.precio_unitario.toFixed(2)}`, {
      x: 520,
      y,
      size: fontSize,
      font,
    })

    if (requiere_factura) {
      page.drawText(`$${Number(subtotal).toFixed(2)}`, {
        x: 600,
        y,
        size: 12,
        font,
      })

      page.drawText("IVA:", {
        x: 560,
        y: 160,
        size: 12,
        font,
      })


      page.drawText(`$${Number(iva).toFixed(2)}`, {
        x: 600,
        y: 160,
        size: 12,
        font,
      })

      page.drawText(`$${Number(total).toFixed(2)}`, {
        x: 600,
        y: 145,
        size: 12,
        font,
      })

    } else {
      page.drawText(`$${Number(total).toFixed(2)}`, {
        x: 600,
        y,
        size: 12,
        font,
      })

      page.drawText(`$${Number(total).toFixed(2)}`, {
        x: 600,
        y: 145,
        size: 12,
        font,
      })

    }
  })  

  return await pdfDoc.save()
}

module.exports = { generarTicketVentaPDF }
