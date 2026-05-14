import * as XLSX from 'xlsx'

// ── tipos (espejo de los componentes que los usan) ────────────────────────────

type SucursalResumen = {
  id: number
  nombre: string
  ingresos: number
  gastos: number
  neto: number
  corte_realizado: boolean
}

type DeletedItem = {
  id: number
  tipo_articulo: string
  descripcion: string
  especificaciones: string | null
  serie: string | null
  codigo_barras: string | null
  precio: string
  sucursal: string
  eliminado_por: string | null
  motivo_eliminacion: string
  fecha_eliminacion: string
}

interface ResumenPersona {
  usuario_id: number
  nombre: string
  rol: string
  cantidad: number
  total_comisiones: number
  por_venta: number
  por_armado: number
  por_mantenimiento: number
}

interface DetalleComision {
  id: number
  tipo: 'venta' | 'armado' | 'mantenimiento'
  monto: number
  fecha_creacion: string
  vendedor: string
  venta: { id: number; cliente: string; total_venta: number } | null
  equipo: { nombre: string; precio: number } | null
  mantenimiento: { id: number; descripcion: string } | null
}

interface Cliente {
  id: number
  nombre: string
  telefono: string | null
  correo: string | null
  sucursal: string | null
  numero_visitas: number
  total_gastado: number
  ultima_compra: string | null
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX')
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function descDetalle(c: DetalleComision): string {
  if (c.tipo === 'venta'         && c.venta)         return `Venta #${c.venta.id} — ${c.venta.cliente}`
  if (c.tipo === 'armado'        && c.equipo)        return c.equipo.nombre
  if (c.tipo === 'mantenimiento' && c.mantenimiento) return c.mantenimiento.descripcion
  return '—'
}

const tipoLabel: Record<string, string> = {
  venta:         'Venta',
  armado:        'Armado',
  mantenimiento: 'Servicio',
}

function autoWidth(ws: XLSX.WorkSheet, data: Record<string, unknown>[]) {
  const headers = Object.keys(data[0] || {})
  ws['!cols'] = headers.map(h => ({
    wch: Math.max(
      h.length,
      ...data.map(row => String(row[h] ?? '').length)
    ) + 2,
  }))
}

// ── exportaciones ─────────────────────────────────────────────────────────────

export function exportResumenDiario(sucursales: SucursalResumen[], fecha: string) {
  const data = sucursales.map(s => ({
    Sucursal:          s.nombre,
    Ingresos:          Number(s.ingresos),
    Gastos:            Number(s.gastos),
    Neto:              Number(s.neto),
    'Corte Realizado': s.corte_realizado ? 'Sí' : 'No',
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  autoWidth(ws, data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Resumen')
  XLSX.writeFile(wb, `resumen_diario_${fecha}.xlsx`)
}

export function exportArticulosEliminados(items: DeletedItem[]) {
  const data = items.map(i => ({
    'Fecha Eliminación': fmtFecha(i.fecha_eliminacion),
    Tipo:                i.tipo_articulo,
    Descripción:         i.descripcion,
    Especificaciones:    i.especificaciones ?? '',
    Serie:               i.serie ?? '',
    'Código de Barras':  i.codigo_barras?.startsWith('data:') ? '' : (i.codigo_barras ?? ''),
    Precio:              Number(i.precio),
    Sucursal:            i.sucursal,
    'Eliminado Por':     i.eliminado_por ?? 'Sin registro',
    Motivo:              i.motivo_eliminacion,
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  autoWidth(ws, data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Eliminados')
  XLSX.writeFile(wb, `articulos_eliminados_${hoy()}.xlsx`)
}

export function exportComisiones(
  resumen: ResumenPersona[],
  detalle: DetalleComision[],
  fechaInicio: string,
  fechaFin: string
) {
  const dataResumen = resumen.map(p => ({
    Nombre:          p.nombre,
    Rol:             p.rol,
    Comisiones:      p.cantidad,
    Total:           Number(p.total_comisiones),
    'Por Ventas':    Number(p.por_venta),
    'Por Armados':   Number(p.por_armado),
    'Por Servicios': Number(p.por_mantenimiento),
  }))

  const dataDetalle = detalle.map(c => ({
    Fecha:                fmtFecha(c.fecha_creacion),
    'Vendedor / Técnico': c.vendedor,
    Tipo:                 tipoLabel[c.tipo] ?? c.tipo,
    Descripción:          descDetalle(c),
    Monto:                Number(c.monto),
  }))

  const wsResumen = XLSX.utils.json_to_sheet(dataResumen)
  autoWidth(wsResumen, dataResumen)

  const wsDetalle = XLSX.utils.json_to_sheet(dataDetalle)
  autoWidth(wsDetalle, dataDetalle)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle')
  XLSX.writeFile(wb, `comisiones_${fechaInicio}_a_${fechaFin}.xlsx`)
}

export function exportCarteraClientes(clientes: Cliente[]) {
  const data = clientes.map(c => ({
    Nombre:          c.nombre,
    Teléfono:        c.telefono ?? '',
    Correo:          c.correo ?? '',
    Sucursal:        c.sucursal ?? '',
    Visitas:         c.numero_visitas,
    'Total Gastado': Number(c.total_gastado),
    'Última Compra': c.ultima_compra ? fmtFecha(c.ultima_compra) : '',
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  autoWidth(ws, data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
  XLSX.writeFile(wb, `cartera_clientes_${hoy()}.xlsx`)
}
