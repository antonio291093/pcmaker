'use client'

import { motion } from 'framer-motion'

type Sucursal = {
  id: number
  nombre: string
  direccion?: string
}

type Props = {
  sucursales: Sucursal[]
  onSelect: (id: number) => void
}

export default function SucursalSelectorModal({ sucursales, onSelect }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-8"
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Selecciona la sucursal a administrar
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sucursales.map((sucursal) => (
            <motion.div
              key={sucursal.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(sucursal.id)}
              className="cursor-pointer border border-gray-200 rounded-xl p-5 hover:border-indigo-500 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-semibold text-gray-800">
                {sucursal.nombre}
              </h3>

              {sucursal.direccion && (
                <p className="text-sm text-gray-500 mt-1">
                  {sucursal.direccion}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
