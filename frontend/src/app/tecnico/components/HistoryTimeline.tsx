'use client'
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface HistorialItem {
  equipo: string;
  estado: string;
  fecha: string;
  tipo: string;
}

export default function HistoryTimeline() {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 🔹 Cargar historial paginado
  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const resp = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/historial-tecnico?page=${page}&limit=5`,
          { credentials: 'include' }
        );
        if (!resp.ok) throw new Error("Error obteniendo historial");
        const data = await resp.json();        

        const parsed = data.data.map((item: any) => ({
          equipo: item.equipo,
          estado: item.tipo === "Equipo"
            ? obtenerNombreEstado(item.estado_id)
            : "Mantenimiento realizado",
          fecha: new Date(item.fecha).toISOString().split("T")[0],
          tipo: item.tipo,
        }));

        setHistorial(parsed);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error("Error cargando historial:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, [page]);

  // 🔸 Traductor de estados
  const obtenerNombreEstado = (estado_id: number) => {
    switch (estado_id) {
      case 1: return "En espera";
      case 2: return "En revisión";
      case 3: return "No Funciona";
      case 4: return "Ensamblado";
      case 5: return "Listo para venta";
      default: return "Desconocido";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-6 max-w-2xl text-center text-gray-500">
        Cargando historial...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 70, delay: 0.2 }}
      className="bg-white rounded-xl shadow p-6 max-w-2xl"
    >
      <h2 className="text-lg font-semibold mb-4 text-gray-700">Historial de equipos</h2>

      <ol className="relative border-l-2 border-indigo-200 pl-6">
        {historial.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay registros disponibles</p>
        ) : (
          historial.map((item, idx) => (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + idx * 0.07 }}
              className="mb-8"
            >
              <div className="absolute -left-4 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white"></div>
              <div className="text-md font-semibold text-gray-800">{item.equipo}</div>
              <div className="text-xs text-gray-500">{item.estado}</div>
              <div className="text-xs text-gray-400">{item.fecha}</div>
            </motion.li>
          ))
        )}
      </ol>

      {/* 🔹 Controles de paginación */}
      <div className="flex justify-between items-center mt-4">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className={`text-sm font-medium ${
            page <= 1 ? "text-gray-300 cursor-not-allowed" : "text-indigo-600 hover:text-indigo-800"
          }`}
        >
          ← Anterior
        </button>

        <span className="text-gray-500 text-sm">
          Página {page} de {totalPages}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className={`text-sm font-medium ${
            page >= totalPages ? "text-gray-300 cursor-not-allowed" : "text-indigo-600 hover:text-indigo-800"
          }`}
        >
          Siguiente →
        </button>
      </div>
    </motion.div>
  );
}
