'use client'

import { motion } from 'framer-motion'

type Props = {
  sucursalId: number
}

export default function DetailSection({ sucursalId }: Props) {
  // 🔴 luego esto vendrá del backend
  const ventas = [
    { id: 1, cliente: 'Juan Pérez', total: 2500, metodo: 'Efectivo' },
    { id: 2, cliente: 'María López', total: 1800, metodo: 'Transferencia' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border rounded-xl shadow p-5"
    >
      <h3 className="text-md font-semibold text-gray-700 mb-4">
        Detalle de movimientos
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">

          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2">Cliente</th>
              <th>Total</th>
              <th>Método</th>
            </tr>
          </thead>

          <tbody>
            {ventas.map((v) => (
              <tr key={v.id} className="border-b hover:bg-gray-50">
                <td className="py-2">{v.cliente}</td>
                <td className="text-green-600 font-medium">
                  ${v.total}
                </td>
                <td>{v.metodo}</td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </motion.div>
  )
}