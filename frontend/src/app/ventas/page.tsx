'use client'

import { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import InventoryList from '../components/InventorySelectorCard'
import SalesForm from './components/SalesForm'
import ReportsHistory from './components/ReportsHistory'
import ComisionesCard from '@/app/components/ComisionesCard'
import RecepcionDirecta from '../components/RecepcionDirecta'
import CorteCaja from './components/CorteCaja'
import { useUser } from '@/context/UserContext'
import { API_URL } from '@/utils/api'

export default function DashboardPage() {
  const [active, setActive] = useState('inventario')
  const [fechaCortePendiente, setFechaCortePendiente] = useState<string | null>(null)
  const prevActiveRef = useRef<string>('inventario')
  const { user, loading } = useUser()

  const verificarCortePendiente = async (sucursal_id: number) => {
    try {
      const resp = await fetch(
        `${API_URL}/api/caja/corte-pendiente?sucursal_id=${sucursal_id}`,
        { credentials: 'include' }
      )
      if (!resp.ok) return
      const data = await resp.json()
      if (data.requiere_corte && data.fecha_pendiente) {
        setFechaCortePendiente(String(data.fecha_pendiente).split('T')[0])
      } else {
        setFechaCortePendiente(null)
      }
    } catch (err) {
      console.error('Error verificando corte pendiente:', err)
    }
  }

  useEffect(() => {
    if (user) verificarCortePendiente(user.sucursal_id)
  }, [user])

  useEffect(() => {
    if (prevActiveRef.current === 'caja' && active !== 'caja' && user) {
      verificarCortePendiente(user.sucursal_id)
    }
    prevActiveRef.current = active
  }, [active])

  const formatFecha = (fechaISO: string) => {
    const [year, month, day] = fechaISO.split('-')
    return `${day}/${month}/${year}`
  }

  if (loading) return <p className="p-8">Cargando...</p>
  if (!user) return null

  return (
    <>
      <Sidebar active={active} setActive={setActive} />
      {fechaCortePendiente && (
        <div className="fixed bottom-6 right-6 z-50 group flex flex-col items-end gap-2">
          <div className="hidden group-hover:flex flex-col gap-3 bg-white border border-amber-300 rounded-2xl shadow-xl p-4 w-72 mb-1">
            <p className="text-sm text-amber-800 font-medium leading-snug">
              Tienes un corte de caja pendiente del{' '}
              <span className="font-bold">{formatFecha(fechaCortePendiente)}</span>.
              Realízalo antes de continuar.
            </p>
            <button
              onClick={() => setActive('caja')}
              className="text-sm font-semibold bg-amber-400 hover:bg-amber-500 text-amber-900 px-3 py-2 rounded-xl transition-colors"
            >
              Ir a Corte de Caja
            </button>
          </div>
          <button
            onClick={() => setActive('caja')}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-amber-900 font-semibold px-4 py-3 rounded-full shadow-lg transition-colors animate-bounce group-hover:animate-none"
          >
            <span className="text-base">⚠️</span>
            <span className="text-sm whitespace-nowrap">
              Corte pendiente · {formatFecha(fechaCortePendiente)}
            </span>
          </button>
        </div>
      )}
      <main className="flex-1 p-8 flex flex-col gap-6 overflow-auto lg:ml-24">
        {active === 'inventario' && <InventoryList />}
        {active === 'venta' && <SalesForm />}
        {active === 'reportes' && <ReportsHistory />}
        {active === 'comisiones' && <ComisionesCard />}
        {active === 'recepcion' && <RecepcionDirecta />}
        {active === 'caja' && <CorteCaja />}
      </main>
    </>
  )
}
