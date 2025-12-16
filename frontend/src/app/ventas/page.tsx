'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import Sidebar from './components/Sidebar'
import InventoryList from '../components/InventorySelectorCard';
import SalesForm from './components/SalesForm'
import ReportsHistory from './components/ReportsHistory'
import CommissionsCard from './components/CommissionsCard'
import RecibirLote from '../components/RecibirLote'
import CorteCaja from './components/CorteCaja'


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function DashboardPage() {
  const [active, setActive] = useState('inventario')
  const router = useRouter()

  useEffect(() => {
    fetch(`${API_URL}/api/usuarios/me`, {
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error('No autenticado')
        return res.json()
      })
      .then(data => {
        if (data.user?.rol_id !== 3) { // rol ventas
          router.push('/login');
        }
      })
      .catch(() => {
        router.push('/login');
      })
  }, [router])

  return (
    <>
      <Sidebar active={active} setActive={setActive} />
      <main className="flex-1 p-8 flex flex-col gap-6 overflow-auto lg:ml-24">
        {active === 'inventario' && <InventoryList />}
        {active === 'venta' && <SalesForm />}
        {active === 'reportes' && <ReportsHistory />}
        {active === 'comisiones' && <CommissionsCard />}
        {active === 'lote' && <RecibirLote />}
        {active === 'caja' && <CorteCaja />}
      </main>
    </>
  )
}
