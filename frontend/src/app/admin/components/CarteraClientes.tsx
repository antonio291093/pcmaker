'use client'

import { useState, useEffect } from 'react'
import { API_URL } from '@/utils/api'

// ── tipos ──────────────────────────────────────────────────────────────────

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

interface VentaHistorial {
  id: number
  fecha_venta: string
  total: number
  sucursal: string | null
  metodos_pago: string | null
  num_articulos: number
}

interface ClienteDetalle extends Cliente {
  historial: VentaHistorial[]
}

interface Sucursal {
  id: number
  nombre: string
}

interface PaginaData {
  clientes: Cliente[]
  total: number
  pagina: number
  por_pagina: number
}

// ── helpers ────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX')
}

function fmtMoneda(n: number | string) {
  return `$${Number(n).toFixed(2)}`
}

// ── panel lateral ──────────────────────────────────────────────────────────

function PanelCliente({
  cliente,
  loading,
  onClose,
}: {
  cliente: ClienteDetalle | null
  loading: boolean
  onClose: () => void
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="flex items-start justify-between p-6 border-b">
          {loading || !cliente ? (
            <div className="text-sm text-gray-400">Cargando...</div>
          ) : (
            <div>
              <h3 className="text-lg font-bold text-gray-800">{cliente.nombre}</h3>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                {cliente.telefono && <span>{cliente.telefono}</span>}
                {cliente.correo   && <span>{cliente.correo}</span>}
                {cliente.sucursal && <span>{cliente.sucursal}</span>}
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-700 text-xl leading-none transition"
          >
            ✕
          </button>
        </div>

        {/* STATS */}
        {!loading && cliente && (
          <div className="grid grid-cols-3 divide-x border-b bg-gray-50">
            <div className="px-6 py-4 text-center">
              <div className="text-2xl font-bold text-indigo-700">
                {cliente.numero_visitas}
              </div>
              <div className="text-xs text-gray-500 mt-1">Visitas</div>
            </div>
            <div className="px-6 py-4 text-center">
              <div className="text-xl font-bold text-indigo-700">
                {fmtMoneda(cliente.total_gastado)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total gastado</div>
            </div>
            <div className="px-6 py-4 text-center">
              <div className="text-sm font-semibold text-gray-700">
                {cliente.ultima_compra ? fmtFecha(cliente.ultima_compra) : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Última compra</div>
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        <div className="flex-1 overflow-y-auto p-6">

          {loading && (
            <div className="text-center text-gray-400 py-16">Cargando historial...</div>
          )}

          {!loading && cliente && cliente.historial.length === 0 && (
            <div className="border rounded-xl p-10 text-center text-gray-400 bg-gray-50">
              Sin ventas conciliadas para este cliente.
            </div>
          )}

          {!loading && cliente && cliente.historial.length > 0 && (
            <>
              <h4 className="text-sm font-semibold text-gray-600 mb-3">
                Historial de compras
              </h4>

              <div className="overflow-x-auto rounded-xl border input-minimal">
                <table className="w-full text-sm text-gray-700">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-left">Métodos</th>
                      <th className="px-4 py-3 text-right">Arts.</th>
                      <th className="px-4 py-3 text-left">Sucursal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cliente.historial.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {fmtFecha(v.fecha_venta)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-indigo-700">
                          {fmtMoneda(v.total)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {v.metodos_pago ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {v.num_articulos}
                        </td>
                        <td className="px-4 py-3">{v.sucursal ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}

// ── componente principal ───────────────────────────────────────────────────

export default function CarteraClientes() {
  const [busqueda,    setBusqueda]    = useState('')
  const [sucursalId,  setSucursalId]  = useState<number | null>(null)
  const [pagina,      setPagina]      = useState(1)

  const [sucursales,  setSucursales]  = useState<Sucursal[]>([])
  const [data,        setData]        = useState<PaginaData | null>(null)
  const [loading,     setLoading]     = useState(false)

  const [panelAbierto,       setPanelAbierto]       = useState(false)
  const [loadingDetalle,     setLoadingDetalle]     = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteDetalle | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/sucursales`, { credentials: 'include' })
      .then(r => r.json())
      .then(setSucursales)
      .catch(() => {})
  }, [])

  // Recarga con debounce para el buscador; inmediato para sucursal y página
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ pagina: String(pagina), por_pagina: '25' })
        if (busqueda)   params.append('busqueda',    busqueda)
        if (sucursalId) params.append('sucursal_id', String(sucursalId))

        const resp = await fetch(`${API_URL}/api/clientes?${params}`, { credentials: 'include' })
        if (!resp.ok) throw new Error()
        setData(await resp.json())
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [busqueda, sucursalId, pagina])

  const verDetalle = async (id: number) => {
    setPanelAbierto(true)
    setClienteSeleccionado(null)
    setLoadingDetalle(true)
    try {
      const resp = await fetch(`${API_URL}/api/clientes/${id}`, { credentials: 'include' })
      if (!resp.ok) throw new Error()
      setClienteSeleccionado(await resp.json())
    } catch {
      setPanelAbierto(false)
    } finally {
      setLoadingDetalle(false)
    }
  }

  const cerrarPanel = () => {
    setPanelAbierto(false)
    setClienteSeleccionado(null)
  }

  const totalPaginas = data ? Math.ceil(data.total / data.por_pagina) : 1

  return (
    <div className="space-y-4">

      {/* FILTROS */}
      <div className="flex flex-wrap items-end gap-3">

        <div className="flex flex-col gap-1 flex-1 min-w-52">
          <label className="text-xs font-medium text-gray-600">Buscar</label>
          <input
            type="text"
            placeholder="Nombre, teléfono o correo..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 input-minimal"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Sucursal</label>
          <select
            value={sucursalId ?? ''}
            onChange={e => { setSucursalId(e.target.value ? Number(e.target.value) : null); setPagina(1) }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 input-minimal"
          >
            <option value="">Todas</option>
            {sucursales.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

      </div>

      {/* CONTADOR */}
      {data && !loading && (
        <p className="text-xs text-gray-500">
          {data.total} cliente{data.total !== 1 ? 's' : ''} encontrado{data.total !== 1 ? 's' : ''}
        </p>
      )}

      {/* TABLA */}
      <div className="overflow-x-auto rounded-xl border input-minimal">
        <table className="w-full text-sm text-gray-700">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Correo</th>
              <th className="px-4 py-3 text-left">Sucursal</th>
              <th className="px-4 py-3 text-right">Visitas</th>
              <th className="px-4 py-3 text-right">Total gastado</th>
              <th className="px-4 py-3 text-left">Última compra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">

            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}

            {!loading && data?.clientes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No se encontraron clientes.
                </td>
              </tr>
            )}

            {!loading && data?.clientes.map(c => (
              <tr
                key={c.id}
                onClick={() => verDetalle(c.id)}
                className="hover:bg-indigo-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-800">{c.nombre}</td>
                <td className="px-4 py-3">{c.telefono ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.correo ?? '—'}</td>
                <td className="px-4 py-3">{c.sucursal ?? '—'}</td>
                <td className="px-4 py-3 text-right">{c.numero_visitas}</td>
                <td className="px-4 py-3 text-right font-semibold text-indigo-700">
                  {fmtMoneda(c.total_gastado)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                  {c.ultima_compra ? fmtFecha(c.ultima_compra) : '—'}
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      {data && data.total > data.por_pagina && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="text-xs text-gray-500">
            Página {pagina} de {totalPaginas}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100 transition"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || loading}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100 transition"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* PANEL LATERAL */}
      {panelAbierto && (
        <PanelCliente
          cliente={clienteSeleccionado}
          loading={loadingDetalle}
          onClose={cerrarPanel}
        />
      )}

    </div>
  )
}
