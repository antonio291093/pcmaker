'use client'
import { useState, useEffect } from 'react'
import { motion } from "framer-motion";
import { FaBoxOpen, FaTools, FaHistory, FaFileAlt, FaDollarSign, FaCog, FaTruck, FaSignOutAlt, FaBars } from "react-icons/fa";
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const navItems = [
  { label: "Inventario", icon: <FaBoxOpen />, path: "inventario" },
  { label: "Mantenimientos", icon: <FaTools />, path: "mantenimientos" },
  { label: "Historial", icon: <FaHistory />, path: "historial" },
  { label: "Revisar Equipos", icon: <FaFileAlt />, path: "especificaciones" },
  { label: "Comisiones", icon: <FaDollarSign />, path: "comisiones" },
  { label: 'Recibir lote', icon: <FaTruck />, path: 'lote' },
  { label: 'Cerrar sesión', icon: <FaSignOutAlt />, path: 'logout' }
];

export default function Sidebar({ active, setActive }: { active: string; setActive: (a: string) => void }) {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { logout } = useUser()
  const router = useRouter();

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const handleNavClick = async (path: string) => {
    if (path === 'logout') {
      await logout()                 // 🔥 limpia cookie + estado
      router.replace('/login')       // 👈 importante
      return
    }

    setActive(path)
    setOpen(false) // cerrar sidebar en móvil
  }

  return (
    <>
      {/* Botón hamburguesa móvil */}
      {!isDesktop && (
        <button
          className="fixed top-5 left-5 z-40 bg-indigo-600 text-white p-2 rounded-full shadow lg:hidden"
          onClick={() => setOpen(true)}
        >
          <FaBars size={20} />
        </button>
      )}

      <motion.aside
        initial={false}
        animate={{ x: isDesktop ? 0 : open ? 0 : -140 }}
        transition={{ type: "spring", stiffness: 80, delay: 0.15 }}
        className={`
          fixed top-0 left-0 z-30 h-full bg-white
          border-r border-gray-200 shadow-sm py-4 px-4
          flex flex-col
          overflow-y-hidden
          overflow-x-hidden
          w-25
          ${open ? 'block' : 'hidden'} lg:flex
        `}
        style={open && !isDesktop ? { boxShadow: "0 0 0 100vmax rgba(0,0,0,0.4)" } : {}}
      >
        <div className="mb-8 flex justify-center">
          <img src="/pcmaker.png" alt="Logo" className="h-20 w-20 rounded-full shadow" />
        </div>
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
        </nav>

        {/* Botón cerrar móvil */}
        {!isDesktop && (
          <button
            className="mt-8 bg-gray-200 text-gray-600 px-4 py-2 rounded lg:hidden"
            onClick={() => setOpen(false)}
          >
            Cerrar
          </button>
        )}
      </motion.aside>

      {/* Overlay móvil */}
      {open && !isDesktop && (
        <div
          className="fixed inset-0 bg-white bg-opacity-40 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
