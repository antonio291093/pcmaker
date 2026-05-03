'use client'

import { motion } from 'framer-motion'
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

type Props = {
  data: {
    id: number
    sucursal: string
    fecha: string
    ingresos: number
    gastos: number
    corteRealizado: boolean
  }
  isActive: boolean
  onSelect: () => void
}

export default function SucursalCard({ data, isActive, onSelect }: Props) {
  const neto = data.ingresos - data.gastos

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        bg-gray-50 border rounded-xl p-5 shadow-sm transition input-minimal
        ${isActive ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'}
      `}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-700">
          {data.sucursal}
        </h3>

        <span className="text-xs text-gray-500">
          {data.fecha}
        </span>
      </div>

      <div className="space-y-2 text-sm">

        <div className="flex justify-between">
          <span className="text-gray-500">Ingresos</span>
          <span className="font-semibold text-green-600">
            ${data.ingresos.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Gastos</span>
          <span className="font-semibold text-red-500">
            -${data.gastos.toLocaleString()}
          </span>
        </div>

        <div className="border-t pt-2 flex justify-between">
          <span className="font-medium text-gray-600">Neto</span>
          <span className="font-bold text-indigo-600">
            ${neto.toLocaleString()}
          </span>
        </div>

      </div>

      <div className="mt-4 flex items-center justify-between">

        <div className="flex items-center gap-2 text-sm">
          {data.corteRealizado ? (
            <>
              <FaCheckCircle className="text-green-600" />
              <span className="text-green-600 font-medium">
                Corte realizado
              </span>
            </>
          ) : (
            <>
              <FaTimesCircle className="text-red-500" />
              <span className="text-red-500 font-medium">
                Corte pendiente
              </span>
            </>
          )}
        </div>

        <button
          onClick={onSelect}
          className={`
            text-xs px-3 py-1.5 rounded-md transition
            ${isActive
              ? 'bg-gray-300 text-gray-700'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }
          `}
        >
          {isActive ? 'Ocultar' : 'Ver detalle'}
        </button>

      </div>
    </motion.div>
  )
}