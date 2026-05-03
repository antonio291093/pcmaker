'use client'

import { useEffect, useState } from 'react'
import SucursalCard from './SucursalCard'
import DetailSection from './DetailSection'

type SucursalResumen = {
  id: number
  nombre: string
  ingresos: number
  gastos: number
  neto: number
  corte_realizado: boolean
}

export default function DailySummaryTab() {
  const [selected, setSelected] = useState<number | null>(null)

  const [fecha, setFecha] = useState(() => {

    const today = new Date()

    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`

  })

  const [loading, setLoading] = useState(true)
  const [sucursales, setSucursales] = useState<SucursalResumen[]>([])

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  const cargarResumen = async () => {
    try {
      setLoading(true)

      const resp = await fetch(
        `${API_URL}/api/reportes/ReportesSucursales?fecha=${fecha}`,
        {
          credentials: 'include'
        }
      )

      if (!resp.ok) {
        throw new Error('Error cargando resumen')
      }

      const data = await resp.json()

      setSucursales(
        data.map((s: any) => ({
          ...s,
          ingresos: Number(s.ingresos),
          gastos: Number(s.gastos),
          neto: Number(s.neto)
        }))
      )

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarResumen()
  }, [fecha])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            Resumen diario por sucursal
          </h3>

          <p className="text-sm text-gray-500">
            Consulta ingresos, gastos y cortes de caja.
          </p>
        </div>

        {/* DatePicker */}
        <div className="flex items-center gap-3">

          <label className="text-sm font-medium text-gray-600">
            Fecha:
          </label>

          <input
            type="date"
            value={fecha}
            onChange={(e) => {
              setSelected(null)
              setFecha(e.target.value)
            }}
            className="
              border rounded-lg px-3 py-2 text-sm
              bg-white text-gray-700
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              input-minimal
            "
          />

        </div>

      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">

          {[1,2].map(i => (
            <div
              key={i}
              className="bg-gray-100 border rounded-xl p-5 h-56"
            />
          ))}

        </div>
      )}

      {/* Empty */}
      {!loading && sucursales.length === 0 && (
        <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-500">
          No hay información disponible.
        </div>
      )}

      {/* Cards */}
      {!loading && sucursales.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {sucursales.map((sucursal) => (
            <SucursalCard
              key={sucursal.id}
              data={{
                id: sucursal.id,
                sucursal: sucursal.nombre,
                fecha,
                ingresos: sucursal.ingresos,
                gastos: sucursal.gastos,
                corteRealizado: sucursal.corte_realizado
              }}
              isActive={selected === sucursal.id}
              onSelect={() =>
                setSelected(
                  selected === sucursal.id
                    ? null
                    : sucursal.id
                )
              }
            />
          ))}

        </div>
      )}

      {/* Detail */}
      {selected && (
        <DetailSection
          sucursalId={selected}
          fecha={fecha}
        />
      )}

    </div>
  )
}