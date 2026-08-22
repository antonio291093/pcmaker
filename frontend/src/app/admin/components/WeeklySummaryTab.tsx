'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { API_URL } from '@/utils/api'
import { toDateString } from '@/utils/fecha'
import { exportResumenDiario } from '@/utils/exportReportes'

type SucursalResumenDia = {
  id: number
  nombre: string
  fecha: string
  ingresos: number
  gastos: number
  neto: number
  corte_realizado: boolean
}

type SucursalAcumulada = {
  id: number
  nombre: string
  ingresos: number
  gastos: number
  neto: number
  diasConCorte: number
  diasTotales: number
}

type Semana = {
  label: string
  desde: string
  hasta: string
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// 🔹 Últimos 6 meses (incluye el actual), del más reciente al más antiguo
function generarOpcionesMes() {
  const opciones: { year: number; month: number; label: string }[] = []
  const hoy = new Date()

  for (let i = 0; i < 6; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    opciones.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
    })
  }

  return opciones
}

// 🔹 Semanas lunes-sábado del mes: una semana pertenece al mes donde cae el lunes
export function generarSemanasDelMes(year: number, month: number): Semana[] {
  const semanas: Semana[] = []

  const primerDia = new Date(year, month - 1, 1)
  const diaSemana = primerDia.getDay() // 0=Dom ... 6=Sáb
  const offsetLunes = diaSemana === 0 ? 1 : diaSemana === 1 ? 0 : 8 - diaSemana

  let lunes = new Date(year, month - 1, 1 + offsetLunes)

  while (lunes.getMonth() === month - 1) {
    const sabado = new Date(lunes)
    sabado.setDate(lunes.getDate() + 5)

    semanas.push({
      label: `Lun ${lunes.getDate()} → Sáb ${sabado.getDate()}`,
      desde: toDateString(lunes),
      hasta: toDateString(sabado),
    })

    lunes = new Date(lunes)
    lunes.setDate(lunes.getDate() + 7)
  }

  return semanas
}

export default function WeeklySummaryTab() {
  const opcionesMes = useMemo(() => generarOpcionesMes(), [])

  const [mesKey, setMesKey] = useState(
    () => `${opcionesMes[0].year}-${opcionesMes[0].month}`
  )

  const mesActivo = useMemo(
    () => opcionesMes.find(o => `${o.year}-${o.month}` === mesKey) ?? opcionesMes[0],
    [mesKey, opcionesMes]
  )

  const semanas = useMemo(
    () => generarSemanasDelMes(mesActivo.year, mesActivo.month),
    [mesActivo]
  )

  const [semanaIndex, setSemanaIndex] = useState(0)

  useEffect(() => {
    setSemanaIndex(0)
  }, [mesKey])

  const semanaActiva = semanas[semanaIndex] ?? null

  const [loading, setLoading] = useState(true)
  const [filas, setFilas] = useState<SucursalResumenDia[]>([])

  const cargarResumen = async (desde: string, hasta: string) => {
    try {
      setLoading(true)

      const resp = await fetch(
        `${API_URL}/api/reportes/ReportesSucursales?desde=${desde}&hasta=${hasta}`,
        { credentials: 'include' }
      )

      if (!resp.ok) {
        throw new Error('Error cargando resumen semanal')
      }

      const data = await resp.json()

      setFilas(
        data.map((s: SucursalResumenDia) => ({
          ...s,
          ingresos: Number(s.ingresos),
          gastos: Number(s.gastos),
          neto: Number(s.neto),
        }))
      )

    } catch (error) {
      console.error(error)
      setFilas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!semanaActiva) return
    cargarResumen(semanaActiva.desde, semanaActiva.hasta)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semanaActiva?.desde, semanaActiva?.hasta])

  // 🔹 Acumular filas por sucursal (el endpoint devuelve una fila por sucursal/día)
  const acumulado = useMemo(() => {
    const map = new Map<number, SucursalAcumulada>()

    for (const f of filas) {
      if (!map.has(f.id)) {
        map.set(f.id, {
          id: f.id,
          nombre: f.nombre,
          ingresos: 0,
          gastos: 0,
          neto: 0,
          diasConCorte: 0,
          diasTotales: 0,
        })
      }

      const acc = map.get(f.id)!
      acc.ingresos += f.ingresos
      acc.gastos += f.gastos
      acc.neto += f.neto
      acc.diasTotales += 1
      if (f.corte_realizado) acc.diasConCorte += 1
    }

    return Array.from(map.values())
  }, [filas])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            Resumen semanal por sucursal
          </h3>

          <p className="text-sm text-gray-500">
            Totales acumulados de lunes a sábado por sucursal.
          </p>
        </div>

        {/* Mes + Semana + Exportar */}
        <div className="flex flex-wrap items-center gap-3">

          <label className="text-sm font-medium text-gray-600">
            Mes:
          </label>

          <select
            value={mesKey}
            onChange={(e) => setMesKey(e.target.value)}
            className="
              border rounded-lg px-3 py-2 text-sm
              bg-white text-gray-700
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              input-minimal
            "
          >
            {opcionesMes.map(o => (
              <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
                {o.label}
              </option>
            ))}
          </select>

          <label className="text-sm font-medium text-gray-600">
            Semana:
          </label>

          <select
            value={semanaIndex}
            onChange={(e) => setSemanaIndex(Number(e.target.value))}
            className="
              border rounded-lg px-3 py-2 text-sm
              bg-white text-gray-700
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              input-minimal
            "
          >
            {semanas.map((s, i) => (
              <option key={s.desde} value={i}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => exportResumenDiario(
              filas,
              semanaActiva?.desde ?? '',
              semanaActiva?.hasta ?? ''
            )}
            disabled={!filas.length || loading}
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

          {[1, 2].map(i => (
            <div
              key={i}
              className="bg-gray-100 border rounded-xl p-5 h-40"
            />
          ))}

        </div>
      )}

      {/* Empty */}
      {!loading && acumulado.length === 0 && (
        <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-500">
          No hay información disponible para esta semana.
        </div>
      )}

      {/* Cards por sucursal */}
      {!loading && acumulado.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {acumulado.map((s) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-50 border rounded-xl p-5 shadow-sm input-minimal"
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-semibold text-gray-700">
                  {s.nombre}
                </h4>

                <span className="text-xs text-gray-500">
                  {semanaActiva?.label}
                </span>
              </div>

              <div className="space-y-2 text-sm">

                <div className="flex justify-between">
                  <span className="text-gray-500">Ingresos</span>
                  <span className="font-semibold text-green-600">
                    ${s.ingresos.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Gastos</span>
                  <span className="font-semibold text-red-500">
                    -${s.gastos.toLocaleString()}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-medium text-gray-600">Neto</span>
                  <span className="font-bold text-indigo-600">
                    ${s.neto.toLocaleString()}
                  </span>
                </div>

              </div>

              <div className="mt-4 text-xs text-gray-500">
                Cortes realizados: {s.diasConCorte}/{s.diasTotales} días
              </div>
            </motion.div>
          ))}

        </div>
      )}

    </div>
  )
}
