'use client'
import { useState, useEffect } from 'react'
import { API_URL } from '@/utils/api'
import { toDateString } from '@/utils/fecha'

// ── tipos ──────────────────────────────────────────────────────────────────

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

interface Sucursal {
  id: number
  nombre: string
}

// ── helpers de fecha ───────────────────────────────────────────────────────

function semanaActual(): { inicio: string; fin: string } {
  const hoy = new Date()
  const dia = hoy.getDay()
  const diffLunes = dia === 0 ? -6 : 1 - dia

  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() + diffLunes)

  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)

  return { inicio: toDateString(lunes), fin: toDateString(domingo) }
}

// ── badges ─────────────────────────────────────────────────────────────────

const rolColor: Record<string, string> = {
  Admin:    'bg-purple-100 text-purple-700',
  Técnico:  'bg-blue-100 text-blue-700',
  Ventas:   'bg-green-100 text-green-700',
}

const tipoBadge: Record<string, string> = {
  venta:        'bg-indigo-100 text-indigo-700',
  armado:       'bg-green-100 text-green-700',
  mantenimiento:'bg-amber-100 text-amber-700',
}

const tipoLabel: Record<string, string> = {
  venta:        'Venta',
  armado:       'Armado',
  mantenimiento:'Servicio',
}

// ── componente principal ───────────────────────────────────────────────────

export default function ComisionesReporte() {
  const semana = semanaActual()

  const [fechaInicio, setFechaInicio] = useState(semana.inicio)
  const [fechaFin,    setFechaFin]    = useState(semana.fin)
  const [sucursalId,  setSucursalId]  = useState<number | null>(null)

  const [sucursales,    setSucursales]    = useState<Sucursal[]>([])
  const [resumen,       setResumen]       = useState<ResumenPersona[]>([])
  const [detalle,       setDetalle]       = useState<DetalleComision[]>([])
  const [loading,       setLoading]       = useState(false)
  const [consultado,    setConsultado]    = useState(false)
  const [filtroPersona, setFiltroPersona] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/sucursales`, { credentials: 'include' })
      .then(r => r.json())
      .then(setSucursales)
      .catch(() => {})
  }, [])

  const consultar = async () => {
    setLoading(true)
    setFiltroPersona(null)
    try {
      const params = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      if (sucursalId) params.append('sucursal_id', String(sucursalId))

      const resp = await fetch(`${API_URL}/api/comisiones/reporte?${params}`, {
        credentials: 'include',
      })

      if (!resp.ok) throw new Error('Error al obtener reporte')

      const data = await resp.json()
      setResumen(data.resumen)
      setDetalle(data.detalle)
      setConsultado(true)
    } catch {
      setResumen([])
      setDetalle([])
    } finally {
      setLoading(false)
    }
  }

  const descripcionDetalle = (c: DetalleComision): string => {
    if (c.tipo === 'venta' && c.venta)
      return `Venta #${c.venta.id} — ${c.venta.cliente}`
    if (c.tipo === 'armado' && c.equipo)
      return c.equipo.nombre
    if (c.tipo === 'mantenimiento' && c.mantenimiento)
      return c.mantenimiento.descripcion
    return '—'
  }

  const nombreFiltrado = filtroPersona !== null
    ? resumen.find(r => r.usuario_id === filtroPersona)?.nombre
    : null

  const detalleFiltrado = nombreFiltrado != null
    ? detalle.filter(c => c.vendedor === nombreFiltrado)
    : detalle

  const totalGeneral    = resumen.reduce((acc, p) => acc + Number(p.total_comisiones), 0)
  const cantidadGeneral = resumen.reduce((acc, p) => acc + p.cantidad, 0)

  return (
    <div className="space-y-6">

      {/* FILTROS */}
      <div className="flex flex-wrap items-end gap-4">

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 input-minimal"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Hasta</label>
          <input
            type="date"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 input-minimal"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Sucursal</label>
          <select
            value={sucursalId ?? ''}
            onChange={e => setSucursalId(e.target.value ? Number(e.target.value) : null)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 input-minimal"
          >
            <option value="">Todas</option>
            {sucursales.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <button
          onClick={consultar}
          disabled={loading}
          className={`px-5 py-2 rounded-lg text-white text-sm font-medium transition ${
            loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {loading ? 'Consultando...' : 'Consultar'}
        </button>

      </div>

      {/* ESTADO VACÍO INICIAL */}
      {!consultado && !loading && (
        <div className="border rounded-xl p-10 text-center text-gray-400 bg-gray-50">
          Selecciona un rango de fechas y presiona Consultar.
        </div>
      )}

      {/* SIN RESULTADOS */}
      {consultado && resumen.length === 0 && (
        <div className="border rounded-xl p-10 text-center text-gray-400 bg-gray-50">
          No hay comisiones en el período seleccionado.
        </div>
      )}

      {/* RESUMEN POR PERSONA */}
      {resumen.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Resumen por persona</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            {resumen.map(p => (
              <div
                key={p.usuario_id}
                onClick={() => setFiltroPersona(p.usuario_id)}
                className={`
                  border rounded-xl p-5 bg-white shadow-sm cursor-pointer
                  transition-all input-minimal
                  ${filtroPersona === p.usuario_id
                    ? 'ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50'
                    : 'hover:border-gray-300'}
                `}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-800">{p.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rolColor[p.rol] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.rol}
                  </span>
                </div>

                <div className="text-2xl font-bold text-indigo-700 mb-1">
                  ${Number(p.total_comisiones).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  {p.cantidad} comisión{p.cantidad !== 1 ? 'es' : ''}
                </div>

                <div className="space-y-1 text-xs text-gray-600">
                  {Number(p.por_venta) > 0 && (
                    <div className="flex justify-between">
                      <span>Por ventas</span>
                      <span className="font-medium">${Number(p.por_venta).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(p.por_armado) > 0 && (
                    <div className="flex justify-between">
                      <span>Por armados</span>
                      <span className="font-medium">${Number(p.por_armado).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(p.por_mantenimiento) > 0 && (
                    <div className="flex justify-between">
                      <span>Por servicios</span>
                      <span className="font-medium">${Number(p.por_mantenimiento).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* CARD "TODAS" */}
            <div
              onClick={() => setFiltroPersona(null)}
              className={`
                border rounded-xl p-5 bg-white shadow-sm cursor-pointer
                transition-all input-minimal
                ${filtroPersona === null
                  ? 'ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50'
                  : 'hover:border-gray-300'}
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-gray-800">Todas</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                  Total
                </span>
              </div>

              <div className="text-2xl font-bold text-indigo-700 mb-1">
                ${totalGeneral.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                {cantidadGeneral} comisión{cantidadGeneral !== 1 ? 'es' : ''}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DETALLE */}
      {detalle.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-3">
            Detalle de comisiones
            {nombreFiltrado && (
              <span className="ml-2 text-indigo-600 font-normal">— {nombreFiltrado}</span>
            )}
          </h3>
          <div className="overflow-x-auto rounded-xl border input-minimal">
            <table className="w-full text-sm text-gray-700">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Vendedor / Técnico</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detalleFiltrado.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(c.fecha_creacion).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3">{c.vendedor}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoBadge[c.tipo]}`}>
                        {tipoLabel[c.tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{descripcionDetalle(c)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-700">
                      ${Number(c.monto).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
