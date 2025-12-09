import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { FaMoneyBill, FaCheck, FaTimes, FaQuestion } from "react-icons/fa";
import EquipoTraspasoModal from "./EquiposTraspasoModal";
import { Equipo } from './Types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const statusCatalog = [
  { id: 1, nombre: "Por revisar", icon: <FaQuestion className="text-yellow-500 text-2xl" /> },
  { id: 2, nombre: "Revisado - Por armar", icon: <FaCheck className="text-blue-500 text-2xl" /> },
  { id: 3, nombre: "Revisado - No funciona", icon: <FaTimes className="text-red-500 text-2xl" /> },
  { id: 4, nombre: "Armado", icon: <FaMoneyBill className="text-green-500 text-2xl" /> }
];

export default function InventoryEquiposSection() {
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [equipoParaTraspaso, setEquipoParaTraspaso] = useState<Equipo | null>(null);

  useEffect(() => {
    Promise.all(statusCatalog.map(st =>
      fetch(`${API_URL}/api/equipos/estado/${st.id}`, {
        credentials: 'include',
        headers: { "Content-Type": "application/json" }
      })
        .then(res => res.json())
        .then(data => ({ id: st.id, count: data.length }))
        .catch(() => ({ id: st.id, count: 0 }))
    )).then(results => {
      const obj: Record<number, number> = {};
      results.forEach(r => {
        obj[r.id] = r.count;
      });
      setCounts(obj);
    });
  }, []);

  useEffect(() => {
    if (selectedStatus !== null) {
      setLoading(true);
      fetch(`${API_URL}/api/equipos/estado/${selectedStatus}`, {
        credentials: 'include',
        headers: { "Content-Type": "application/json" }
      })
        .then(res => {
          if (!res.ok) throw new Error("No se pudo obtener el inventario");
          return res.json();
        })
        .then(data => {
          setEquipos(data);
          if (data.length === 0) {
            Swal.fire({
              icon: "info",
              title: "Sin equipos",
              text: "No hay equipos para el estado seleccionado.",
              timer: 2000,
              showConfirmButton: false
            });
          }
        })
        .catch(err => {
          Swal.fire({
            icon: 'error',
            title: 'Error al obtener equipos',
            text: err.message,
          });
        })
        .finally(() => setLoading(false));
    }
  }, [selectedStatus]);

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statusCatalog.map(st => (
          <button
            key={st.id}
            onClick={() => setSelectedStatus(st.id)}
            className={`flex flex-col items-center p-4 rounded-xl shadow-sm border
              ${selectedStatus === st.id ? "border-gray-300" : "border-transparent"}
              bg-white hover:bg-gray-50 transition`}
            disabled={loading}
          >
            {st.icon}
            <span className="font-semibold text-md mt-2 text-gray-700">{st.nombre}</span>
            <span className="text-xs mt-1 text-gray-500">
              {counts[st.id] || 0} equipos
            </span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? (
          <span className="col-span-full text-center text-gray-500">Cargando...</span>
        ) : (
          equipos.map(eq => (
            <div key={eq.id} className="p-4 rounded-lg bg-white shadow-sm flex flex-col items-start">
              <span className="font-semibold text-gray-800">{eq.nombre}</span>
              <span className="text-xs text-gray-500">Etiqueta: {eq.etiqueta}</span>
              <span className="text-xs text-gray-500">Procesador: {eq.procesador}</span>
              <span className="text-xs text-gray-500">RAM: {eq.memorias_ram?.join(", ")}</span>
              <span className="text-xs text-gray-500">Almacenamiento: {eq.almacenamientos?.join(", ")}</span>
              <span
                className="text-xs text-blue-500 cursor-pointer hover:underline mt-1"
                onClick={() => setEquipoParaTraspaso(eq)}
              >
                Sucursal: {eq.sucursal_nombre ?? "Sin asignar"}
              </span>
            </div>
          ))
        )}
      </div>
      {selectedStatus && (
        <button className="mt-4 text-blue-600 underline" onClick={() => { setSelectedStatus(null); setEquipos([]); }}>
          Mostrar todos
        </button>
      )}

      {/* Modal para traspaso de sucursal */}
      {equipoParaTraspaso && (
        <EquipoTraspasoModal
          equipo={equipoParaTraspaso}
          onTransfer={(nuevoEquipo:any) => {
            setEquipos((prev) =>
              prev.map((e) =>
                e.id === nuevoEquipo.id ? { ...e, ...nuevoEquipo } : e
              )
            );
            setEquipoParaTraspaso(null);
          }}
          onClose={() => setEquipoParaTraspaso(null)}
        />
      )}
    </div>
  );
}
