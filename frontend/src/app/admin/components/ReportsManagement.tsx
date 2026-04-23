'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import DailySummaryTab from './DailySummaryTab'

export default function ReportsManagement() {
  const [tab, setTab] = useState<'resumen' | 'detalle' | 'historico'>('resumen')

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className="bg-white rounded-xl shadow p-6 max-w-6xl input-minimal"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">

        <h2 className="text-xl font-semibold text-gray-700">
          Reportes del sistema
        </h2>

        {/* Tabs */}
        <div className="flex gap-3 border-b pb-2 flex-wrap">
          <button
            onClick={() => setTab('resumen')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === 'resumen'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Resumen diario
          </button>

          <button
            onClick={() => setTab('detalle')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === 'detalle'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Detalle
          </button>

          <button
            onClick={() => setTab('historico')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === 'historico'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* Contenido */}
      {tab === 'resumen' && <DailySummaryTab />}
      {tab === 'detalle' && (
        <div className="text-gray-500 text-sm">Próximamente detalle por sucursal...</div>
      )}
      {tab === 'historico' && (
        <div className="text-gray-500 text-sm">Próximamente histórico con filtros...</div>
      )}
    </motion.div>
  )
}