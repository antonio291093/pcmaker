import { useState } from "react";
import { motion } from "framer-motion";
import { FaMoneyBill, FaCheck, FaTimes, FaQuestion } from "react-icons/fa";

const statusCatalog = [
  { id: 1, nombre: "Por revisar", icon: <FaQuestion className="text-yellow-500 text-2xl" /> },
  { id: 2, nombre: "Revisado - Por armar", icon: <FaCheck className="text-blue-500 text-2xl" /> },
  { id: 3, nombre: "Revisado - No funciona", icon: <FaTimes className="text-red-500 text-2xl" /> },
  { id: 4, nombre: "Armado", icon: <FaMoneyBill className="text-green-500 text-2xl" /> }
];

const equipos = [
  { id: 1001, name: "Laptop HP G7", status_id: 1 },
  { id: 1002, name: "Desktop Optiplex", status_id: 4 },
  { id: 1003, name: "Monitor Samsung", status_id: 3 },
];

export default function InventoryCards() {
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);
  const filtered = selectedStatus ? equipos.filter(eq => eq.status_id === selectedStatus) : equipos;
  
  return (
    <motion.div className="w-full max-w-5xl mx-auto">
      {/* Tarjetas de estado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statusCatalog.map(st => (
          <button
            key={st.id}
            onClick={() => setSelectedStatus(st.id)}
            className={`flex flex-col items-center p-4 rounded-xl shadow-sm border
              ${selectedStatus === st.id ? "border-gray-300" : "border-transparent"}
              bg-white hover:bg-gray-50 transition`}
          >
            {st.icon}
            <span className="font-semibold text-md mt-2 text-gray-700">{st.nombre}</span>
            <span className="text-xs mt-1 text-gray-500">
              {equipos.filter(eq => eq.status_id === st.id).length} equipos
            </span>
          </button>
        ))}
      </div>
      {/* Tarjetas filtradas de equipos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map(eq => (
          <div key={eq.id} className="p-4 rounded-lg bg-white shadow-sm flex flex-col items-start">
            <span className="font-semibold text-gray-800">{eq.name}</span>
          </div>
        ))}
      </div>
      {selectedStatus && (
        <button className="mt-4 text-blue-600 underline" onClick={() => setSelectedStatus(null)}>
          Mostrar todos
        </button>
      )}
    </motion.div>
  );
}
