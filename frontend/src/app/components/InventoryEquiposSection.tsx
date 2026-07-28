import { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import { FaMoneyBill, FaCheck, FaTimes, FaQuestion, FaStore } from "react-icons/fa";
import EquipoTraspasoModal from "./EquiposTraspasoModal";
import { Equipo, IdNombre } from './Types';
import EquiposGrupoCard from '../tecnico/components/EquiposGrupoCard'
import EquiposGrupoModal from '../tecnico/components/EquiposGrupoModal'

import { API_URL } from '@/utils/api'
import { useUser } from '@/context/UserContext'

type GrupoEquipos = {
  nombre: string
  procesador: string
  sucursal_nombre?: string
  equipos: Equipo[]
  estadoConteos: Record<number, number>
}

const statusCatalog = [
  { id: 1, nombre: "Por revisar", icon: <FaQuestion className="text-yellow-500 text-2xl" /> },
  { id: 2, nombre: "Revisado - Por armar", icon: <FaCheck className="text-blue-500 text-2xl" /> },
  { id: 3, nombre: "Revisado - No funciona", icon: <FaTimes className="text-red-500 text-2xl" /> },
  { id: 4, nombre: "Armado", icon: <FaMoneyBill className="text-green-500 text-2xl" /> },
]

export default function InventoryEquiposSection() {
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [equipoParaTraspaso, setEquipoParaTraspaso] = useState<Equipo | null>(null);
  const [sucursales, setSucursales] = useState<IdNombre[]>([])
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<GrupoEquipos | null>(null)
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number | null>(null)

  const { user } = useUser()

  useEffect(() => {
    if (!user) return
    setSucursalSeleccionada(user.sucursal_id ?? null)
  }, [user])

  useEffect(() => {
    fetch(`${API_URL}/api/equipos/conteos`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCounts(data))
      .catch(() => setCounts({}));
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

  useEffect(() => {
    fetch(`${API_URL}/api/sucursales`, { credentials: 'include' })
      .then(r => r.json())
      .then(setSucursales)
  }, [])

  const grupos = useMemo<GrupoEquipos[]>(() => {
    const base = sucursalSeleccionada !== null
      ? equipos.filter(eq => eq.sucursal_id === sucursalSeleccionada)
      : equipos
    const map = new Map<string, GrupoEquipos>()
    for (const eq of base) {
      const key = `${eq.nombre.trim()}||${(eq.procesador ?? '').trim()}||${eq.sucursal_id ?? ''}`
      if (!map.has(key)) {
        map.set(key, {
          nombre: eq.nombre,
          procesador: eq.procesador,
          sucursal_nombre: eq.sucursal_nombre,
          equipos: [],
          estadoConteos: {},
        })
      }
      const grupo = map.get(key)!
      grupo.equipos.push(eq)
      if (eq.estado_id) {
        grupo.estadoConteos[eq.estado_id] = (grupo.estadoConteos[eq.estado_id] || 0) + 1
      }
    }
    return [...map.values()]
  }, [equipos, sucursalSeleccionada])

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
          >
            {st.icon}
            <span className="font-semibold text-md mt-2 text-gray-700">{st.nombre}</span>
            <span className="text-xs mt-1 text-gray-500">
              {counts[st.id] || 0} equipos
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <FaStore className="text-gray-400 shrink-0" />
        <select
          value={sucursalSeleccionada ?? ''}
          onChange={(e) =>
            setSucursalSeleccionada(e.target.value ? Number(e.target.value) : null)
          }
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {user?.rol_id === 1 && (
            <option value="">Todas las sucursales</option>
          )}
          {sucursales.map(s => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? (
          <span className="col-span-full text-center text-gray-500">Cargando...</span>
        ) : (
          grupos.map((grupo, idx) => (
            <EquiposGrupoCard
              key={idx}
              nombre={grupo.nombre}
              procesador={grupo.procesador}
              sucursal_nombre={grupo.sucursal_nombre}
              cantidad={grupo.equipos.length}
              estadoConteos={grupo.estadoConteos}
              onClick={() => setGrupoSeleccionado(grupo)}
            />
          ))
        )}
      </div>
      {selectedStatus && (
        <button className="mt-4 text-blue-600 underline" onClick={() => { setSelectedStatus(null); setEquipos([]); }}>
          Mostrar todos
        </button>
      )}

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

      {grupoSeleccionado && (
        <EquiposGrupoModal
          nombre={grupoSeleccionado.nombre}
          procesador={grupoSeleccionado.procesador}
          sucursal_nombre={grupoSeleccionado.sucursal_nombre}
          equipos={grupoSeleccionado.equipos}
          onClose={() => setGrupoSeleccionado(null)}
          onAbrirDetalle={(eq) => {
            setGrupoSeleccionado(null)
            setEquipoParaTraspaso({ ...eq, origen: 'tecnico' })
          }}
        />
      )}
    </div>
  );
}
