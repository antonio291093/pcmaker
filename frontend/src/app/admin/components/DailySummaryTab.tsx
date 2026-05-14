'use client'

import { useEffect, useState } from 'react'
import SucursalCard from './SucursalCard'
import DetailSection from './DetailSection'
import { API_URL } from '@/utils/api'
import { toDateString } from '@/utils/fecha'
import { exportResumenDiario } from '@/utils/exportReportes'

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

  const [fecha, setFecha] = useState(() => toDateString())

  const [loading, setLoading] = useState(true)
  const [sucursales, setSucursales] = useState<SucursalResumen[]>([])

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
        data.map((s: SucursalResumen) => ({
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

        {/* DatePicker + Exportar */}
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

          <button
            onClick={() => exportResumenDiario(sucursales, fecha)}
            disabled={!sucursales.length || loading}
            className="
              px-4 py-2 rounded-lg text-sm font-medium
              bg-emerald-600 text-white
              hover:bg-emerald-700 transition
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            Exportar Excel
          </button>

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