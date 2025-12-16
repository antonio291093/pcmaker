'use client'
import { motion } from 'framer-motion'

const reportSamples = [
  { id: 1, title: 'Reporte Ventas Septiembre', date: '2025-09-15' },
  { id: 2, title: 'Reporte Mantenimientos Septiembre', date: '2025-09-15' },
  { id: 3, title: 'Comisiones Q3 2025', date: '2025-09-15' }
]

export default function ReportsManagement() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className="bg-white rounded-xl shadow p-6 max-w-5xl"
    >
      <h2 className="text-xl font-semibold mb-6 text-gray-700">Reportes del sistema</h2>
      <ul>
        {reportSamples.map(report => (
          <li key={report.id} className="mb-3">
            <a
              href="#"
              className="text-indigo-600 hover:underline text-sm font-medium"
              onClick={e => {
                e.preventDefault()
                alert(`Descargando ${report.title}`)
              }}
            >
              {report.title} - {report.date}
            </a>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
