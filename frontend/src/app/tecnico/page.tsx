'use client'

import { useState } from 'react'
import Sidebar from './components/Sidebar'
import InventoryCard from '../components/InventorySelectorCard'
import MaintenanceForm from './components/MaintenanceForm'
import HistoryTimeline from './components/HistoryTimeline'
import SpecsCard from './components/SpecsCard'
import CommissionCard from './components/CommissionCard'
import RecibirLote from '../components/RecibirLote'
import RecepcionDirecta from '../components/RecepcionDirecta'
import { useUser } from '@/context/UserContext'

export default function DashboardPage() {
  const [active, setActive] = useState('inventario')
  const { user, loading } = useUser()

  // Mientras se obtiene el usuario
  if (loading) {
    return <p className="p-8">Cargando...</p>
  }

  // Extra safety (normalmente no se ejecuta si el middleware está bien)
  if (!user) {
    return null
  }

  return (
    <>
      <Sidebar active={active} setActive={setActive} />
      <main className="flex-1 p-8 flex flex-col gap-6 overflow-auto lg:ml-24">
        {active === 'inventario' && <InventoryCard />}
        {active === 'mantenimientos' && <MaintenanceForm />}
        {active === 'historial' && <HistoryTimeline />}
        {active === 'especificaciones' && <SpecsCard />}
        {active === 'comisiones' && <CommissionCard />}
        {active === 'lote' && <RecibirLote />}
        {active === 'recepcion' && <RecepcionDirecta />}
      </main>
    </>
  )
}
