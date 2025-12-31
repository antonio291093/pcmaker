import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { FaMoneyBill, FaCheck, FaTimes, FaQuestion } from "react-icons/fa";
import EquipoTraspasoModal from "./EquiposTraspasoModal";
import { Equipo } from './Types';
import ModalSeleccionEquiposPedido from './CrearPedidoModal'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const statusCatalog = [
  { id: 1, nombre: "Por revisar", icon: <FaQuestion className="text-yellow-500 text-2xl" /> },
  { id: 2, nombre: "Revisado - Por armar", icon: <FaCheck className="text-blue-500 text-2xl" /> },
  { id: 3, nombre: "Revisado - No funciona", icon: <FaTimes className="text-red-500 text-2xl" /> },
  { id: 4, nombre: "Armado", icon: <FaMoneyBill className="text-green-500 text-2xl" /> },
  { id: 99, nombre: "Generar Pedido", icon: <FaMoneyBill className="text-indigo-600 text-2xl" /> }
]

export default function InventoryEquiposSection() {
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [equipoParaTraspaso, setEquipoParaTraspaso] = useState<Equipo | null>(null);
  const [modoGenerarPedido, setModoGenerarPedido] = useState(false)
  const [detallePedido, setDetallePedido] = useState('')
  const [equiposPedido, setEquiposPedido] = useState<Equipo[]>([])
  const [modalEquiposOpen, setModalEquiposOpen] = useState(false)
  const [sucursalDestino, setSucursalDestino] = useState<number | null>(null)
  const [tecnicoId, setTecnicoId] = useState<number | null>(null)
  const [sucursales, setSucursales] = useState<any[]>([])
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [busquedaPedido, setBusquedaPedido] = useState('')

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

  useEffect(() => {
    fetch(`${API_URL}/api/sucursales`, { credentials: 'include' })
      .then(r => r.json())
      .then(setSucursales)

    fetch(`${API_URL}/api/usuarios?rol=2`, { credentials: 'include' })
      .then(r => r.json())
      .then(setTecnicos)
  }, [])


  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statusCatalog.map(st => (
          <button
            key={st.id}
            onClick={() => {
              if (st.id === 99) {
                setModoGenerarPedido(true)
                setSelectedStatus(null)
                setEquipos([])
              } else {
                setModoGenerarPedido(false)
                setSelectedStatus(st.id)
              }
            }}
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
      {modoGenerarPedido && (
      <div className="flex justify-center mt-6">
    <div className="w-full max-w-xl bg-white p-6 rounded-xl shadow-md">

        {/* 🔍 Buscador */}
        <input
          type="text"
          placeholder="Buscar equipo (lote, serie, etiqueta...)"
          value={busquedaPedido}
          onChange={(e) => setBusquedaPedido(e.target.value)}
          className="w-full mb-4 border rounded-lg px-4 py-2"
        />

        {/* 📝 Detalle */}
        <textarea
          value={detallePedido}
          onChange={(e) => setDetallePedido(e.target.value)}
          placeholder="Detalle del pedido (obligatorio)"
          className="w-full border rounded-lg px-4 py-3 mb-4"
          rows={4}
        />

        {/* 🖥️ Equipos */}
        <div className="mb-4">
          <button
            onClick={() => setModalEquiposOpen(true)}
            className="text-indigo-600 underline"
          >
            + Seleccionar equipos
          </button>

          {equiposPedido.length > 0 && (
            <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
              {equiposPedido.map(eq => (
                <li key={eq.id}>{eq.nombre} - {eq.etiqueta}</li>
              ))}
            </ul>
          )}
        </div>

        {/* 🏬 Sucursal */}
        <select
          value={sucursalDestino ?? ''}
          onChange={(e) => setSucursalDestino(Number(e.target.value))}
          className="w-full mb-3 border rounded-lg px-3 py-2"
        >
          <option value="">Sucursal destino</option>
          {sucursales.map(s => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>

        {/* 🧑‍🔧 Técnico */}
        <select
          value={tecnicoId ?? ''}
          onChange={(e) => setTecnicoId(Number(e.target.value))}
          className="w-full mb-4 border rounded-lg px-3 py-2"
        >
          <option value="">Técnico responsable</option>
          {tecnicos.map(t => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>

        {/* 💾 Generar */}
        <button
          onClick={() => {
            if (!detallePedido.trim()) {
              Swal.fire('Error', 'El detalle del pedido es obligatorio', 'warning')
              return
            }
            if (equiposPedido.length === 0) {
              Swal.fire('Error', 'Debes agregar al menos un equipo', 'warning')
              return
            }
            if (!sucursalDestino || !tecnicoId) {
              Swal.fire('Error', 'Selecciona sucursal y técnico', 'warning')
              return
            }

            Swal.fire('Listo', 'Pedido validado (backend siguiente paso)', 'success')
          }}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700"
        >
          Generar pedido
        </button>
       </div>
  </div>
    )}

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

      <ModalSeleccionEquiposPedido
        open={modalEquiposOpen}
        onClose={() => setModalEquiposOpen(false)}
        equiposSeleccionados={equiposPedido}
        onConfirm={(seleccionados) => setEquiposPedido(seleccionados)}
      />

    </div>
  );
}
