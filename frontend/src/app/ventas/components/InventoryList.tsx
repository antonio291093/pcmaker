'use client'
import { motion } from "framer-motion";

export default function InventoryCard() {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 70 }}
      className="bg-white rounded-xl shadow p-4 sm:p-6 w-full max-w-full"
    >
      <h2 className="text-lg font-semibold mb-4 text-gray-700">Inventario de equipos e insumos</h2>
      <div className="overflow-x-auto">
        <table className="min-w-[320px] w-full table-auto">
          <thead>
            <tr>
              <th className="text-left p-2 text-xs sm:text-sm font-medium text-gray-500">Nombre</th>
              <th className="text-left p-2 text-xs sm:text-sm font-medium text-gray-500">Cantidad</th>
              <th className="text-left p-2 text-xs sm:text-sm font-medium text-gray-500">Disponibilidad</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 text-xs sm:text-sm">Laptop HP 245 G7</td>
              <td className="p-2 text-xs sm:text-sm">8</td>
              <td className="p-2 text-xs sm:text-sm">Disponible</td>
            </tr>
            <tr>
              <td className="p-2 text-xs sm:text-sm">Cargador 65W</td>
              <td className="p-2 text-xs sm:text-sm">4</td>
              <td className="p-2 text-xs sm:text-sm">Bajo</td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
