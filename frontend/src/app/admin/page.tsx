'use client'

import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import UserManagement from './components/UserManagement'
import InventoryManagement from '../components/InventorySelectorCard'
import ReportsManagement from './components/ReportsManagement'
import Configurations from './components/Configurations'
import RecibirLote from '../components/RecibirLote'
import RecepcionDirecta from '../components/RecepcionDirecta'
import { useUser } from '@/context/UserContext'
import SucursalSelectorModal from './components/SucursalSelectorModal'

export default function AdminDashboard() {
  const [active, setActive] = useState('usuarios')
  const [sucursales, setSucursales] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)

  const {
    user,
    loading,
    sucursalActiva,
    setSucursalActiva
  } = useUser()

  // 🔥 Detectar si admin necesita seleccionar sucursal
  useEffect(() => {
    if (loading || !user) return

    if (user.rol_id === 1 && !sucursalActiva) {
      fetchSucursales()
    }
  }, [user, loading, sucursalActiva])

  // 📡 Obtener sucursales
  const fetchSucursales = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sucursales`,
        { credentials: 'include' }
      )

      const data = await res.json()

      setSucursales(data)
      setShowModal(true)
    } catch (error) {
      console.error('Error cargando sucursales:', error)
    }
  }

  // ✅ Selección de sucursal
  const handleSelectSucursal = (id: number) => {
    setSucursalActiva(id)
    setShowModal(false)
  }

  // ⏳ Loading
  if (loading) {
    return <p className="p-8">Cargando...</p>
  }

  // 🔐 Seguridad
  if (!user) {
    return null
  }

  // 🔥 bandera para bloquear UI (PERO NO render)
  const bloquearUI = user.rol_id === 1 && !sucursalActiva

  return (
    <>
      {/* 🔥 Modal SIEMPRE disponible */}
      {showModal && (
        <SucursalSelectorModal
          sucursales={sucursales}
          onSelect={handleSelectSucursal}
        />
      )}

      {/* Sidebar */}
      <Sidebar active={active} setActive={setActive} />

      {/* Contenido */}
      <main
        className={`flex-1 p-8 overflow-auto lg:ml-24 transition-all ${
          bloquearUI ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        {!bloquearUI && (
          <>
            {active === 'usuarios' && <UserManagement />}
            {active === 'inventario' && <InventoryManagement />}
            {active === 'reportes' && <ReportsManagement />}
            {active === 'configuracion' && <Configurations />}
            {active === 'lote' && <RecibirLote />}
            {active === 'recepcion' && <RecepcionDirecta />}
          </>
        )}
      </main>
    </>
  )
}

