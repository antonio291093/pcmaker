'use client'

import { useState } from 'react'
import Sidebar from './components/Sidebar'
import InventoryList from '../components/InventorySelectorCard'
import SalesForm from './components/SalesForm'
import ReportsHistory from './components/ReportsHistory'
import CommissionsCard from './components/CommissionsCard'
import RecibirLote from '../components/RecibirLote'
import RecepcionDirecta from '../components/RecepcionDirecta'
import CorteCaja from './components/CorteCaja'
import { useUser } from '@/context/UserContext'

export default function DashboardPage() {
  const [active, setActive] = useState('inventario')
  const { user, loading } = useUser()

  // Mientras se valida sesión
  if (loading) {
    return <p className="p-8">Cargando...</p>
  }

  // Extra safety (middleware ya protegió)
  if (!user) {
    return null
  }

  return (
    <>
      <Sidebar active={active} setActive={setActive} />
      <main className="flex-1 p-8 flex flex-col gap-6 overflow-auto lg:ml-24">
        {active === 'inventario' && <InventoryList />}
        {active === 'venta' && <SalesForm />}
        {active === 'reportes' && <ReportsHistory />}
        {active === 'comisiones' && <CommissionsCard />}
        {active === 'lote' && <RecibirLote />}
        {active === 'recepcion' && <RecepcionDirecta />}
        {active === 'caja' && <CorteCaja />}
      </main>
    </>
  )
}
