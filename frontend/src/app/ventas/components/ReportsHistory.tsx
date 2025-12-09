'use client'
import { motion } from 'framer-motion'

const reportData = [
  { cliente: 'Juan Pérez', producto: 'Laptop HP 245 G7', fecha: '2025-09-12' },
  { cliente: 'María López', producto: 'Cargador 65W', fecha: '2025-09-13' }
]

export default function ReportsHistory() {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className='bg-white rounded-xl shadow p-6 max-w-4xl'
    >
      <h2 className='text-lg font-semibold mb-4 text-gray-700'>Reportes e historial de clientes</h2>
      <table className='w-full table-auto'>
        <thead>
          <tr>
            <th className='text-left p-2 text-xs font-medium text-gray-500'>Cliente</th>
            <th className='text-left p-2 text-xs font-medium text-gray-500'>Producto</th>
            <th className='text-left p-2 text-xs font-medium text-gray-500'>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {reportData.map((item, i) => (
            <tr key={i}>
              <td className='p-2'>{item.cliente}</td>
              <td className='p-2'>{item.producto}</td>
              <td className='p-2'>{item.fecha}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  )
}
