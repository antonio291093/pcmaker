const fs = require('fs')
const path = require('path')
const { PDFDocument, StandardFonts } = require('pdf-lib')

function drawRightText(page, text, x, y, font, size) {
  const textWidth = font.widthOfTextAtSize(text, size)

  page.drawText(text, {
    x: x - textWidth,
    y,
    size,
    font
  })
}

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

  // HEADER
  page.drawText(fecha || '', { x: 220, y: 415, size: 12, font })

  page.drawText(cliente || '', { x: 220, y: 365, size: 12, font })

  page.drawText(telefono || '', { x: 220, y: 345, size: 12, font })

  page.drawText(email || '', { x: 220, y: 325, size: 12, font })

  page.drawText(vendedor || '', { x: 540, y: 310, size: 12, font })

  // ITEMS
  let startY = 230
  const rowGap = 18

  items.slice(0, 12).forEach((item, index) => {

    const y = startY - (index * rowGap)

    const cantidad = Number(item.cantidad)
    const precioUnitario = Number(item.precio_unitario)
    const totalItem = cantidad * precioUnitario

    // descripcion
    page.drawText(item.descripcion || '', {
      x: 165,
      y,
      size: fontSize,
      font
    })

    // cantidad
    drawRightText(
      page,
      String(cantidad),
      470,
      y,
      font,
      fontSize
    )

    // precio unitario
    drawRightText(
      page,
      `$${precioUnitario.toFixed(2)}`,
      560,
      y,
      font,
      fontSize
    )

    // total item
    drawRightText(
      page,
      `$${totalItem.toFixed(2)}`,
      640,
      y,
      font,
      fontSize
    )

  })

  // TOTALES
  if (requiere_factura) {

    page.drawText("IVA:", {
      x: 560,
      y: 160,
      size: 12,
      font
    })

    drawRightText(
      page,
      `$${Number(iva).toFixed(2)}`,
      640,
      160,
      font,
      12
    )

    drawRightText(
      page,
      `$${Number(total).toFixed(2)}`,
      640,
      145,
      font,
      12
    )

  } else {

    drawRightText(
      page,
      `$${Number(total).toFixed(2)}`,
      640,
      145,
      font,
      12
    )

  }

  return await pdfDoc.save()
}

module.exports = { generarTicketVentaPDF }