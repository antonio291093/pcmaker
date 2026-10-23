const fs = require('fs')
const path = require('path')
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')

// Cada plantilla tiene su propio layout de coordenadas
const garantiaTemplates = {
  1: { archivo: 'garantia_base_saltillo.pdf', dibujar: dibujarFormatoClasico },
  2: { archivo: 'garantia_base_monterrey.pdf', dibujar: dibujarFormatoCaracteristicas },
}

async function generarGarantiaPDF({ sucursal_id, equipos, total, fecha, fecha_venta }) {

  const template =
    garantiaTemplates[Number(sucursal_id)] ||
    garantiaTemplates[1]

  const pdfPath = path.join(__dirname, template.archivo)
  const pdfBytes = fs.readFileSync(pdfPath)

  const pdfDoc = await PDFDocument.load(pdfBytes)
  const page = pdfDoc.getPages()[0]

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  template.dibujar({ page, font, equipos, total, fecha, fecha_venta })

  const pdfFinal = await pdfDoc.save()

  return pdfFinal
}

// 📄 Formato de 5 líneas "Cantidad + Características" (Monterrey)
function dibujarFormatoCaracteristicas({ page, font, equipos, total, fecha_venta }) {

  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Monterrey',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).formatToParts(new Date(fecha_venta)).map(p => [p.type, p.value])
  )

  page.drawText(partes.day, { x: 353, y: 716.5, size: 11, font })
  page.drawText(partes.month, { x: 393, y: 716.5, size: 11, font })

  // El año viene impreso ("2026") en la plantilla: se tapa y se dibuja el real
  page.drawRectangle({ x: 491, y: 711, width: 31, height: 15, color: rgb(1, 1, 1) })
  page.drawText(partes.year, { x: 492.7, y: 714.5, size: 12, font })

  // Línea base de cada renglón "Cantidad: ____ Características: ____"
  const filasY = [593.4, 570.5, 547.5, 524.7, 501.8]

  equipos.slice(0, filasY.length).forEach((eq, index) => {

    const y = filasY[index] + 2

    page.drawText(String(eq.cantidad || 1), { x: 146, y, size: 10, font })

    const caracteristicas = [eq.descripcion, eq.procesador, eq.ram, eq.disco]
      .filter(Boolean)
      .join(' · ')

    const { texto, size } = ajustarTexto(caracteristicas, font, 264)
    page.drawText(texto, { x: 258, y, size, font })

  })

  // 🧮 TOTAL
  page.drawText(formatearMoneda(total), { x: 470, y: 147.7, size: 11, font })
}

// 📄 Formato de 3 bloques de equipo + productos simples (Saltillo)
function dibujarFormatoClasico({ page, font, equipos, total, fecha }) {

  const fontSize = 9

  const baseYTop = 595
  const baseYBottom = 570
  const rowGap = 70

  page.drawText(fecha, {
    x: 425,
    y: 715,
    size: 9,
    font,
  })

  // 🔹 Separar equipos de productos simples
  const equiposReales = equipos.filter(
    e => e.procesador || e.ram || e.disco
  )

  const productos = equipos.filter(
    e => !e.procesador && !e.ram && !e.disco
  )

  // 🖥️ EQUIPOS
  equiposReales.slice(0, 5).forEach((eq, index) => {

    const offset = index * rowGap

    page.drawText(String(eq.cantidad || 1), {
      x: 150,
      y: baseYTop - offset,
      size: fontSize,
      font,
    })

    page.drawText(eq.descripcion || '', {
      x: 240,
      y: baseYTop - offset,
      size: fontSize,
      font,
    })

    page.drawText(eq.procesador || '', {
      x: 425,
      y: baseYTop - offset,
      size: fontSize,
      font,
    })

    page.drawText(eq.ram || '', {
      x: 140,
      y: baseYBottom - offset,
      size: fontSize,
      font,
    })

    page.drawText(eq.disco || '', {
      x: 225,
      y: baseYBottom - offset,
      size: 8,
      font,
    })

    page.drawText(`$${Number(eq.precio || 0).toFixed(2)}`, {
      x: 450,
      y: baseYBottom - offset,
      size: fontSize,
      font,
    })

  })

  // 📦 PRODUCTOS DE INVENTARIO (debajo de equipos)
  const productosBaseY = 390
  const productosGap = 25

  productos.forEach((p, index) => {

    const y = productosBaseY - (index * productosGap)

    page.drawText(`${p.cantidad}`, {
      x: 150,
      y: y,
      size: 9,
      font
    })

    page.drawText(`${p.descripcion}`, {
      x: 240,
      y: y,
      size: 9,
      font
    })

    page.drawText(`$${Number(p.precio || 0).toFixed(2)}`, {
      x: 450,
      y: y,
      size: 9,
      font
    })

  })

  // 🧮 TOTAL
  page.drawText(`$${Number(total).toFixed(2)}`, {
    x: 470,
    y: 320,
    size: 10,
    font,
  })
}

// Reduce el tamaño hasta sizeMin; si aún no cabe, recorta con "…"
function ajustarTexto(texto, font, maxWidth, sizeMax = 10, sizeMin = 7) {
  for (let size = sizeMax; size >= sizeMin; size -= 0.5) {
    if (font.widthOfTextAtSize(texto, size) <= maxWidth) return { texto, size }
  }

  let recortado = texto
  while (recortado.length && font.widthOfTextAtSize(recortado + '…', sizeMin) > maxWidth) {
    recortado = recortado.slice(0, -1)
  }

  return { texto: recortado.trimEnd() + '…', size: sizeMin }
}

function formatearMoneda(valor) {
  return `$${Number(valor || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

module.exports = { generarGarantiaPDF }
