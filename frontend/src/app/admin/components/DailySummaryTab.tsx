'use client'

import { useEffect, useMemo, useState } from 'react'
import SucursalCard from './SucursalCard'
import DetailSection from './DetailSection'
import { API_URL } from '@/utils/api'
import { toDateString } from '@/utils/fecha'
import { exportResumenDiario } from '@/utils/exportReportes'

type SucursalResumen = {
  id: number
  nombre: string
  fecha: string
  ingresos: number
  gastos: number
  neto: number
  corte_realizado: boolean
}

function formatFechaDisplay(fecha: string) {
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

function claveSeleccion(id: number, fecha: string) {
  return `${id}_${fecha}`
}

export default function DailySummaryTab() {
  const [selected, setSelected] = useState<string | null>(null)

  const [fechaInicio, setFechaInicio] = useState(() => toDateString())
  const [fechaFin, setFechaFin] = useState(() => toDateString())

  const [loading, setLoading] = useState(true)
  const [sucursales, setSucursales] = useState<SucursalResumen[]>([])

  const rangoInvalido = fechaInicio > fechaFin

  const cargarResumen = async () => {
    if (rangoInvalido) return

    try {
      setLoading(true)
      setSelected(null)

      const resp = await fetch(
        `${API_URL}/api/reportes/ReportesSucursales?desde=${fechaInicio}&hasta=${fechaFin}`,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grupos = useMemo(() => {
    const map = new Map<string, SucursalResumen[]>()

    for (const s of sucursales) {
      if (!map.has(s.fecha)) map.set(s.fecha, [])
      map.get(s.fecha)!.push(s)
    }

    return Array.from(map.entries())
  }, [sucursales])

  const detalleActivo = useMemo(() => {
    if (!selected) return null
    return sucursales.find(
      (s) => claveSeleccion(s.id, s.fecha) === selected
    ) ?? null
  }, [selected, sucursales])

  const gruposVisibles = useMemo(() => {
    if (!detalleActivo) return grupos
    return grupos.filter(([fecha]) => fecha === detalleActivo.fecha)
  }, [grupos, detalleActivo])

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

        {/* Rango de fechas + Filtrar + Exportar */}
        <div className="flex flex-wrap items-center gap-3">

          <label className="text-sm font-medium text-gray-600">
            Del:
          </label>

          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="
              border rounded-lg px-3 py-2 text-sm
              bg-white text-gray-700
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              input-minimal
            "
          />

          <label className="text-sm font-medium text-gray-600">
            al:
          </label>

          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="
              border rounded-lg px-3 py-2 text-sm
              bg-white text-gray-700
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              input-minimal
            "
          />

          <button
            onClick={cargarResumen}
            disabled={loading || rangoInvalido}
            className="
              px-4 py-2 rounded-lg text-sm font-medium
              bg-indigo-600 text-white
              hover:bg-indigo-700 transition
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            Filtrar
          </button>

          <button
            onClick={() => exportResumenDiario(sucursales, fechaInicio, fechaFin)}
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

      {rangoInvalido && (
        <div className="text-sm text-red-500">
          La fecha inicial no puede ser posterior a la fecha final.
        </div>
      )}

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

      {/* Grupos por fecha */}
      {!loading && gruposVisibles.length > 0 && (
        <div className="space-y-8">

          {gruposVisibles.map(([fecha, items]) => (
            <div key={fecha} className="space-y-4">

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">
                  {formatFechaDisplay(fecha)}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {items.map((sucursal) => {
                  const clave = claveSeleccion(sucursal.id, sucursal.fecha)

                  return (
                    <SucursalCard
                      key={clave}
                      data={{
                        id: sucursal.id,
                        sucursal: sucursal.nombre,
                        fecha: sucursal.fecha,
                        ingresos: sucursal.ingresos,
                        gastos: sucursal.gastos,
                        corteRealizado: sucursal.corte_realizado
                      }}
                      isActive={selected === clave}
                      onSelect={() =>
                        setSelected(
                          selected === clave ? null : clave
                        )
                      }
                    />
                  )
                })}

              </div>

            </div>
          ))}

        </div>
      )}

      {/* Detail */}
      {detalleActivo && (
        <DetailSection
          sucursalId={detalleActivo.id}
          fecha={detalleActivo.fecha}
        />
      )}

    </div>
  )
}
