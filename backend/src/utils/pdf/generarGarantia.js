const fs = require('fs')
const path = require('path')
const { PDFDocument, StandardFonts } = require('pdf-lib')

async function generarGarantiaPDF({ sucursal_id, equipos, total, fecha }) {
  const garantiaTemplates = {
    1: 'garantia_base_saltillo.pdf',
    2: 'garantia_base_monterrey.pdf'    
  }

  const sucursal = Number(sucursal_id)

  const baseFile =
    garantiaTemplates[sucursal] ||
    'garantia_base_saltillo.pdf'

  const pdfPath = path.join(__dirname, baseFile)  
  const pdfBytes = fs.readFileSync(pdfPath)

  const pdfDoc = await PDFDocument.load(pdfBytes)
  const page = pdfDoc.getPages()[0]

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontSize = 9

  // 🔹 TUS COORDENADAS BASE (ya validadas)
  const baseYTop = 595   // línea Cantidad / Descripción / Procesador
  const baseYBottom = 570 // línea RAM / Disco / Precio
  const rowGap = 70       // separación entre equipos (ajustable) 

  page.drawText(fecha, {
        x: 425,
        y: 715,
        size: 9,
        font,
    })

  equipos.slice(0, 5).forEach((eq, index) => {
    const offset = index * rowGap    

    // 🖥️ Línea superior
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

    // 💾 Línea inferior
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

  // 🧮 Total (fijo, no depende de equipos)
  page.drawText(`$${Number(total).toFixed(2)}`, {
    x: 470,
    y: 320,
    size: 10,
    font,
  })

  const pdfFinal = await pdfDoc.save()
  return pdfFinal
}

module.exports = { generarGarantiaPDF }
