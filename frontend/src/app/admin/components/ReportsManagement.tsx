'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import DailySummaryTab from './DailySummaryTab'
import DeletedItemTabs from './DeletedItemsTab'

export default function ReportsManagement() {

  const [tab, setTab] = useState<
    'resumen' | 'eliminados' | 'historico'
  >('resumen')

  const tabs = [
    {
      key: 'resumen',
      label: 'Resumen diario'
    },
    {
      key: 'eliminados',
      label: 'Artículos Eliminados'
    },
    {
      key: 'historico',
      label: 'Histórico'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className="
        bg-white rounded-xl shadow
        p-4 md:p-6
        max-w-7xl
        input-minimal
      "
    >

      {/* HEADER */}
      <div className="flex flex-col gap-4 mb-6">

        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Reportes del sistema
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Consulta movimientos, ventas y trazabilidad del sistema.
          </p>
        </div>

        {/* TABS */}
        <div className="flex gap-3 border-b pb-2 flex-wrap">

          {tabs.map((t) => (

            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`
                px-4 py-2 rounded-lg
                text-sm font-medium
                transition-all duration-200
                whitespace-nowrap

                ${
                  tab === t.key
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {t.label}
            </button>

          ))}

        </div>

      </div>

      {/* CONTENIDO */}
      <AnimatePresence mode="wait">

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >

          {tab === 'resumen' && (
            <DailySummaryTab />
          )}

          {tab === 'eliminados' && (
            <DeletedItemTabs />
          )}

          {tab === 'historico' && (
            <div className="
              border rounded-xl p-10
              text-center text-gray-500
              bg-gray-50
            ">
              Próximamente historial avanzado de reportes...
            </div>
          )}

        </motion.div>

      </AnimatePresence>

    </motion.div>
  )
}