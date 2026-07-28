'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { API_URL } from '@/utils/api'
import Swal from 'sweetalert2'
import ModalSeleccionarProducto, { ProductoSeleccionado } from './SeleccionarProductoModal'
import {
  FaShieldAlt, FaSearch, FaExclamationTriangle, FaTimes,
  FaChevronRight, FaTools, FaExchangeAlt, FaUndo,
} from 'react-icons/fa'

// ─── Tipos ────────────────────────────────────────────────────

type EstadoSolicitud = 'solicitada' | 'en_revision' | 'aprobada' | 'rechazada' | 'resuelta'
type TipoResolucion  = 'reparacion' | 'reemplazo' | 'devolucion'

interface VentaElegibleItem {
  venta_detalle_id: number
  descripcion: string
  sku: string | null
  ya_reclamado: boolean
}

interface VentaElegible {
  id: number
  cliente: string
  telefono: string | null
  fecha_venta: string
  vigente: boolean
  meses_validez: number
  items: VentaElegibleItem[]
}

interface SolicitudResumen {
  id: number
  estado: EstadoSolicitud
  tipo_resolucion: TipoResolucion | null
  motivo_cliente: string
  monto_diferencia: string
  fecha_venta_snapshot: string
  fecha_creacion: string
  fecha_resolucion: string | null
  venta_id: number
  cliente_nombre: string
  cliente_telefono: string | null
  sucursal: string
  creado_por_nombre: string
  tecnico_nombre: string | null
  total_items: number
}

interface SolicitudItemComponente {
  id: number
  garantia_solicitud_item_id: number
  inventario_id: number
  cantidad: number
  descripcion: string | null
  inventario_descripcion: string | null
  sku: string | null
}

interface SolicitudItem {
  id: number
  venta_detalle_id: number
  inventario_id: number | null
  equipo_id: number | null
  estado_item: 'pendiente' | 'reparado' | 'reemplazado' | 'devuelto' | 'rechazado'
  producto_descripcion: string
  sku: string | null
  componentes: SolicitudItemComponente[]
}

interface SolicitudDetalle extends SolicitudResumen {
  diagnostico_tecnico: string | null
  motivo_rechazo: string | null
  tecnico_id: number | null
  cliente_correo: string | null
  items: SolicitudItem[]
}

// ─── Helpers ──────────────────────────────────────────────────

function formatFecha(iso: string): string {
  const safe = iso.split('T')[0]
  const [y, m, d] = safe.split('-')
  return `${d}/${m}/${y}`
}

function formatMXN(val: string | number): string {
  return Number(val).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

const ESTADOS: { label: string; value: EstadoSolicitud | '' }[] = [
  { label: 'Todas',       value: '' },
  { label: 'Solicitada',  value: 'solicitada' },
  { label: 'En revisión', value: 'en_revision' },
  { label: 'Aprobada',    value: 'aprobada' },
  { label: 'Rechazada',   value: 'rechazada' },
  { label: 'Resuelta',    value: 'resuelta' },
]

function EstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  const clases: Record<EstadoSolicitud, string> = {
    solicitada:  'bg-gray-100 text-gray-700',
    en_revision: 'bg-blue-100 text-blue-700',
    aprobada:    'bg-indigo-100 text-indigo-700',
    rechazada:   'bg-red-100 text-red-700',
    resuelta:    'bg-green-100 text-green-700',
  }
  const labels: Record<EstadoSolicitud, string> = {
    solicitada:  'Solicitada',
    en_revision: 'En revisión',
    aprobada:    'Aprobada',
    rechazada:   'Rechazada',
    resuelta:    'Resuelta',
  }
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${clases[estado]}`}>
      {labels[estado]}
    </span>
  )
}

// ─── Tab: Nueva solicitud ──────────────────────────────────────

function NuevaSolicitud({ onCreada }: { onCreada: () => void }) {
  const [numeroVenta, setNumeroVenta] = useState('')
  const [buscando, setBuscando]       = useState(false)
  const [venta, setVenta]             = useState<VentaElegible | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())
  const [motivoCliente, setMotivoCliente]  = useState('')
  const [creando, setCreando]         = useState(false)

  const handleBuscar = async () => {
    const id = numeroVenta.trim()
    if (!id) return
    setBuscando(true)
    setVenta(null)
    setSeleccionados(new Set())
    try {
      const resp = await fetch(`${API_URL}/api/garantia-solicitudes/ventas/${id}/elegibles`, {
        credentials: 'include',
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message)
      setVenta(data)
    } catch (e: unknown) {
      Swal.fire({
        icon: 'error',
        title: 'Venta no encontrada',
        text: e instanceof Error ? e.message : 'No se pudo buscar la venta',
        confirmButtonColor: '#16A34A',
      })
    } finally {
      setBuscando(false)
    }
  }

  const toggleItem = (id: number) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCrear = async () => {
    if (!venta) return
    if (!seleccionados.size) {
      return Swal.fire({ icon: 'warning', title: 'Selecciona al menos un artículo', confirmButtonColor: '#16A34A' })
    }
    if (!motivoCliente.trim()) {
      return Swal.fire({ icon: 'warning', title: 'Describe el motivo del cliente', confirmButtonColor: '#16A34A' })
    }
    setCreando(true)
    try {
      const resp = await fetch(`${API_URL}/api/garantia-solicitudes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venta_id: venta.id,
          motivo_cliente: motivoCliente.trim(),
          items: Array.from(seleccionados),
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message)
      Swal.fire({ icon: 'success', title: 'Solicitud creada', text: `Folio #${data.id}`, confirmButtonColor: '#16A34A' })
      setNumeroVenta('')
      setVenta(null)
      setSeleccionados(new Set())
      setMotivoCliente('')
      onCreada()
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: e instanceof Error ? e.message : 'Error al crear la solicitud', confirmButtonColor: '#16A34A' })
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Número de venta"
          value={numeroVenta}
          onChange={e => setNumeroVenta(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleBuscar() }}
        />
        <button
          onClick={handleBuscar}
          disabled={buscando || !numeroVenta.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
        >
          <FaSearch /> {buscando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {venta && (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-semibold text-gray-800">{venta.cliente}</p>
            {venta.telefono && <p className="text-sm text-gray-500">{venta.telefono}</p>}
            <p className="text-xs text-gray-400 mt-1">Venta #{venta.id} · {formatFecha(venta.fecha_venta)}</p>
          </div>

          {!venta.vigente && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex gap-2 items-start">
              <FaExclamationTriangle className="mt-0.5 shrink-0" />
              <p>
                La garantía de esta venta ya venció (vigencia de {venta.meses_validez} meses desde la
                fecha de compra). No es posible crear una solicitud.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-700">Artículos de la venta</p>
            {venta.items.length === 0 ? (
              <p className="text-sm text-gray-400">Esta venta no tiene artículos elegibles para garantía.</p>
            ) : (
              venta.items.map(item => (
                <label
                  key={item.venta_detalle_id}
                  className={`flex items-center gap-3 border rounded-xl px-4 py-3 text-sm transition-colors ${
                    item.ya_reclamado || !venta.vigente
                      ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                      : seleccionados.has(item.venta_detalle_id)
                        ? 'border-indigo-400 bg-indigo-50 cursor-pointer'
                        : 'border-gray-200 hover:border-indigo-300 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={item.ya_reclamado || !venta.vigente}
                    checked={seleccionados.has(item.venta_detalle_id)}
                    onChange={() => toggleItem(item.venta_detalle_id)}
                    className="accent-indigo-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{item.descripcion}</p>
                    {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                  </div>
                  {item.ya_reclamado && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      Ya reclamado
                    </span>
                  )}
                </label>
              ))
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo del cliente <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
              rows={3}
              placeholder="Describe el problema reportado por el cliente..."
              value={motivoCliente}
              onChange={e => setMotivoCliente(e.target.value)}
              disabled={!venta.vigente}
            />
          </div>

          <button
            onClick={handleCrear}
            disabled={creando || !venta.vigente || !seleccionados.size || !motivoCliente.trim()}
            className="self-start px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
          >
            {creando ? 'Creando...' : 'Crear solicitud'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Panel lateral: detalle + acciones ─────────────────────────

function PanelDetalle({
  id,
  rolId,
  userId,
  onClose,
  onActualizado,
}: {
  id: number
  rolId: number
  userId: number
  onClose: () => void
  onActualizado: () => void
}) {
  const [solicitud, setSolicitud] = useState<SolicitudDetalle | null>(null)
  const [loading, setLoading]     = useState(true)

  const [diagnostico, setDiagnostico]   = useState('')
  const [aplica, setAplica]             = useState<boolean | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [tipoResolucion, setTipoResolucion] = useState<TipoResolucion>('reparacion')
  const [montoDiferencia, setMontoDiferencia] = useState('')
  const [componentesPorItem, setComponentesPorItem] = useState<Record<number, ProductoSeleccionado[]>>({})
  const [modalComponentesItemId, setModalComponentesItemId] = useState<number | null>(null)
  const [productoReemplazo, setProductoReemplazo] = useState<ProductoSeleccionado | null>(null)
  const [modalReemplazoAbierto, setModalReemplazoAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const resp = await fetch(`${API_URL}/api/garantia-solicitudes/${id}`, { credentials: 'include' })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message)
      setSolicitud(data)
    } catch (e) {
      console.error('Error al cargar solicitud:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [id])

  const esTecnico = rolId === 2
  const asignadoAMi = solicitud?.tecnico_id === userId

  const handleTomarCaso = async () => {
    setGuardando(true)
    try {
      const resp = await fetch(`${API_URL}/api/garantia-solicitudes/${id}/tecnico`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tecnico_id: userId }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message)
      Swal.fire({ icon: 'success', title: 'Caso asignado', confirmButtonColor: '#16A34A' })
      await cargar()
      onActualizado()
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: e instanceof Error ? e.message : 'Error', confirmButtonColor: '#16A34A' })
    } finally {
      setGuardando(false)
    }
  }

  const putJSON = async (path: string, body: object) => {
    const resp = await fetch(`${API_URL}/api/garantia-solicitudes/${id}/${path}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.message)
    return data
  }

  const construirComponentes = () =>
    Object.entries(componentesPorItem).flatMap(([itemId, productos]) =>
      productos.map(p => ({
        garantia_solicitud_item_id: Number(itemId),
        inventario_id: p.id,
        cantidad: p.cantidadSeleccionada,
        descripcion: p.descripcion || p.especificacion || null,
      }))
    )

  const handleResolver = async () => {
    if (!diagnostico.trim()) {
      return Swal.fire({ icon: 'warning', title: 'Captura el diagnóstico', confirmButtonColor: '#16A34A' })
    }
    if (aplica === null) {
      return Swal.fire({ icon: 'warning', title: 'Indica si la garantía aplica', confirmButtonColor: '#16A34A' })
    }
    if (!aplica && !motivoRechazo.trim()) {
      return Swal.fire({ icon: 'warning', title: 'Captura el motivo de rechazo', confirmButtonColor: '#16A34A' })
    }
    if (aplica && tipoResolucion === 'reparacion' && !construirComponentes().length) {
      return Swal.fire({ icon: 'warning', title: 'Selecciona al menos un componente', confirmButtonColor: '#16A34A' })
    }
    if (aplica && tipoResolucion === 'reemplazo' && !productoReemplazo) {
      return Swal.fire({ icon: 'warning', title: 'Selecciona el producto de reemplazo', confirmButtonColor: '#16A34A' })
    }

    setGuardando(true)
    try {
      await putJSON('diagnostico', {
        diagnostico: diagnostico.trim(),
        aplica,
        motivo_rechazo: aplica ? null : motivoRechazo.trim(),
      })

      if (aplica) {
        await putJSON('resolver', {
          tipo_resolucion: tipoResolucion,
          monto_diferencia: tipoResolucion === 'reemplazo' ? Number(montoDiferencia || 0) : 0,
          componentes: tipoResolucion === 'reparacion' ? construirComponentes() : [],
          reemplazo_inventario_id: tipoResolucion === 'reemplazo' ? productoReemplazo?.id : undefined,
        })
      }

      Swal.fire({ icon: 'success', title: aplica ? 'Garantía resuelta' : 'Solicitud rechazada', confirmButtonColor: '#16A34A' })
      await cargar()
      onActualizado()
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: e instanceof Error ? e.message : 'Error al resolver', confirmButtonColor: '#16A34A' })
      await cargar()
    } finally {
      setGuardando(false)
    }
  }

  const handleCompletarResolucion = async () => {
    if (tipoResolucion === 'reparacion' && !construirComponentes().length) {
      return Swal.fire({ icon: 'warning', title: 'Selecciona al menos un componente', confirmButtonColor: '#16A34A' })
    }
    if (tipoResolucion === 'reemplazo' && !productoReemplazo) {
      return Swal.fire({ icon: 'warning', title: 'Selecciona el producto de reemplazo', confirmButtonColor: '#16A34A' })
    }

    setGuardando(true)
    try {
      await putJSON('resolver', {
        tipo_resolucion: tipoResolucion,
        monto_diferencia: tipoResolucion === 'reemplazo' ? Number(montoDiferencia || 0) : 0,
        componentes: tipoResolucion === 'reparacion' ? construirComponentes() : [],
        reemplazo_inventario_id: tipoResolucion === 'reemplazo' ? productoReemplazo?.id : undefined,
      })

      Swal.fire({ icon: 'success', title: 'Garantía resuelta', confirmButtonColor: '#16A34A' })
      await cargar()
      onActualizado()
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: e instanceof Error ? e.message : 'Error al resolver', confirmButtonColor: '#16A34A' })
    } finally {
      setGuardando(false)
    }
  }

  const agregarComponentes = (itemId: number, productos: ProductoSeleccionado[]) => {
    setComponentesPorItem(prev => ({ ...prev, [itemId]: productos }))
    setModalComponentesItemId(null)
  }

  const formResolucion = (onSubmit: () => void, textoBoton: string) => (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de resolución</label>
        <select
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={tipoResolucion}
          onChange={e => setTipoResolucion(e.target.value as TipoResolucion)}
        >
          <option value="reparacion">Reparación</option>
          <option value="reemplazo">Reemplazo</option>
          <option value="devolucion">Devolución</option>
        </select>
      </div>

      {tipoResolucion === 'reparacion' && solicitud && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-700">Componentes a cambiar</p>
          {solicitud.items.map(item => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-3">
              <p className="text-sm font-medium text-gray-700 mb-2">{item.producto_descripcion}</p>
              {(componentesPorItem[item.id] || []).map(c => (
                <div key={c.id} className="flex justify-between items-center text-xs text-gray-600 py-1">
                  <span>{c.cantidadSeleccionada}x {c.descripcion || c.especificacion}</span>
                </div>
              ))}
              <button
                onClick={() => setModalComponentesItemId(item.id)}
                className="mt-1 text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
              >
                <FaTools /> Seleccionar componentes
              </button>
            </div>
          ))}
        </div>
      )}

      {tipoResolucion === 'reemplazo' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-700">Producto de reemplazo</p>
          {productoReemplazo ? (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm">
              <span>{productoReemplazo.descripcion || productoReemplazo.especificacion}</span>
              <button onClick={() => setModalReemplazoAbierto(true)} className="text-xs text-indigo-500 underline">Cambiar</button>
            </div>
          ) : (
            <button
              onClick={() => setModalReemplazoAbierto(true)}
              className="border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-indigo-400 hover:text-indigo-500 flex items-center justify-center gap-2"
            >
              <FaExchangeAlt /> Seleccionar producto
            </button>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diferencia a cobrar (si el equipo es de mayor valor)
            </label>
            <input
              type="number" min="0" step="0.01"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="0.00"
              value={montoDiferencia}
              onChange={e => setMontoDiferencia(e.target.value)}
            />
          </div>
        </div>
      )}

      {tipoResolucion === 'devolucion' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 flex gap-2 items-start">
          <FaUndo className="mt-0.5 shrink-0" />
          <p>No se maneja reembolso de dinero. Los artículos quedan marcados como devueltos.</p>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={guardando}
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
      >
        {guardando ? 'Guardando...' : textoBoton}
      </button>
    </div>
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {loading ? 'Cargando...' : `Garantía #${id}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-5">
          {loading || !solicitud ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <EstadoBadge estado={solicitud.estado} />
                <span className="text-xs text-gray-400">{formatFecha(solicitud.fecha_creacion)}</span>
              </div>

              <div>
                <p className="font-semibold text-gray-800">{solicitud.cliente_nombre}</p>
                {solicitud.cliente_telefono && <p className="text-sm text-gray-500">{solicitud.cliente_telefono}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Venta #{solicitud.venta_id} · {formatFecha(solicitud.fecha_venta_snapshot)}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="text-gray-500 text-xs mb-1">Motivo del cliente</p>
                <p className="text-gray-700">{solicitud.motivo_cliente}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Artículos ({solicitud.items.length})</p>
                <div className="flex flex-col gap-2">
                  {solicitud.items.map(item => (
                    <div key={item.id} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-medium text-gray-800">{item.producto_descripcion}</p>
                        <span className="text-xs text-gray-400 capitalize shrink-0">{item.estado_item}</span>
                      </div>
                      {item.componentes.length > 0 && (
                        <ul className="mt-1 text-xs text-gray-500 list-disc list-inside">
                          {item.componentes.map(c => (
                            <li key={c.id}>
                              {c.cantidad}x {c.inventario_descripcion || c.descripcion || `Inventario #${c.inventario_id}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {solicitud.tecnico_nombre && (
                <div className="text-sm">
                  <p className="text-gray-500 text-xs">Técnico asignado</p>
                  <p className="font-medium text-gray-800">{solicitud.tecnico_nombre}</p>
                </div>
              )}

              {solicitud.diagnostico_tecnico && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                  <p className="font-medium mb-1">Diagnóstico</p>
                  <p>{solicitud.diagnostico_tecnico}</p>
                </div>
              )}

              {solicitud.motivo_rechazo && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <p className="font-medium mb-1">Motivo de rechazo</p>
                  <p>{solicitud.motivo_rechazo}</p>
                </div>
              )}

              {solicitud.tipo_resolucion && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                  <p className="font-medium capitalize">{solicitud.tipo_resolucion}</p>
                  {solicitud.tipo_resolucion === 'reemplazo' && Number(solicitud.monto_diferencia) > 0 && (
                    <p className="text-xs mt-1">Diferencia cobrada: {formatMXN(solicitud.monto_diferencia)}</p>
                  )}
                </div>
              )}

              {rolId === 3 && (
                <p className="text-xs text-gray-400">
                  Esta solicitud está en seguimiento del área técnica. Solo lectura.
                </p>
              )}

              {esTecnico && solicitud.estado === 'solicitada' && (
                <button
                  onClick={handleTomarCaso}
                  disabled={guardando}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
                >
                  {guardando ? 'Asignando...' : 'Tomar caso'}
                </button>
              )}

              {esTecnico && solicitud.estado === 'en_revision' && !asignadoAMi && (
                <p className="text-sm text-gray-400">
                  Este caso está asignado a {solicitud.tecnico_nombre || 'otro técnico'}.
                </p>
              )}

              {esTecnico && solicitud.estado === 'en_revision' && asignadoAMi && (
                <div className="flex flex-col gap-4 border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700">Diagnóstico</p>
                  <textarea
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    rows={3}
                    placeholder="Describe el diagnóstico técnico..."
                    value={diagnostico}
                    onChange={e => setDiagnostico(e.target.value)}
                  />

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">¿Aplica la garantía?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAplica(true)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                          aplica === true ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:border-green-400'
                        }`}
                      >Sí</button>
                      <button
                        onClick={() => setAplica(false)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                          aplica === false ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:border-red-400'
                        }`}
                      >No</button>
                    </div>
                  </div>

                  {aplica === false && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de rechazo</label>
                      <textarea
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        rows={2}
                        value={motivoRechazo}
                        onChange={e => setMotivoRechazo(e.target.value)}
                      />
                    </div>
                  )}

                  {aplica === true && formResolucion(handleResolver, 'Resolver')}
                  {aplica === false && (
                    <button
                      onClick={handleResolver}
                      disabled={guardando}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
                    >
                      {guardando ? 'Guardando...' : 'Rechazar solicitud'}
                    </button>
                  )}
                </div>
              )}

              {esTecnico && solicitud.estado === 'aprobada' && (
                <div className="flex flex-col gap-4 border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700">Completar resolución</p>
                  {formResolucion(handleCompletarResolucion, 'Resolver')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalComponentesItemId !== null && (
        <ModalSeleccionarProducto
          onClose={() => setModalComponentesItemId(null)}
          onSeleccionar={(productos) => agregarComponentes(modalComponentesItemId, productos)}
          seleccionadosIniciales={componentesPorItem[modalComponentesItemId] || []}
        />
      )}

      {modalReemplazoAbierto && (
        <ModalSeleccionarProducto
          onClose={() => setModalReemplazoAbierto(false)}
          onSeleccionar={(productos) => {
            if (productos.length) setProductoReemplazo(productos[0])
            setModalReemplazoAbierto(false)
          }}
          seleccionadosIniciales={productoReemplazo ? [productoReemplazo] : []}
        />
      )}
    </>
  )
}

// ─── Tab: Solicitudes ───────────────────────────────────────────

function ListaSolicitudes({ rolId, userId, sucursalId }: { rolId: number; userId: number; sucursalId: number }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudResumen[]>([])
  const [total, setTotal]             = useState(0)
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitud | ''>('')
  const [loading, setLoading]         = useState(true)
  const [detalleId, setDetalleId]     = useState<number | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sucursal_id: String(sucursalId) })
      if (filtroEstado) params.append('estado', filtroEstado)

      const resp = await fetch(`${API_URL}/api/garantia-solicitudes?${params}`, { credentials: 'include' })
      const data = await resp.json()
      setSolicitudes(Array.isArray(data.solicitudes) ? data.solicitudes : [])
      setTotal(data.total || 0)
    } catch (e) {
      console.error('Error al cargar solicitudes de garantía:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sucursalId) cargar()
  }, [sucursalId, filtroEstado])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {ESTADOS.map(e => (
          <button
            key={e.value || 'todas'}
            onClick={() => setFiltroEstado(e.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtroEstado === e.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : solicitudes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FaShieldAlt className="mx-auto text-4xl mb-3 opacity-30" />
          <p className="text-sm">No hay solicitudes de garantía{filtroEstado ? ` con estado "${filtroEstado}"` : ''}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {solicitudes.map(s => (
            <button
              key={s.id}
              onClick={() => setDetalleId(s.id)}
              className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono text-gray-400">#{s.id}</span>
                  <EstadoBadge estado={s.estado} />
                </div>
                <p className="font-semibold text-gray-800 truncate">{s.cliente_nombre}</p>
                <p className="text-sm text-gray-500">
                  {s.total_items} artículo{s.total_items !== 1 ? 's' : ''}
                  {s.tecnico_nombre ? ` · Técnico: ${s.tecnico_nombre}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0 flex items-center gap-3">
                <span className="text-xs text-gray-400">{formatFecha(s.fecha_creacion)}</span>
                <FaChevronRight className="text-gray-300 text-xs" />
              </div>
            </button>
          ))}
          {solicitudes.length < total && (
            <p className="text-xs text-gray-400 text-center">
              Mostrando {solicitudes.length} de {total}
            </p>
          )}
        </div>
      )}

      {detalleId !== null && (
        <PanelDetalle
          id={detalleId}
          rolId={rolId}
          userId={userId}
          onClose={() => setDetalleId(null)}
          onActualizado={cargar}
        />
      )}
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────────

export default function GarantiasSolicitudes() {
  const { user } = useUser()
  const esVentas = user?.rol_id === 3

  const [tab, setTab] = useState<'nueva' | 'solicitudes'>(esVentas ? 'nueva' : 'solicitudes')

  if (!user) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaShieldAlt className="text-indigo-600" /> Garantías
        </h1>
        <p className="text-sm text-gray-500">Gestión de solicitudes de garantía</p>
      </div>

      {esVentas && (
        <div className="flex gap-2">
          <button
            onClick={() => setTab('nueva')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === 'nueva' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Nueva solicitud
          </button>
          <button
            onClick={() => setTab('solicitudes')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === 'solicitudes' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Solicitudes
          </button>
        </div>
      )}

      {esVentas && tab === 'nueva' && (
        <NuevaSolicitud onCreada={() => setTab('solicitudes')} />
      )}

      {(!esVentas || tab === 'solicitudes') && (
        <ListaSolicitudes rolId={user.rol_id} userId={user.id} sucursalId={user.sucursal_id} />
      )}
    </div>
  )
}
