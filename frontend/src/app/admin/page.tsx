'use client'

import { useState } from 'react'
import Sidebar from './components/Sidebar'
import UserManagement from './components/UserManagement'
import InventoryManagement from '../components/InventorySelectorCard'
import ReportsManagement from './components/ReportsManagement'
import Configurations from './components/Configurations'
import RecibirLote from '../components/RecibirLote'
import RecepcionDirecta from '../components/RecepcionDirecta'
import { useUser } from '@/context/UserContext'

export default function AdminDashboard() {
  const [active, setActive] = useState('usuarios')
  const { user, loading } = useUser()

  // Mientras se valida sesión / usuario
  if (loading) {
    return <p className="p-8">Cargando...</p>
  }

  // Seguridad extra (normalmente el middleware ya bloqueó)
  if (!user) {
    return null
  }

  return (
    <>
      <Sidebar active={active} setActive={setActive} />
      <main className="flex-1 p-8 overflow-auto lg:ml-24">
        {active === 'usuarios' && <UserManagement />}
        {active === 'inventario' && <InventoryManagement />}
        {active === 'reportes' && <ReportsManagement />}
        {active === 'configuracion' && <Configurations />}
        {active === 'lote' && <RecibirLote />}
        {active === 'recepcion' && <RecepcionDirecta />}
      </main>
    </>
  )
}
