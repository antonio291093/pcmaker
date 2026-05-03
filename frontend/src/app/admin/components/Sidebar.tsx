'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FaUsers,
  FaBoxOpen,
  FaFileAlt,
  FaCog,
  FaTruck,
  FaSignOutAlt,
  FaBars,
  FaBuilding
} from 'react-icons/fa'
import { useUser } from '@/context/UserContext'
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type SidebarProps = {
  active: string;
  setActive: (a: string) => void;
};

const navItems = [
  { label: 'Usuarios', icon: <FaUsers />, path: 'usuarios' },
  { label: 'Inventario', icon: <FaBoxOpen />, path: 'inventario' },
  { label: 'Reportes', icon: <FaFileAlt />, path: 'reportes' },  
  { label: 'Configuración', icon: <FaCog />, path: 'configuracion' },
  { label: 'Recibir lote', icon: <FaTruck />, path: 'lote' },
  { label: 'Recepción directa', icon: <FaTruck />, path: 'recepcion' },  
]

export default function Sidebar({ active, setActive }: SidebarProps) {
  const [open, setOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [sucursalNombre, setSucursalNombre] = useState<string>('')

  const { logout, user, sucursalActiva, setSucursalActiva } = useUser()
  const router = useRouter()

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Obtener nombre sucursal
  useEffect(() => {
    const fetchSucursal = async () => {
      if (!sucursalActiva) return

      try {
        const res = await fetch(`${API_URL}/api/sucursales/${sucursalActiva}`, {
          credentials: 'include'
        })
        const data = await res.json()
        setSucursalNombre(data.nombre)
      } catch (err) {
        console.error(err)
      }
    }

    if (user?.rol_id === 1 && sucursalActiva) {
      fetchSucursal()
    }
  }, [sucursalActiva, user])

  const handleNavClick = async (path: string) => {
    if (path === 'logout') {
      await logout()
      router.replace('/login')
      return
    }

    setActive(path)
    setOpen(false)
  }

  // 🔥 SIN RELOAD
  const handleChangeSucursal = () => {
    setSucursalActiva(null) // 👈 esto dispara el modal automáticamente
  }

  return (
    <>
      {/* Botón hamburguesa */}
      <button
        className="lg:hidden fixed top-5 left-5 z-40 bg-indigo-600 text-white p-2 rounded-full shadow"
        onClick={() => setOpen(true)}
      >
        <FaBars size={20} />
      </button>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isDesktop ? 0 : open ? 0 : -140 }}
        transition={{ type: 'spring', stiffness: 80, delay: 0.15 }}
        className={`
          sidebar-scroll
          fixed top-0 left-0 z-30 h-full w-20 bg-white
          border-r border-gray-200 shadow-sm py-4 px-4
          flex flex-col
          overflow-y-auto
          overflow-x-hidden
          w-24
          ${open ? 'block' : 'hidden'}
          lg:flex
        `}
        style={open && !isDesktop ? { boxShadow: "0 0 0 100vmax rgba(0,0,0,0.4)" } : {}}
      >
        {/* Logo + sucursal */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src="/pcmaker.png" alt="Logo" className="h-20 w-20 rounded-full shadow" />

          {user?.rol_id === 1 && sucursalActiva && (
            <div className="text-center">
              <p className="text-[10px] text-gray-400">Sucursal</p>
              <p className="text-[11px] font-semibold text-indigo-600 leading-tight">
                {sucursalNombre || `ID: ${sucursalActiva}`}
              </p>
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 flex flex-col space-y-1 items-center">
          {navItems.map(item => (
            <motion.button
              key={item.label}
              onClick={() => handleNavClick(item.path)}
              whileHover={{ scale: 1.08 }}
              className={`flex flex-col items-center w-full py-3 rounded-xl text-xl px-2 transition-colors ${
                active === item.path
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-indigo-600'
              }`}
              title={item.label}
            >
              <div>{item.icon}</div>
              <span className="text-[11px] mt-1 font-medium">{item.label}</span>
            </motion.button>
          ))}

          {/* 🔥 Cambiar sucursal */}
          {user?.rol_id === 1 && (
            <motion.button
              onClick={handleChangeSucursal}
              whileHover={{ scale: 1.08 }}
              className="flex flex-col items-center w-full py-3 rounded-xl text-xl px-2 transition-colors text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
              title="Cambiar sucursal"
            >
              <FaBuilding />
              <span className="text-[11px] mt-1 font-medium">
                Cambiar
              </span>
            </motion.button>            
          )}

           <motion.button
            onClick={() => handleNavClick('logout')}
            whileHover={{ scale: 1.08 }}
            className="flex flex-col items-center w-full py-3 rounded-xl text-xl px-2 transition-colors text-red-400 hover:bg-red-50 hover:text-red-600"
            title="Cerrar sesión"
          >
            <FaSignOutAlt />
            <span className="text-[11px] mt-1 font-medium">
              Salir
            </span>
          </motion.button>
        </nav>

        {/* Cerrar móvil */}
        <button
          className="lg:hidden mt-8 bg-gray-200 text-gray-600 px-4 py-2 rounded"
          onClick={() => setOpen(false)}
        >
          Cerrar
        </button>
      </motion.aside>

      {/* Overlay móvil */}
      {open && !isDesktop && (
        <div
          className="fixed inset-0 bg-white bg-opacity-40 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}

