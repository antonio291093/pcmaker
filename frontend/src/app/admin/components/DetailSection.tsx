'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type Props = {
  sucursalId: number
  fecha: string
}

export default function DetailSection({ sucursalId, fecha }: Props) {

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'ventas' | 'movimientos'>('ventas')

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  const obtenerDetalle = async () => {
    try {
      setLoading(true)      

      const resp = await fetch(
        `${API_URL}/api/reportes/detalle-diario?sucursal_id=${sucursalId}&fecha=${fecha}`,
        { credentials: 'include' }
      )

      const json = await resp.json()
      setData(json)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    obtenerDetalle()
  }, [sucursalId, fecha])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">

        {/* Cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {[1,2,3,4].map(i => (
            <div
              key={i}
              className="bg-gray-100 border rounded-xl p-4 h-24"
            />
          ))}

        </div>

        {/* Corte skeleton */}
        <div className="bg-gray-100 border rounded-xl h-24" />

        {/* Tabs skeleton */}
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-gray-100 rounded-lg" />
          <div className="h-10 w-32 bg-gray-100 rounded-lg" />
        </div>

        {/* List skeleton */}
        <div className="space-y-3">

          {[1,2,3].map(i => (
            <div
              key={i}
              className="border rounded-xl p-4 bg-gray-50"
            >
              <div className="h-4 w-1/3 bg-gray-200 rounded mb-3" />
              <div className="h-3 w-1/2 bg-gray-100 rounded mb-2" />
              <div className="h-3 w-1/4 bg-gray-100 rounded" />
            </div>
          ))}

        </div>

      </div>
    )
  }

  if (!data) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border rounded-xl shadow p-5 space-y-6 input-minimal"
    >

      {/* RESUMEN */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 input-minimal">

        <Card title="Ventas" value={data.resumen_caja.ventas}/>
        <Card title="Ingresos" value={data.resumen_caja.otros_ingresos} />
        <Card title="Gastos" value={data.resumen_caja.gastos} />
        <Card title="Neto" value={data.resumen_caja.neto} />

      </div>

      {/* CORTE */}
      <div className="p-4 rounded-xl border bg-gray-50 flex justify-between items-center input-minimal">

        <div>
          <p className="text-sm text-gray-500">Estado del corte</p>

          <p className={`font-semibold ${
            data.corte.realizado ? 'text-green-600' : 'text-red-500'
          }`}>
            {data.corte.realizado ? 'Corte realizado' : 'Corte pendiente'}
          </p>
        </div>

        {data.corte.realizado && (
          <div className="text-sm text-gray-500 text-right">
            <p>{data.corte.usuario}</p>
            <p>{new Date(data.corte.hora).toLocaleTimeString()}</p>
          </div>
        )}

      </div>

      {/* TABS */}
      <div className="flex gap-3 border-b pb-2 input-minimal">
        <button onClick={() => setTab('ventas')}>Ventas</button>
        <button onClick={() => setTab('movimientos')}>Movimientos</button>
      </div>

      {/* VENTAS */}
      {tab === 'ventas' && (
        <div className="space-y-3 input-minimal">

          {data.ventas.map((v: any) => (
            <div key={v.detalle_id} className="border rounded-lg p-3 input-minimal">

              <div className="flex justify-between text-sm">
                <span className="font-medium">{v.descripcion}</span>
                <span className="text-indigo-600 font-semibold">
                  ${Number(v.subtotal).toLocaleString()}
                </span>
              </div>

              <div className="text-xs text-gray-500">
                {v.cliente}
              </div>

              <div className="text-xs text-gray-400">
                {v.metodo_pago}
              </div>

            </div>
          ))}

        </div>
      )}

      {/* MOVIMIENTOS */}
      {tab === 'movimientos' && (
        <div className="space-y-2 input-minimal">

          {data.movimientos.map((m: any) => (
            <div key={m.id} className="flex justify-between text-sm border-b pb-2 input-minimal">

              <div>
                <p className="font-medium">{m.descripcion}</p>
                <p className="text-xs text-gray-400">{m.tipo}</p>
              </div>

              <span className={`
                font-semibold
                ${m.tipo === 'gasto' ? 'text-red-500' : 'text-green-600'}
              `}>
                ${Number(m.monto).toLocaleString()}
              </span>

            </div>
          ))}

        </div>
      )}

    </motion.div>
  )
}

/* 🔹 Card reutilizable */
function Card({ title, value }: { title: string, value: number }) {
  return (
    <div className="bg-gray-50 border rounded-lg p-4 input-minimal">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-lg font-semibold text-indigo-600">
        ${Number(value).toLocaleString()}
      </p>
    </div>
  )
}