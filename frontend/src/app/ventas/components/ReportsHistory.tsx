'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FaDownload } from 'react-icons/fa'

const API_URL = process.env.NEXT_PUBLIC_API_URL

type VentaRow = {
  venta_id: number
  cliente: string
  metodo_pago: string
  fecha_venta: string
  concepto: string
  subtotal: number
}

type Totales = {
  efectivo: number
  transferencia: number
  terminal: number
  facturacion: number
  total: number
}

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diffMonday = day === 0 ? -6 : 1 - day

  const monday = new Date(now)
  monday.setDate(now.getDate() + diffMonday)

  const saturday = new Date(monday)
  saturday.setDate(monday.getDate() + 5)

  return {
    from: monday.toISOString().slice(0, 10),
    to: saturday.toISOString().slice(0, 10)
  }
}

const metodoColors: Record<string, string> = {
  efectivo: 'bg-green-100 text-green-700',
  transferencia: 'bg-blue-100 text-blue-700',
  terminal: 'bg-purple-100 text-purple-700',
  facturacion: 'bg-yellow-100 text-yellow-700'
}

export default function ReportsHistory() {
  const week = getWeekRange()

  const [from, setFrom] = useState(week.from)
  const [to, setTo] = useState(week.to)
  const [ventas, setVentas] = useState<VentaRow[]>([])
  const [totales, setTotales] = useState<Totales | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchReport = async () => {
    try {
      setLoading(true)

      const resp = await fetch(
        `${API_URL}/api/ventas?from=${from}&to=${to}`,
        { credentials: 'include' }
      )

      if (!resp.ok) {
        setVentas([])
        setTotales(null)
        return
      }

      const data = await resp.json()

      setVentas(Array.isArray(data?.detalle) ? data.detalle : [])
      setTotales(data?.totales || null)

    } catch (error) {
      console.error(error)
      setVentas([])
      setTotales(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [])

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className='bg-white rounded-xl shadow p-6 w-full flex flex-col'
    >
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-lg font-semibold text-gray-700'>Historial de ventas</h2>
        <button className='flex items-center gap-2 text-sm text-indigo-600 hover:underline'>
          <FaDownload className="text-lg text-indigo-600" /> Exportar
        </button>
      </div>

      {/* Filtros */}
      <div className='flex flex-wrap gap-4 mb-4'>
        <div>
          <label className='text-xs text-gray-500'>Desde</label>
          <input type='date' value={from} onChange={e => setFrom(e.target.value)} className='border rounded px-2 py-1 text-sm' />
        </div>
        <div>
          <label className='text-xs text-gray-500'>Hasta</label>
          <input type='date' value={to} onChange={e => setTo(e.target.value)} className='border rounded px-2 py-1 text-sm' />
        </div>
        <button onClick={fetchReport} className='self-end bg-indigo-600 text-white px-4 py-2 rounded text-sm'>Filtrar</button>
      </div>

      {/* Tabla */}
      <div className='overflow-auto max-h-[420px]'>
        <table className='w-full table-auto text-sm'>
          <thead className='sticky top-0 bg-gray-50'>
            <tr>
              <th className='p-2 text-left text-gray-500'>Fecha</th>
              <th className='p-2 text-left text-gray-500'>Cliente</th>
              <th className='p-2 text-left text-gray-500'>Concepto</th>
              <th className='p-2 text-left text-gray-500'>Pago</th>
              <th className='p-2 text-right text-gray-500'>Monto</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map(v => (
              <tr key={`${v.venta_id}-${v.concepto}`} className='border-b hover:bg-gray-50'>
                <td className='p-2'>{v.fecha_venta}</td>
                <td className='p-2'>{v.cliente}</td>
                <td className='p-2 flex items-center gap-1'>
                  <span>{v.concepto}</span>
                  <span title='Servicio'>🛠️</span>
                </td>
                <td className='p-2'>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${metodoColors[v.metodo_pago] || ''}`}>
                    {v.metodo_pago}
                  </span>
                </td>
                <td className="p-2 text-right">
                  ${Number(v.subtotal || 0).toFixed(2)}
                </td>
              </tr>
            ))}
            {!loading && ventas.length === 0 && (
              <tr><td colSpan={5} className='p-4 text-center text-gray-400'>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totales sticky */}
      {totales && (
        <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 sticky bottom-0 bg-white pt-4'>
          {Object.entries(totales).map(([k, v]) => (
            <div key={k} className='bg-gray-50 rounded-xl p-4 shadow-sm'>
              <p className='text-xs text-gray-500 uppercase'>{k}</p>
              <p className='text-lg font-semibold text-gray-700'>${v.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
