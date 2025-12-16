'use client'
import { motion } from "framer-motion";

export default function CommissionCard() {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 70, delay: 0.2 }}
      className="bg-white rounded-xl shadow p-4 sm:p-6 w-full max-w-full"
    >
      <h2 className="text-lg font-semibold mb-4 text-gray-700">Comisiones acumuladas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-indigo-50 rounded-lg text-center">
          <span className="text-sm text-gray-500">Total acumulado</span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">$3,250.00</div>
        </div>
        <div className="p-4 bg-indigo-50 rounded-lg text-center">
          <span className="text-sm text-gray-500">Equipos entregados</span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">14</div>
        </div>
      </div>
      <motion.div
        className="h-32 flex items-center justify-center mt-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="30" stroke="#6366f1" strokeWidth="10" fill="none" opacity={0.2}/>
          <circle cx="40" cy="40" r="30" stroke="#6366f1" strokeWidth="10" fill="none"
            strokeDasharray="188"
            strokeDashoffset="94"
            style={{transition: "stroke-dashoffset .8s cubic-bezier(.4,1,.2,1)"}}
          />
        </svg>
      </motion.div>
      <div className="text-center text-xs mt-2 text-gray-400">Gráfica de comisiones (ejemplo)</div>
    </motion.div>
  );
}
