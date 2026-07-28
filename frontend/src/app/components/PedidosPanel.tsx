'use client'

import { useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import { API_URL } from '@/utils/api'
import { useUser } from '@/context/UserContext'
import { IdNombre } from './Types'
import EquiposGrupoCard from '../tecnico/components/EquiposGrupoCard'

type TipoItemPedido = 'sin_revisar' | 'recepcion_directa' | 'armado'

interface EquipoDisponible {
  tipo: TipoItemPedido
  equipo_id: number | null
  inventario_id: number | null
  nombre: string
  procesador: string | null
  estado_id: number | null
  etiqueta: string | null
  sucursal_id: number
  sucursal_nombre: string | null
}

interface PedidoResumen {
  id: number
  detalle: string
  estado: string
  sucursal_origen_id: number
  sucursal_origen_nombre: string
  sucursal_destino_id: number
  sucursal_destino_nombre: string
  creado_por: number
  creado_por_nombre: string
  tecnico_id: number
  tecnico_nombre: string
  fecha_creacion: string
  fecha_completado: string | null
  fecha_cancelacion: string | null
  motivo_cancelacion: string | null
  total_items: number
}

interface PedidoItemDetalle {
  id: number
  tipo: TipoItemPedido
  equipo_id: number | null
  inventario_id: number | null
  estado_equipo_al_pedir: number | null
  estado_equipo_nombre: string | null
  equipo_nombre: string | null
  equipo_procesador: string | null
  inventario_tipo: string | null
  inventario_especificacion: string | null
  inventario_sku: string | null
}

interface PedidoDetalle extends PedidoResumen {
  cancelado_por: number | null
  cancelado_por_nombre: string | null
  items: PedidoItemDetalle[]
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  en_preparacion: 'bg-blue-100 text-blue-800',
  listo: 'bg-purple-100 text-purple-800',
  completado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

const TIPO_LABEL: Record<TipoItemPedido, string> = {
  sin_revisar: 'Sin revisar',
  recepcion_directa: 'Recepción directa',
  armado: 'Armado',
}

const ESTADO_EQUIPO_LABEL: Record<number, string> = {
  1: 'Por revisar',
  2: 'Revisado - Por armar',
  3: 'No funciona',
  4: 'Armado',
}

function itemKey(eq: { tipo: string; equipo_id: number | null; inventario_id: number | null }) {
  return `${eq.tipo}-${eq.equipo_id ?? 'x'}-${eq.inventario_id ?? 'x'}`
}

function agruparEquiposDisponibles(equipos: EquipoDisponible[]) {
  const map = new Map<string, { tipo: TipoItemPedido; nombre: string; procesador: string; sucursal_id: number; sucursal_nombre: string | null; items: EquipoDisponible[]; estadoConteos: Record<number, number> }>()
  for (const eq of equipos) {
    const key = `${eq.tipo}||${eq.nombre}||${eq.procesador ?? ''}||${eq.sucursal_id}`
    if (!map.has(key)) {
      map.set(key, { tipo: eq.tipo, nombre: eq.nombre, procesador: eq.procesador ?? '—', sucursal_id: eq.sucursal_id, sucursal_nombre: eq.sucursal_nombre, items: [], estadoConteos: {} })
    }
    const grupo = map.get(key)!
    grupo.items.push(eq)
    if (eq.estado_id) grupo.estadoConteos[eq.estado_id] = (grupo.estadoConteos[eq.estado_id] || 0) + 1
  }
  return [...map.values()]
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ============================================================
// Modal de selección de equipos (agrupados por nombre+procesador,
// reutiliza EquiposGrupoCard para la vista de grupos)
// ============================================================
function ModalSeleccionEquiposPedido({
  open,
  onClose,
  sucursalOrigenId,
  seleccionados,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  sucursalOrigenId: number | null
  seleccionados: EquipoDisponible[]
  onConfirm: (items: EquipoDisponible[]) => void
}) {
  const [equipos, setEquipos] = useState<EquipoDisponible[]>([])
  const [loading, setLoading] = useState(false)
  const [grupoActivo, setGrupoActivo] = useState<string | null>(null)
  const [seleccionLocal, setSeleccionLocal] = useState<EquipoDisponible[]>([])

  useEffect(() => {
    if (!open || !sucursalOrigenId) return
    setGrupoActivo(null)
    setLoading(true)
    fetch(`${API_URL}/api/pedidos/equipos-disponibles?sucursal_id=${sucursalOrigenId}`, { credentials: 'include' })
      .then(r => r.json())
      .then((data: EquipoDisponible[]) => {
        setEquipos(Array.isArray(data) ? data : [])
        setSeleccionLocal(seleccionados)
      })
      .catch(() => Swal.fire('Error', 'No se pudieron cargar los equipos disponibles', 'error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sucursalOrigenId])

  if (!open) return null

  const grupos = agruparEquiposDisponibles(equipos)
  const grupoSeleccionado = grupos.find(g => `${g.tipo}||${g.nombre}||${g.procesador}||${g.sucursal_id}` === grupoActivo)

  const toggleItem = (eq: EquipoDisponible) => {
    const key = itemKey(eq)
    const existe = seleccionLocal.some(e => itemKey(e) === key)
    setSeleccionLocal(prev => (existe ? prev.filter(e => itemKey(e) !== key) : [...prev, eq]))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {grupoSeleccionado ? `${grupoSeleccionado.nombre} · ${grupoSeleccionado.procesador}` : 'Seleccionar equipos'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg" aria-label="Cerrar">✕</button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">Cargando equipos...</p>
        ) : grupoSeleccionado ? (
          <>
            <button onClick={() => setGrupoActivo(null)} className="text-sm text-indigo-600 hover:underline mb-3 self-start">
              ← Volver a grupos
            </button>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 border rounded-lg">
              {grupoSeleccionado.items.map(eq => {
                const key = itemKey(eq)
                const checked = seleccionLocal.some(e => itemKey(e) === key)
                return (
                  <label key={key} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${checked ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleItem(eq)} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{eq.etiqueta ?? `#${eq.equipo_id ?? eq.inventario_id}`}</p>
                      <p className="text-xs text-gray-500">
                        {TIPO_LABEL[eq.tipo]}{eq.estado_id ? ` · ${ESTADO_EQUIPO_LABEL[eq.estado_id]}` : ''}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </>
        ) : grupos.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No hay equipos disponibles en esta sucursal</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto flex-1">
            {grupos.map(g => (
              <EquiposGrupoCard
                key={`${g.tipo}||${g.nombre}||${g.procesador}||${g.sucursal_id}`}
                nombre={g.nombre}
                procesador={g.procesador}
                sucursal_nombre={g.sucursal_nombre ?? undefined}
                cantidad={g.items.length}
                estadoConteos={g.estadoConteos}
                onClick={() => setGrupoActivo(`${g.tipo}||${g.nombre}||${g.procesador}||${g.sucursal_id}`)}
              />
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <span className="text-sm text-gray-500">{seleccionLocal.length} seleccionados</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-gray-100">Cancelar</button>
            <button
              onClick={() => { onConfirm(seleccionLocal); onClose() }}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Confirmar selección
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Tab: Nuevo pedido
// ============================================================
function TabNuevoPedido({ onCreado }: { onCreado: () => void }) {
  const { user, sucursalActiva } = useUser()
  const [sucursales, setSucursales] = useState<IdNombre[]>([])
  const [tecnicos, setTecnicos] = useState<IdNombre[]>([])
  const [sucursalOrigenId, setSucursalOrigenId] = useState<number | null>(null)
  const [sucursalDestinoId, setSucursalDestinoId] = useState<number | null>(null)
  const [tecnicoId, setTecnicoId] = useState<number | null>(null)
  const [detalle, setDetalle] = useState('')
  const [itemsSeleccionados, setItemsSeleccionados] = useState<EquipoDisponible[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    setSucursalOrigenId(sucursalActiva ?? user?.sucursal_id ?? null)
  }, [sucursalActiva, user])

  useEffect(() => {
    fetch(`${API_URL}/api/sucursales`, { credentials: 'include' }).then(r => r.json()).then(setSucursales).catch(() => setSucursales([]))
    fetch(`${API_URL}/api/usuarios?rol=2`, { credentials: 'include' }).then(r => r.json()).then(setTecnicos).catch(() => setTecnicos([]))
  }, [])

  // Si cambia la sucursal origen, los items elegidos de la anterior ya no aplican
  useEffect(() => {
    setItemsSeleccionados([])
  }, [sucursalOrigenId])

  const quitarItem = (eq: EquipoDisponible) => {
    setItemsSeleccionados(prev => prev.filter(e => itemKey(e) !== itemKey(eq)))
  }

  const resetForm = () => {
    setDetalle('')
    setItemsSeleccionados([])
    setSucursalDestinoId(null)
    setTecnicoId(null)
  }

  const handleCrear = async () => {
    if (!detalle.trim()) return Swal.fire('Error', 'El detalle del pedido es obligatorio', 'warning')
    if (!sucursalOrigenId || !sucursalDestinoId) return Swal.fire('Error', 'Selecciona sucursal de origen y destino', 'warning')
    if (sucursalOrigenId === sucursalDestinoId) return Swal.fire('Error', 'La sucursal de origen y destino no pueden ser la misma', 'warning')
    if (!tecnicoId) return Swal.fire('Error', 'Selecciona el técnico responsable', 'warning')
    if (itemsSeleccionados.length === 0) return Swal.fire('Error', 'Debes seleccionar al menos un equipo', 'warning')

    setCreando(true)
    try {
      const resp = await fetch(`${API_URL}/api/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sucursal_origen_id: sucursalOrigenId,
          sucursal_destino_id: sucursalDestinoId,
          tecnico_id: tecnicoId,
          detalle,
          items: itemsSeleccionados.map(eq => ({
            tipo: eq.tipo,
            equipo_id: eq.equipo_id,
            inventario_id: eq.inventario_id,
            estado_id: eq.estado_id,
          })),
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message || 'Error al crear el pedido')

      await Swal.fire({ icon: 'success', title: 'Pedido creado', timer: 1700, showConfirmButton: false })
      resetForm()
      onCreado()
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error')
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-xl bg-white p-6 rounded-xl shadow-md space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sucursal origen</label>
          <select
            value={sucursalOrigenId ?? ''}
            onChange={e => setSucursalOrigenId(e.target.value ? Number(e.target.value) : null)}
            className="w-full input-minimal"
          >
            <option value="">Selecciona sucursal</option>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Sucursal destino</label>
          <select
            value={sucursalDestinoId ?? ''}
            onChange={e => setSucursalDestinoId(e.target.value ? Number(e.target.value) : null)}
            className="w-full input-minimal"
          >
            <option value="">Selecciona sucursal</option>
            {sucursales.filter(s => s.id !== sucursalOrigenId).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Técnico responsable</label>
          <select
            value={tecnicoId ?? ''}
            onChange={e => setTecnicoId(e.target.value ? Number(e.target.value) : null)}
            className="w-full input-minimal"
          >
            <option value="">Selecciona técnico</option>
            {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Detalle</label>
          <textarea
            value={detalle}
            onChange={e => setDetalle(e.target.value)}
            placeholder="Detalle del pedido (obligatorio)"
            className="textarea-minimal"
            rows={3}
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => (sucursalOrigenId ? setModalOpen(true) : Swal.fire('Atención', 'Selecciona primero la sucursal origen', 'warning'))}
            className="text-indigo-600 underline text-sm"
          >
            + Seleccionar equipos
          </button>

          {itemsSeleccionados.length > 0 && (
            <ul className="mt-3 divide-y divide-gray-100 border rounded-lg">
              {itemsSeleccionados.map(eq => (
                <li key={itemKey(eq)} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <p className="text-gray-800">{eq.nombre} {eq.etiqueta ? `· ${eq.etiqueta}` : ''}</p>
                    <p className="text-xs text-gray-500">{TIPO_LABEL[eq.tipo]}</p>
                  </div>
                  <button onClick={() => quitarItem(eq)} className="text-red-500 hover:text-red-700 text-xs">Quitar</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={handleCrear}
          disabled={creando}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {creando ? 'Creando...' : 'Crear pedido'}
        </button>
      </div>

      <ModalSeleccionEquiposPedido
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        sucursalOrigenId={sucursalOrigenId}
        seleccionados={itemsSeleccionados}
        onConfirm={setItemsSeleccionados}
      />
    </div>
  )
}

// ============================================================
// Tab: Pedidos (lista + filtros + panel de detalle)
// ============================================================
function TabListaPedidos() {
  const { user } = useUser()
  const [pedidos, setPedidos] = useState<PedidoResumen[]>([])
  const [loading, setLoading] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroSucursal, setFiltroSucursal] = useState('')
  const [sucursales, setSucursales] = useState<IdNombre[]>([])
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<PedidoDetalle | null>(null)

  const esAdmin = user?.rol_id === 1

  useEffect(() => {
    fetch(`${API_URL}/api/sucursales`, { credentials: 'include' }).then(r => r.json()).then(setSucursales).catch(() => setSucursales([]))
  }, [])

  const fetchPedidos = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroEstado) params.set('estado', filtroEstado)
    if (filtroSucursal) params.set('sucursal_id', filtroSucursal)
    fetch(`${API_URL}/api/pedidos?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setPedidos(Array.isArray(data) ? data : []))
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false))
  }, [filtroEstado, filtroSucursal])

  useEffect(() => { fetchPedidos() }, [fetchPedidos])

  const abrirDetalle = async (id: number) => {
    try {
      const resp = await fetch(`${API_URL}/api/pedidos/${id}`, { credentials: 'include' })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message || 'No se pudo cargar el pedido')
      setPedidoSeleccionado(data)
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error')
    }
  }

  const refrescarTodo = () => {
    fetchPedidos()
    if (pedidoSeleccionado) abrirDetalle(pedidoSeleccionado.id)
  }

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!pedidoSeleccionado) return
    try {
      const resp = await fetch(`${API_URL}/api/pedidos/${pedidoSeleccionado.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message || 'No se pudo actualizar el estado')
      Swal.fire({ icon: 'success', title: 'Estado actualizado', timer: 1400, showConfirmButton: false })
      refrescarTodo()
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error')
    }
  }

  const cancelarPedido = async () => {
    if (!pedidoSeleccionado) return
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: 'Cancelar pedido',
      input: 'textarea',
      inputLabel: 'Motivo de cancelación',
      inputPlaceholder: 'Explica por qué se cancela este pedido...',
      showCancelButton: true,
      confirmButtonText: 'Cancelar pedido',
      cancelButtonText: 'Volver',
      inputValidator: (value) => (!value.trim() ? 'El motivo es obligatorio' : undefined),
    })
    if (!isConfirmed) return

    try {
      const resp = await fetch(`${API_URL}/api/pedidos/${pedidoSeleccionado.id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ motivo }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message || 'No se pudo cancelar el pedido')
      Swal.fire({ icon: 'success', title: 'Pedido cancelado', timer: 1400, showConfirmButton: false })
      refrescarTodo()
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error')
    }
  }

  return (
    <div className="flex gap-4">
      <div className={`space-y-4 ${pedidoSeleccionado ? 'w-2/3' : 'w-full'}`}>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-3">
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input-minimal">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filtroSucursal} onChange={e => setFiltroSucursal(e.target.value)} className="input-minimal">
            <option value="">Todas las sucursales</option>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Origen</th>
                <th className="px-4 py-3 text-left">Destino</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Técnico</th>
                <th className="px-4 py-3 text-left"># Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              )}
              {!loading && pedidos.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin pedidos para los filtros seleccionados</td></tr>
              )}
              {pedidos.map(p => (
                <tr
                  key={p.id}
                  onClick={() => abrirDetalle(p.id)}
                  className={`cursor-pointer hover:bg-gray-50 ${pedidoSeleccionado?.id === p.id ? 'bg-indigo-50' : ''}`}
                >
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-xs">{formatFecha(p.fecha_creacion)}</td>
                  <td className="px-4 py-2 text-gray-700">{p.sucursal_origen_nombre}</td>
                  <td className="px-4 py-2 text-gray-700">{p.sucursal_destino_nombre}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[p.estado]}`}>
                      {ESTADO_LABEL[p.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{p.tecnico_nombre}</td>
                  <td className="px-4 py-2 text-gray-600">{p.total_items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pedidoSeleccionado && (
        <div className="w-1/3 bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4 h-fit sticky top-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-800">Pedido #{pedidoSeleccionado.id}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[pedidoSeleccionado.estado]}`}>
                {ESTADO_LABEL[pedidoSeleccionado.estado]}
              </span>
            </div>
            <button onClick={() => setPedidoSeleccionado(null)} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">✕</button>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="text-gray-400">Origen:</span> {pedidoSeleccionado.sucursal_origen_nombre}</p>
            <p><span className="text-gray-400">Destino:</span> {pedidoSeleccionado.sucursal_destino_nombre}</p>
            <p><span className="text-gray-400">Técnico:</span> {pedidoSeleccionado.tecnico_nombre}</p>
            <p><span className="text-gray-400">Creado por:</span> {pedidoSeleccionado.creado_por_nombre}</p>
            <p><span className="text-gray-400">Detalle:</span> {pedidoSeleccionado.detalle}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Historial</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>Creado — {formatFecha(pedidoSeleccionado.fecha_creacion)}</li>
              {pedidoSeleccionado.fecha_completado && <li>Completado — {formatFecha(pedidoSeleccionado.fecha_completado)}</li>}
              {pedidoSeleccionado.fecha_cancelacion && (
                <li>
                  Cancelado — {formatFecha(pedidoSeleccionado.fecha_cancelacion)}
                  {pedidoSeleccionado.cancelado_por_nombre ? ` (${pedidoSeleccionado.cancelado_por_nombre})` : ''}
                  {pedidoSeleccionado.motivo_cancelacion ? `: ${pedidoSeleccionado.motivo_cancelacion}` : ''}
                </li>
              )}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items ({pedidoSeleccionado.items.length})</p>
            <ul className="divide-y divide-gray-100 border rounded-lg">
              {pedidoSeleccionado.items.map(item => (
                <li key={item.id} className="px-3 py-2 text-sm">
                  <p className="text-gray-800">
                    {item.tipo === 'recepcion_directa'
                      ? `${item.inventario_tipo ?? ''} ${item.inventario_especificacion ?? ''}`.trim()
                      : item.equipo_nombre}
                  </p>
                  <p className="text-xs text-gray-500">
                    {TIPO_LABEL[item.tipo]}
                    {item.estado_equipo_nombre ? ` · ${item.estado_equipo_nombre}` : ''}
                    {item.inventario_sku ? ` · ${item.inventario_sku}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t">
            {pedidoSeleccionado.estado === 'pendiente' && (
              <button onClick={() => cambiarEstado('en_preparacion')} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm">
                Iniciar preparación
              </button>
            )}
            {pedidoSeleccionado.estado === 'en_preparacion' && (
              <button onClick={() => cambiarEstado('listo')} className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 text-sm">
                Marcar como listo
              </button>
            )}
            {pedidoSeleccionado.estado === 'listo' && (
              <button onClick={() => cambiarEstado('completado')} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm">
                Completar
              </button>
            )}
            {esAdmin && ['pendiente', 'en_preparacion', 'listo'].includes(pedidoSeleccionado.estado) && (
              <button onClick={cancelarPedido} className="w-full border border-red-300 text-red-600 py-2 rounded-lg hover:bg-red-50 text-sm">
                Cancelar pedido
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Componente principal
// ============================================================
export default function PedidosPanel() {
  const [tab, setTab] = useState<'nuevo' | 'pedidos'>('nuevo')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab('nuevo')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'nuevo' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Nuevo pedido
        </button>
        <button
          onClick={() => setTab('pedidos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'pedidos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Pedidos
        </button>
      </div>

      {tab === 'nuevo' && (
        <TabNuevoPedido onCreado={() => { setTab('pedidos'); setRefreshKey(k => k + 1) }} />
      )}
      {tab === 'pedidos' && <TabListaPedidos key={refreshKey} />}
    </div>
  )
}
