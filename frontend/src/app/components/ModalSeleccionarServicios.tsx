'use client';
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { FaTools, FaUserCog } from "react-icons/fa";

interface ServicioPendiente {
  id: number;
  tipo_mantenimiento: string;
  detalle: string;
  tecnico_nombre: string;
  costo: number;
  fecha_mantenimiento: string;
}

interface ModalSeleccionarServiciosProps {
  onClose: () => void;
  onSeleccionar: (servicios: ServicioPendiente[]) => void;
}

export default function ModalSeleccionarServicios({
  onClose,
  onSeleccionar,
}: ModalSeleccionarServiciosProps) {
  const [servicios, setServicios] = useState<ServicioPendiente[]>([]);
  const [seleccionados, setSeleccionados] = useState<ServicioPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [sucursalId, setSucursalId] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    useEffect(() => {
        const obtenerSucursal = async () => {
        try {
            const res = await fetch(`${API_URL}/api/usuarios/me`, { credentials: 'include' });
            if (!res.ok) throw new Error("No autenticado");
            const data = await res.json();
            setSucursalId(data.user.sucursal_id);
        } catch (err) {
            console.log("Error obteniendo sucursal:", err);
        }
        };
        obtenerSucursal();
    }, []);

  useEffect(() => {
    if (!sucursalId) return;

    const cargarServicios = async () => {
        try {
        const res = await fetch(
            `${API_URL}/api/mantenimientos/servicios-pendientes?sucursal_id=${sucursalId}`,
            { credentials: 'include' }
        );

        if (!res.ok) throw new Error("Error servicios");

        const data = await res.json();
        setServicios(data);
        } catch (err) {
        console.error(err);
        Swal.fire("Error", "No se pudieron cargar los servicios", "error");
        } finally {
        setLoading(false);
        }
    };

    cargarServicios();
    }, [sucursalId]);

  const toggleSeleccion = (servicio: ServicioPendiente) => {
    setSeleccionados(prev => {
      const existe = prev.find(s => s.id === servicio.id);
      if (existe) return prev.filter(s => s.id !== servicio.id);
      return [...prev, servicio];
    });
  };

  const total = seleccionados.reduce(
    (acc, s) => acc + Number(s.costo || 0),
    0
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          Cargando servicios...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-6 rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col"
      >
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Seleccionar servicios pendientes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2">
          {servicios.map(servicio => {
            const seleccionado = seleccionados.find(s => s.id === servicio.id);

            return (
              <motion.div
                key={servicio.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => toggleSeleccion(servicio)}
                className={`cursor-pointer p-4 rounded-lg border shadow-sm ${
                  seleccionado
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FaTools className="text-indigo-600" />
                  <span className="font-semibold text-gray-800">
                    {servicio.tipo_mantenimiento}
                  </span>
                </div>

                <p className="text-sm text-gray-600">{servicio.detalle}</p>

                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="flex items-center gap-1 text-gray-500">
                    <FaUserCog /> {servicio.tecnico_nombre}
                  </span>
                  <span className="font-bold text-gray-800">
                    ${Number(servicio.costo).toFixed(2)} MXN
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* BOTONES */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Cancelar
          </button>

          <button
            disabled={seleccionados.length === 0}
            onClick={() => onSeleccionar(seleccionados)}
            className={`px-4 py-2 rounded-lg text-white ${
              seleccionados.length
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Seleccionar ({seleccionados.length}) – Total $
            {total.toFixed(2)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
