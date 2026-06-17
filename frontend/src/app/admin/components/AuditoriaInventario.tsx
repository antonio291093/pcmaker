'use client'
import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '@/utils/api'

interface RegistroAuditoria {
  id: number
  inventario_id: number
  accion: string
  campo: string | null
  valor_anterior: string | null
  valor_nuevo: string | null
  contexto: string | null
  referencia_id: number | null
  fecha: string
  usuario_nombre: string | null
  inventario_tipo: string | null
  inventario_especificacion: string | null
  inventario_sku: string | null
}

interface Usuario {
  id: number
  nombre: string
}

const BADGE: Record<string, string> = {
  crear:           'bg-green-100 text-green-800',
  editar:          'bg-blue-100 text-blue-800',
  stock_descuento: 'bg-red-100 text-red-800',
  stock_aumento:   'bg-emerald-100 text-emerald-800',
  traspaso:        'bg-indigo-100 text-indigo-800',
  eliminar:        'bg-gray-200 text-gray-700',
}

const LABEL: Record<string, string> = {
  crear:           'Crear',
  editar:          'Editar',
  stock_descuento: 'Descuento stock',
  stock_aumento:   'Aumento stock',
  traspaso:        'Traspaso',
  eliminar:        'Eliminar',
}

const ACCIONES = ['crear', 'editar', 'stock_descuento', 'stock_aumento', 'traspaso', 'eliminar']

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function descripcionArticulo(r: RegistroAuditoria) {
  if (!r.inventario_tipo && !r.inventario_especificacion) return `#${r.inventario_id}`
  const partes = [r.inventario_tipo, r.inventario_especificacion].filter(Boolean).join(' · ')
  return r.inventario_sku ? `${partes} (${r.inventario_sku})` : partes
}

export default function AuditoriaInventario() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [total, setTotal]         = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]     = useState(false)
  const [usuarios, setUsuarios]   = useState<Usuario[]>([])

  const [filtros, setFiltros] = useState({
    inventario_id: '',
    usuario_id:    '',
    accion:        '',
    campo:         '',
    fecha_inicio:  '',
    fecha_fin:     '',
  })
  const [page, setPage]   = useState(1)
  const limit = 50

  // Cargar lista de usuarios para el select
  useEffect(() => {
    fetch(`${API_URL}/api/usuarios`, { credentials: 'include' })
      .then(r => r.json())
      .then((data: Usuario[]) => setUsuarios(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const fetchAuditoria = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) })
      if (filtros.inventario_id) params.set('inventario_id', filtros.inventario_id)
      if (filtros.usuario_id)    params.set('usuario_id',    filtros.usuario_id)
      if (filtros.accion)        params.set('accion',        filtros.accion)
      if (filtros.campo)         params.set('campo',         filtros.campo)
      if (filtros.fecha_inicio)  params.set('fecha_inicio',  filtros.fecha_inicio)
      if (filtros.fecha_fin)     params.set('fecha_fin',     filtros.fecha_fin)

      const res  = await fetch(`${API_URL}/api/admin/auditoria/inventario?${params}`, {
        credentials: 'include',
      })
      const data = await res.json()
      setRegistros(data.registros ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch {
      setRegistros([])
    } finally {
      setLoading(false)
    }
  }, [filtros, page])

  useEffect(() => {
    fetchAuditoria(page)
  }, [page])

  const handleBuscar = () => {
    setPage(1)
    fetchAuditoria(1)
  }

  const handleLimpiar = () => {
    setFiltros({ inventario_id: '', usuario_id: '', accion: '', campo: '', fecha_inicio: '', fecha_fin: '' })
    setPage(1)
    setTimeout(() => fetchAuditoria(1), 0)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Auditoría de inventario</h2>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">ID artículo</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              placeholder="Ej: 42"
              value={filtros.inventario_id}
              onChange={e => setFiltros(f => ({ ...f, inventario_id: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Usuario</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={filtros.usuario_id}
              onChange={e => setFiltros(f => ({ ...f, usuario_id: e.target.value }))}
            >
              <option value="">Todos</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Acción</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={filtros.accion}
              onChange={e => setFiltros(f => ({ ...f, accion: e.target.value }))}
            >
              <option value="">Todas</option>
              {ACCIONES.map(a => (
                <option key={a} value={a}>{LABEL[a]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Campo</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              placeholder="Ej: precio"
              value={filtros.campo}
              onChange={e => setFiltros(f => ({ ...f, campo: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={filtros.fecha_inicio}
              onChange={e => setFiltros(f => ({ ...f, fecha_inicio: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={filtros.fecha_fin}
              onChange={e => setFiltros(f => ({ ...f, fecha_fin: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleBuscar}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700"
          >
            Buscar
          </button>
          <button
            onClick={handleLimpiar}
            className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-200"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm text-gray-500">
            {loading ? 'Cargando...' : `${total.toLocaleString()} registros`}
          </span>
          <span className="text-sm text-gray-400">Página {page} / {totalPages}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left whitespace-nowrap">Fecha</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Usuario</th>
                <th className="px-4 py-3 text-left">Artículo</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Acción</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Campo</th>
                <th className="px-4 py-3 text-left">Valor anterior</th>
                <th className="px-4 py-3 text-left">Valor nuevo</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Contexto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {registros.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Sin registros para los filtros seleccionados
                  </td>
                </tr>
              )}
              {registros.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-xs">
                    {formatFecha(r.fecha)}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-700 whitespace-nowrap">
                    {r.usuario_nombre ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-600 max-w-[200px] truncate" title={descripcionArticulo(r)}>
                    {descripcionArticulo(r)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${BADGE[r.accion] ?? 'bg-gray-100 text-gray-600'}`}>
                      {LABEL[r.accion] ?? r.accion}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {r.campo ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-500 max-w-[140px] truncate" title={r.valor_anterior ?? ''}>
                    {r.valor_anterior ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-800 max-w-[140px] truncate" title={r.valor_nuevo ?? ''}>
                    {r.valor_nuevo ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">
                    {r.contexto ?? '—'}
                    {r.referencia_id ? ` #${r.referencia_id}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-100">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              ← Anterior
            </button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7
                ? i + 1
                : page <= 4
                  ? i + 1
                  : page >= totalPages - 3
                    ? totalPages - 6 + i
                    : page - 3 + i
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded text-sm ${
                    p === page
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {p}
                </button>
              )
            })}

            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
