'use client'

import { useState } from 'react'
import SucursalCard from './SucursalCard'
import DetailSection from './DetailSection'

const data = [
  {
    id: 1,
    sucursal: 'Saltillo',
    fecha: '2026-04-21',
    ingresos: 12500,
    gastos: 2300,
    corteRealizado: true
  },
  {
    id: 2,
    sucursal: 'Monterrey',
    fecha: '2026-04-21',
    ingresos: 9800,
    gastos: 1500,
    corteRealizado: false
  }
]

export default function DailySummaryTab() {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div className="space-y-6">

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {data.map((sucursal) => (
          <SucursalCard
            key={sucursal.id}
            data={sucursal}
            isActive={selected === sucursal.id}
            onSelect={() =>
              setSelected(selected === sucursal.id ? null : sucursal.id)
            }
          />
        ))}
      </div>

      {/* Detalle */}
      {selected && (
        <DetailSection sucursalId={selected} />
      )}
    </div>
  )
}