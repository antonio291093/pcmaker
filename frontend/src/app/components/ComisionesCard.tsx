'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useUser } from '@/context/UserContext'
import { API_URL } from '@/utils/api'
import { toDateString } from '@/utils/fecha'

interface ItemVenta {
  nombre: string | null
  precio: number
  cantidad: number
}

interface Venta {
  id: number
  total_venta: number
  items: ItemVenta[]
}

interface Equipo {
  equipo_id: number
  nombre: string
  precio: number
  procesador: string | null
  ram: string | null
}

interface Mantenimiento {
  id: number
  tipo_mantenimiento: string | null
  detalle: string | null
  fecha_mantenimiento: string | null
}

interface Comision {
  id: number
  tipo: 'venta' | 'armado' | 'mantenimiento'
  monto: string
  fecha_creacion: string
  venta: Venta | null
  equipo: Equipo | null
  mantenimiento: Mantenimiento | null
}

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

export default function ComisionesCard() {
  const { user, loading: userLoading } = useUser()

  const semana = semanaActual()
  const [fechaInicio, setFechaInicio] = useState(semana.inicio)
  const [fechaFin, setFechaFin]       = useState(semana.fin)
  const [comisiones, setComisiones]   = useState<Comision[]>([])
  const [total, setTotal]             = useState(0)
  const [cargando, setCargando]       = useState(false)

  const fetchComisiones = (uid: number, inicio: string, fin: string) => {
    setCargando(true)
    const params = new URLSearchParams({ fecha_inicio: inicio, fecha_fin: fin })
    fetch(`${API_URL}/api/comisiones/semana/${uid}?${params}`, { credentials: 'include' })
      .then(res => res.json())
      .then((data: Comision[]) => {
        const validas = data.filter(x => x.id !== null)
        setComisiones(validas)
        setTotal(validas.reduce((acc, c) => acc + Number(c.monto), 0))
      })
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    if (user?.id) fetchComisiones(user.id, fechaInicio, fechaFin)
  }, [user?.id])

  if (userLoading) return <p>Cargando comisiones...</p>
  if (!user) return null

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 70, delay: 0.2 }}
      className="bg-white rounded-xl shadow p-4 sm:p-6 w-full max-w-full"
    >
      <h2 className="text-lg font-semibold mb-4 text-gray-700">
        Mis comisiones
      </h2>

      {/* === FILTRO DE FECHAS === */}
      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Hasta</label>
          <input
            type="date"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <button
          onClick={() => fetchComisiones(user.id, fechaInicio, fechaFin)}
          disabled={cargando}
          className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {cargando ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {/* === RESUMEN === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-indigo-50 rounded-lg text-center">
          <span className="text-sm text-gray-500">Total período</span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">
            ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="p-4 bg-indigo-50 rounded-lg text-center">
          <span className="text-sm text-gray-500">Comisiones</span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">
            {comisiones.length}
          </div>
        </div>
      </div>

      {/* === DETALLE === */}
      <div>
        <h3 className="mb-2 text-gray-600 font-medium">Detalle</h3>
        <ul className="divide-y divide-gray-200 text-gray-700">
          {comisiones.length === 0 ? (
            <li className="py-2 text-center text-gray-400">
              No hay comisiones en este período
            </li>
          ) : (
            comisiones.map(c => (
              <li key={c.id} className="py-3 border-b">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {c.tipo === 'venta'         && `Venta #${c.venta?.id}`}
                    {c.tipo === 'armado'        && 'Armado de equipo'}
                    {c.tipo === 'mantenimiento' && 'Mantenimiento'}
                  </span>
                  <span className="text-sm">
                    ${Number(c.monto).toFixed(2)} |{' '}
                    {new Date(c.fecha_creacion).toLocaleDateString('es-MX')}
                  </span>
                </div>

                {c.tipo === 'venta' && c.venta && (
                  <ul className="ml-4 mt-1 text-sm text-gray-600">
                    {c.venta.items.map((item, idx) => (
                      <li key={idx}>
                        • {item.nombre || 'Producto sin descripción'}{' '}
                        {item.cantidad > 1
                          ? `(${item.cantidad} × $${item.precio} = $${item.cantidad * item.precio})`
                          : `($${item.precio})`}
                      </li>
                    ))}
                    <li className="font-semibold">Total venta: ${c.venta.total_venta}</li>
                  </ul>
                )}

                {c.tipo === 'armado' && c.equipo && (
                  <div className="ml-4 mt-1 text-sm text-gray-600 space-y-0.5">
                    <p>{c.equipo.nombre}</p>
                    {c.equipo.procesador && <p className="text-gray-500">{c.equipo.procesador}</p>}
                    {c.equipo.ram        && <p className="text-gray-500">RAM: {c.equipo.ram}</p>}
                    {c.equipo.precio != null && (
                      <p className="font-semibold">${Number(c.equipo.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    )}
                  </div>
                )}

                {c.tipo === 'mantenimiento' && c.mantenimiento && (
                  <div className="ml-4 mt-1 text-sm text-gray-600 space-y-0.5">
                    {c.mantenimiento.tipo_mantenimiento && (
                      <p className="font-medium">{c.mantenimiento.tipo_mantenimiento}</p>
                    )}
                    {c.mantenimiento.detalle && (
                      <p className="text-gray-500">{c.mantenimiento.detalle}</p>
                    )}
                    {c.mantenimiento.fecha_mantenimiento && (
                      <p className="text-gray-400 text-xs">
                        {new Date(c.mantenimiento.fecha_mantenimiento).toLocaleDateString('es-MX')}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </motion.div>
  )
}
