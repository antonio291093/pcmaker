import * as XLSX from 'xlsx'

function formatFechaExcel(fecha: string) {
  const d = new Date(fecha)
  return d.toLocaleDateString('es-MX')
}

export function exportVentasExcel(ventas: any[]) {
  const data = ventas.map(v => ({
    Fecha: formatFechaExcel(v.fecha_venta),
    Cantidad: v.cantidad,
    Equipo: v.descripcion,
    Especificaciones: v.especificaciones,
    Cliente: v.cliente,
    Pago: v.metodo_pago,
    Monto: Number(v.subtotal)
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, ws, 'Ventas')

  XLSX.writeFile(
    wb,
    `reporte_ventas_${new Date().toISOString().slice(0, 10)}.xlsx`
  )
}
