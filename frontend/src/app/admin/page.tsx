'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import Sidebar from './components/Sidebar'
import UserManagement from './components/UserManagement'
import InventoryManagement from '../components/InventorySelectorCard';
import ReportsManagement from './components/ReportsManagement'
import Configurations from './components/Configurations'
import RecibirLote from '../components/RecibirLote'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminDashboard() {
  const [active, setActive] = useState('usuarios')
  const router = useRouter()

  useEffect(() => {
    fetch(`${API_URL}/api/usuarios/me`, {
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error('No autenticado');
        return res.json()
      })
      .then(data => {
        if (data.user?.rol_id !== 1) {
          router.push('/login')
        }
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  return (
    <>
      <Sidebar active={active} setActive={setActive} />
      <main className="flex-1 p-8 overflow-auto lg:ml-24">
        {active === 'usuarios' && <UserManagement />}
        {active === 'inventario' && <InventoryManagement />}
        {active === 'reportes' && <ReportsManagement />}
        {active === 'configuracion' && <Configurations />}
        {active === 'lote' && <RecibirLote />}
      </main>
    </>
  )
}
