'use client'

import SucursalCard from './SucursalCard'

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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 input-minimal">
      {data.map((sucursal) => (
        <SucursalCard key={sucursal.id} data={sucursal} />
      ))}
    </div>
  )
}