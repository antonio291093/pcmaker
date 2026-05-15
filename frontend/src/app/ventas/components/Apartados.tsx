'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { API_URL } from '@/utils/api'
import Swal from 'sweetalert2'
import ModalSeleccionarProducto, { ProductoSeleccionado } from '@/app/components/SeleccionarProductoModal'
import {
  FaTag, FaPlus, FaSearch, FaTimes, FaChevronRight, FaExclamationTriangle, FaCheck,
} from 'react-icons/fa'

// ─── Interfaces ───────────────────────────────────────────────

interface Abono {
  id: number
  monto: string
  metodo_pago: string
  observaciones: string | null
  fecha_creacion: string
  usuario: string
}

interface ApartadoResumen {
  id: number
  estado: 'activo' | 'liquidado' | 'cancelado'
  cantidad: number
  precio_unitario: string
  precio_total: string
  enganche_minimo: string
  monto_abonado: string
  fecha_limite: string
  fecha_creacion: string
  motivo_cancelacion: string | null
  cliente_id: number
  cliente_nombre: string
  cliente_telefono: string | null
  producto_tipo: string
  producto_especificacion: string | null
  producto_sku: string | null
  sucursal: string
  usuario: string
}

interface ApartadoDetalle extends ApartadoResumen {
  cliente_correo: string | null
  producto_precio_actual: string
  venta_id: number | null
  abonos: Abono[]
}

interface ConfigApartado {
  enganche_tipo: 'porcentaje' | 'fijo'
  enganche_valor: number
  dias_limite: number
  dias_sin_abono: number
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

const METODOS = ['efectivo', 'transferencia', 'terminal'] as const
type Metodo = (typeof METODOS)[number]

// ─── Badge de estado ──────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const clases =
    estado === 'activo'    ? 'bg-green-100 text-green-700' :
    estado === 'liquidado' ? 'bg-blue-100 text-blue-700'   :
                             'bg-red-100 text-red-700'
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${clases}`}>
      {estado}
    </span>
  )
}

// ─── Modal: Nuevo Apartado ─────────────────────────────────────

function ModalNuevoApartado({
  config,
  sucursal_id,
  onClose,
  onCreado,
}: {
  config: ConfigApartado
  sucursal_id: number
  onClose: () => void
  onCreado: () => void
}) {
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoSeleccionado | null>(null)
  const [abrirSelector, setAbrirSelector] = useState(false)
  const [clienteNombre, setClienteNombre]     = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteCorreo, setClienteCorreo]     = useState('')
  const [montoEnganche, setMontoEnganche]     = useState('')
  const [metodoPago, setMetodoPago]           = useState<Metodo>('efectivo')
  const [guardando, setGuardando]             = useState(false)

  const precioTotal = productoSeleccionado
    ? Number(productoSeleccionado.precio ?? 0) * (productoSeleccionado.cantidadSeleccionada || 1)
    : 0

  const engancheMinimo = config.enganche_tipo === 'fijo'
    ? config.enganche_valor
    : Number((precioTotal * config.enganche_valor / 100).toFixed(2))

  const fechaLimite = (() => {
    const d = new Date()
    d.setDate(d.getDate() + config.dias_limite)
    return formatFecha(d.toISOString())
  })()

  const handleSeleccionar = (productos: ProductoSeleccionado[]) => {
    if (productos.length) setProductoSeleccionado(productos[0])
    setAbrirSelector(false)
  }

  const handleSubmit = async () => {
    if (!productoSeleccionado || !clienteNombre.trim()) {
      return Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Selecciona un producto e ingresa el nombre del cliente', confirmButtonColor: '#16A34A' })
    }
    if (Number(montoEnganche) < engancheMinimo) {
      return Swal.fire({ icon: 'warning', title: 'Enganche insuficiente', text: `El enganche mínimo es ${formatMXN(engancheMinimo)}`, confirmButtonColor: '#16A34A' })
    }
    setGuardando(true)
    try {
      const resp = await fetch(`${API_URL}/api/apartados`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoSeleccionado.id,
          cantidad:    productoSeleccionado.cantidadSeleccionada || 1,
          sucursal_id,
          cliente: {
            nombre:   clienteNombre.trim(),
            telefono: clienteTelefono.trim() || null,
            correo:   clienteCorreo.trim()   || null,
          },
          monto_enganche:    Number(montoEnganche),
          metodo_pago_enganche: metodoPago,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message)
      Swal.fire({ icon: 'success', title: 'Apartado creado', text: `Folio #${data.apartado_id}`, confirmButtonColor: '#16A34A' })
      onCreado()
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: e instanceof Error ? e.message : 'Error al crear', confirmButtonColor: '#16A34A' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-bold text-gray-800">Nuevo Apartado</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-4">
            {/* Selector de producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
              {productoSeleccionado ? (
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{productoSeleccionado.tipo}</p>
                    {productoSeleccionado.especificacion && (
                      <p className="text-xs text-gray-500">{productoSeleccionado.especificacion}</p>
                    )}
                    <p className="text-xs text-indigo-600 font-medium mt-0.5">{formatMXN(productoSeleccionado.precio ?? 0)}</p>
                  </div>
                  <button onClick={() => setAbrirSelector(true)} className="text-xs text-indigo-500 underline">Cambiar</button>
                </div>
              ) : (
                <button
                  onClick={() => setAbrirSelector(true)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2"
                >
                  <FaSearch /> Seleccionar producto
                </button>
              )}
            </div>

            {productoSeleccionado && (
              <>
                {/* Resumen calculado */}
                <div className="grid grid-cols-3 gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Total</p>
                    <p className="font-bold text-gray-800">{formatMXN(precioTotal)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Enganche mínimo</p>
                    <p className="font-bold text-amber-700">{formatMXN(engancheMinimo)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Fecha límite</p>
                    <p className="font-semibold text-gray-800">{fechaLimite}</p>
                  </div>
                </div>

                {/* Datos del cliente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del cliente <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Nombre completo"
                    value={clienteNombre}
                    onChange={e => setClienteNombre(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="10 dígitos"
                      value={clienteTelefono}
                      onChange={e => setClienteTelefono(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="correo@ejemplo.com"
                      value={clienteCorreo}
                      onChange={e => setClienteCorreo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Enganche */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto del enganche <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" min={engancheMinimo} step="0.01"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder={`Mínimo ${formatMXN(engancheMinimo)}`}
                    value={montoEnganche}
                    onChange={e => setMontoEnganche(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago del enganche</label>
                  <div className="flex gap-2">
                    {METODOS.map(m => (
                      <button key={m} onClick={() => setMetodoPago(m)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${
                          metodoPago === m
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-300 text-gray-600 hover:border-indigo-400'
                        }`}
                      >{m}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
            <button
              onClick={handleSubmit}
              disabled={guardando || !productoSeleccionado}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
            >
              {guardando ? 'Guardando...' : 'Crear apartado'}
            </button>
          </div>
        </div>
      </div>

      {abrirSelector && (
        <ModalSeleccionarProducto
          onClose={() => setAbrirSelector(false)}
          onSeleccionar={handleSeleccionar}
        />
      )}
    </>
  )
}

// ─── Modal: Detalle + acciones ────────────────────────────────

type VistaDetalle = 'detalle' | 'abonar' | 'cancelar' | 'liquidar'

function ModalDetalle({
  apartado,
  onClose,
  onActualizado,
}: {
  apartado: ApartadoDetalle
  onClose: () => void
  onActualizado: () => void
}) {
  const [vista, setVista]                   = useState<VistaDetalle>('detalle')
  const [montoAbono, setMontoAbono]         = useState('')
  const [metodoAbono, setMetodoAbono]       = useState<Metodo>('efectivo')
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [pagosLiquidar, setPagosLiquidar]   = useState<{ metodo: Metodo; monto: string }[]>([{ metodo: 'efectivo', monto: '' }])
  const [guardando, setGuardando]           = useState(false)

  const saldo    = Number(apartado.precio_total) - Number(apartado.monto_abonado)
  const progreso = Math.min(100, (Number(apartado.monto_abonado) / Number(apartado.precio_total)) * 100)

  const post = async (path: string, body: object) => {
    const resp = await fetch(`${API_URL}/api/apartados/${apartado.id}/${path}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.message)
    return data
  }

  const handleAbono = async () => {
    if (!montoAbono || Number(montoAbono) <= 0)
      return Swal.fire({ icon: 'warning', title: 'Monto inválido', confirmButtonColor: '#16A34A' })
    setGuardando(true)
    try {
      await post('abonos', { monto: Number(montoAbono), metodo_pago: metodoAbono })
      Swal.fire({ icon: 'success', title: 'Abono registrado', confirmButtonColor: '#16A34A' })
      onActualizado()
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: e instanceof Error ? e.message : 'Error', confirmButtonColor: '#16A34A' })
    } finally { setGuardando(false) }
  }

  const handleCancelar = async () => {
    setGuardando(true)
    try {
      await post('cancelar', { motivo_cancelacion: motivoCancelacion || null })
      Swal.fire({ icon: 'success', title: 'Apartado cancelado', confirmButtonColor: '#16A34A' })
      onActualizado()
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: e instanceof Error ? e.message : 'Error', confirmButtonColor: '#16A34A' })
    } finally { setGuardando(false) }
  }

  const handleLiquidar = async () => {
    const pagosValidos = pagosLiquidar.filter(p => Number(p.monto) > 0)
    if (saldo > 0 && !pagosValidos.length)
      return Swal.fire({ icon: 'warning', title: 'Ingresa el pago del saldo restante', confirmButtonColor: '#16A34A' })
    setGuardando(true)
    try {
      const data = await post('liquidar', {
        pagos: pagosValidos.map(p => ({ metodo: p.metodo, monto: Number(p.monto) })),
      })
      Swal.fire({ icon: 'success', title: 'Apartado liquidado', text: `Venta #${data.venta_id} generada`, confirmButtonColor: '#16A34A' })
      onActualizado()
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: e instanceof Error ? e.message : 'Error', confirmButtonColor: '#16A34A' })
    } finally { setGuardando(false) }
  }

  const titulos: Record<VistaDetalle, string> = {
    detalle:  `Apartado #${apartado.id}`,
    abonar:   'Registrar abono',
    cancelar: 'Cancelar apartado',
    liquidar: 'Liquidar apartado',
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b gap-3">
          <div className="flex items-center gap-3">
            {vista !== 'detalle' && (
              <button onClick={() => setVista('detalle')} className="text-gray-400 hover:text-gray-600 text-sm">← Volver</button>
            )}
            <h2 className="text-lg font-bold text-gray-800">{titulos[vista]}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-4">

          {/* ── Detalle principal ── */}
          {vista === 'detalle' && (
            <>
              <div>
                <p className="font-semibold text-gray-800">{apartado.cliente_nombre}</p>
                {apartado.cliente_telefono && <p className="text-sm text-gray-500">{apartado.cliente_telefono}</p>}
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-sm flex flex-col gap-0.5">
                <p className="font-medium text-gray-700">{apartado.producto_tipo}</p>
                {apartado.producto_especificacion && <p className="text-gray-500 text-xs">{apartado.producto_especificacion}</p>}
                {apartado.producto_sku && <p className="text-gray-400 text-xs">SKU: {apartado.producto_sku}</p>}
              </div>

              {/* Progreso */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Abonado: {formatMXN(apartado.monto_abonado)}</span>
                  <span>Total: {formatMXN(apartado.precio_total)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-indigo-500 h-2.5 rounded-full transition-all" style={{ width: `${progreso}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Saldo pendiente: <span className="font-semibold text-gray-800">{formatMXN(saldo)}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500">Fecha límite</p><p className="font-semibold">{formatFecha(apartado.fecha_limite)}</p></div>
                <div><p className="text-gray-500">Creado por</p><p className="font-semibold">{apartado.usuario}</p></div>
                <div><p className="text-gray-500">Enganche mínimo</p><p className="font-semibold">{formatMXN(apartado.enganche_minimo)}</p></div>
                <div><p className="text-gray-500">Estado</p><EstadoBadge estado={apartado.estado} /></div>
              </div>

              {apartado.abonos.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Abonos ({apartado.abonos.length})</p>
                  <div className="flex flex-col gap-2">
                    {apartado.abonos.map(ab => (
                      <div key={ab.id} className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-gray-800">{formatMXN(ab.monto)}</p>
                          <p className="text-xs text-gray-500 capitalize">{ab.metodo_pago} · {ab.usuario}</p>
                        </div>
                        <p className="text-xs text-gray-400">{formatFecha(ab.fecha_creacion)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {apartado.motivo_cancelacion && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <p className="font-medium">Motivo de cancelación:</p>
                  <p>{apartado.motivo_cancelacion}</p>
                </div>
              )}
            </>
          )}

          {/* ── Abonar ── */}
          {vista === 'abonar' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                <p className="text-gray-500">Saldo pendiente</p>
                <p className="text-2xl font-bold text-amber-700">{formatMXN(saldo)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto del abono</label>
                <input
                  type="number" min="0.01" step="0.01" max={saldo}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder={`Máximo ${formatMXN(saldo)}`}
                  value={montoAbono}
                  onChange={e => setMontoAbono(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                <div className="flex gap-2">
                  {METODOS.map(m => (
                    <button key={m} onClick={() => setMetodoAbono(m)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${
                        metodoAbono === m
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-300 text-gray-600 hover:border-indigo-400'
                      }`}
                    >{m}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Cancelar ── */}
          {vista === 'cancelar' && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex gap-2 items-start">
                <FaExclamationTriangle className="mt-0.5 shrink-0" />
                <p>El apartado se cancelará. El cliente deberá solicitar la devolución de sus abonos de manera presencial.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
                <textarea
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  rows={3}
                  placeholder="Ej: Cliente desistió, producto agotado..."
                  value={motivoCancelacion}
                  onChange={e => setMotivoCancelacion(e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── Liquidar ── */}
          {vista === 'liquidar' && (
            <>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm">
                <p className="text-gray-500">Saldo a liquidar</p>
                <p className="text-2xl font-bold text-indigo-700">{formatMXN(saldo)}</p>
                <p className="text-xs text-gray-500 mt-1">Ya abonado: {formatMXN(apartado.monto_abonado)}</p>
              </div>
              {saldo === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex gap-2 items-start">
                  <FaCheck className="mt-0.5 shrink-0" />
                  <p>El apartado está completamente pagado. Confirma para generar la venta.</p>
                </div>
              ) : (
              <>
              <p className="text-sm text-gray-600">Registra el pago del saldo restante:</p>
              {pagosLiquidar.map((p, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Monto</label>
                    <input
                      type="number" min="0.01" step="0.01"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={p.monto}
                      onChange={e => {
                        const c = [...pagosLiquidar]
                        c[i] = { ...c[i], monto: e.target.value }
                        setPagosLiquidar(c)
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Método</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={p.metodo}
                      onChange={e => {
                        const c = [...pagosLiquidar]
                        c[i] = { ...c[i], metodo: e.target.value as Metodo }
                        setPagosLiquidar(c)
                      }}
                    >
                      {METODOS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
                    </select>
                  </div>
                  {pagosLiquidar.length > 1 && (
                    <button
                      onClick={() => setPagosLiquidar(pagosLiquidar.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 pb-2"
                    ><FaTimes /></button>
                  )}
                </div>
              ))}
              {pagosLiquidar.length < 3 && (
                <button
                  onClick={() => setPagosLiquidar([...pagosLiquidar, { metodo: 'efectivo', monto: '' }])}
                  className="text-sm text-indigo-500 hover:text-indigo-700"
                >
                  + Agregar método de pago
                </button>
              )}
              </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center">
          {vista === 'detalle' && apartado.estado === 'activo' && (
            <div className="flex gap-2 w-full">
              <button onClick={() => setVista('abonar')}   className="flex-1 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors">Abonar</button>
              <button onClick={() => setVista('liquidar')} className="flex-1 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors">Liquidar</button>
              <button onClick={() => setVista('cancelar')} className="flex-1 py-2 text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl transition-colors">Cancelar</button>
            </div>
          )}
          {vista === 'detalle' && apartado.estado !== 'activo' && (
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cerrar</button>
          )}
          {vista === 'abonar' && (
            <>
              <button onClick={() => setVista('detalle')} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button onClick={handleAbono} disabled={guardando} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Registrar abono'}
              </button>
            </>
          )}
          {vista === 'cancelar' && (
            <>
              <button onClick={() => setVista('detalle')} className="px-4 py-2 text-sm text-gray-600">Volver</button>
              <button onClick={handleCancelar} disabled={guardando} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                {guardando ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </>
          )}
          {vista === 'liquidar' && (
            <>
              <button onClick={() => setVista('detalle')} className="px-4 py-2 text-sm text-gray-600">Volver</button>
              <button onClick={handleLiquidar} disabled={guardando} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                {guardando ? 'Procesando...' : 'Confirmar liquidación'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────

export default function Apartados() {
  const { user } = useUser()
  const [apartados, setApartados]       = useState<ApartadoResumen[]>([])
  const [config, setConfig]             = useState<ConfigApartado | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<string>('activo')
  const [loading, setLoading]           = useState(true)
  const [modalNuevo, setModalNuevo]     = useState(false)
  const [detalle, setDetalle]           = useState<ApartadoDetalle | null>(null)

  const sucursal_id = user?.sucursal_id ?? 0

  const cargar = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sucursal_id: String(sucursal_id) })
      if (filtroEstado) params.append('estado', filtroEstado)

      const [resAp, resCfg] = await Promise.all([
        fetch(`${API_URL}/api/apartados?${params}`, { credentials: 'include' }),
        config
          ? Promise.resolve(null)
          : fetch(`${API_URL}/api/apartados/configuraciones`, { credentials: 'include' }),
      ])

      const dataAp = await resAp.json()
      setApartados(Array.isArray(dataAp) ? dataAp : [])

      if (resCfg) {
        const dataCfg = await resCfg.json()
        setConfig(dataCfg)
      }
    } catch (e) {
      console.error('Error al cargar apartados:', e)
    } finally {
      setLoading(false)
    }
  }

  const abrirDetalle = async (id: number) => {
    try {
      const resp = await fetch(`${API_URL}/api/apartados/${id}`, { credentials: 'include' })
      const data = await resp.json()
      setDetalle(data)
    } catch (e) {
      console.error('Error al cargar detalle:', e)
    }
  }

  useEffect(() => {
    if (sucursal_id) cargar()
  }, [sucursal_id, filtroEstado])

  const filtros = [
    { label: 'Activos',    value: 'activo' },
    { label: 'Liquidados', value: 'liquidado' },
    { label: 'Cancelados', value: 'cancelado' },
    { label: 'Todos',      value: '' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Apartados</h1>
          <p className="text-sm text-gray-500">Gestión de productos reservados</p>
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <FaPlus /> Nuevo apartado
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {filtros.map(f => (
          <button
            key={f.value}
            onClick={() => setFiltroEstado(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtroEstado === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : apartados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FaTag className="mx-auto text-4xl mb-3 opacity-30" />
          <p className="text-sm">
            No hay apartados{filtroEstado ? ` con estado "${filtroEstado}"` : ''}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {apartados.map(ap => {
            const progreso = Math.min(100, (Number(ap.monto_abonado) / Number(ap.precio_total)) * 100)
            const saldo    = Number(ap.precio_total) - Number(ap.monto_abonado)
            return (
              <button
                key={ap.id}
                onClick={() => abrirDetalle(ap.id)}
                className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-gray-400">#{ap.id}</span>
                      <EstadoBadge estado={ap.estado} />
                    </div>
                    <p className="font-semibold text-gray-800 truncate">{ap.cliente_nombre}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {ap.producto_tipo}{ap.producto_especificacion ? ` — ${ap.producto_especificacion}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Saldo</p>
                    <p className="font-bold text-gray-800">{formatMXN(saldo)}</p>
                    <p className="text-xs text-gray-400">de {formatMXN(ap.precio_total)}</p>
                  </div>
                </div>

                <div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${progreso}%` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>{progreso.toFixed(0)}% abonado</span>
                    <span>Límite: {formatFecha(ap.fecha_limite)}</span>
                  </div>
                </div>

                <FaChevronRight className="self-end text-gray-300 text-xs" />
              </button>
            )
          })}
        </div>
      )}

      {modalNuevo && config && (
        <ModalNuevoApartado
          config={config}
          sucursal_id={sucursal_id}
          onClose={() => setModalNuevo(false)}
          onCreado={() => { setModalNuevo(false); cargar() }}
        />
      )}

      {detalle && (
        <ModalDetalle
          apartado={detalle}
          onClose={() => setDetalle(null)}
          onActualizado={() => { setDetalle(null); cargar() }}
        />
      )}
    </div>
  )
}
