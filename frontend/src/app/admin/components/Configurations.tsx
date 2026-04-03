'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import { FaPlus, FaTrash, FaSave, FaSync } from 'react-icons/fa';
import ConfiguracionPagosAdmin from '../components/ConfiguracionPagosAdmin';

type Config = {
  id: number;
  nombre: string;
  valor: string;
  descripcion?: string;
};

export default function Configurations() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'general' | 'pagos'>('general');  
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // 🔹 Cargar configuraciones desde el backend
  const cargarConfiguraciones = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${API_URL}/api/configuraciones`, {
        credentials: 'include',
      });
      if (!resp.ok) throw new Error('Error al obtener configuraciones');
      const data = await resp.json();
      setConfigs(data);
    } catch (err) {
      console.error('Error cargando configuraciones:', err);
      Swal.fire('Error', 'No se pudieron cargar las configuraciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  // 🔸 Actualizar una configuración existente
  const actualizarConfig = async (config: Config) => {
    try {
      const resp = await fetch(`${API_URL}/api/configuraciones/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nombre: config.nombre,
          valor: config.valor,
          descripcion: config.descripcion,
        }),
      });

      if (!resp.ok) throw new Error('Error al actualizar');
      const updated = await resp.json();

      setConfigs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      Swal.fire('Guardado', 'Configuración actualizada correctamente', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo actualizar la configuración', 'error');
    }
  };

  // 🔹 Agregar nueva configuración
  const agregarConfig = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Nueva configuración',
      html: `
        <input id="nombre" class="swal2-input" placeholder="Nombre (ej. comision_armado)">
        <input id="valor" class="swal2-input" placeholder="Valor (ej. 3 o 20)">
        <input id="descripcion" class="swal2-input" placeholder="Descripción (opcional)">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      preConfirm: () => {
        const nombre = (document.getElementById('nombre') as HTMLInputElement).value;
        const valor = (document.getElementById('valor') as HTMLInputElement).value;
        const descripcion = (document.getElementById('descripcion') as HTMLInputElement).value;
        if (!nombre || !valor) {
          Swal.showValidationMessage('Nombre y valor son requeridos');
          return null;
        }
        return { nombre, valor, descripcion };
      },
    });

    if (!formValues) return;

    try {
      const resp = await fetch(`${API_URL}/api/configuraciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formValues),
      });

      if (!resp.ok) throw new Error('Error al crear');
      const nueva = await resp.json();

      setConfigs((prev) => [...prev, nueva]);
      Swal.fire('Agregado', 'Configuración creada correctamente', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo crear la configuración', 'error');
    }
  };

  // 🔸 Eliminar configuración
  const eliminarConfig = async (id: number) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar configuración?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!confirm.isConfirmed) return;

    try {
      const resp = await fetch(`${API_URL}/api/configuraciones/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!resp.ok) throw new Error('Error al eliminar');
      setConfigs((prev) => prev.filter((c) => c.id !== id));
      Swal.fire('Eliminado', 'Configuración eliminada correctamente', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo eliminar la configuración', 'error');
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500 py-6">Cargando configuraciones...</div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className="bg-white rounded-xl shadow p-6 max-w-4xl"
    >
      <div className="flex flex-col gap-4 mb-6">

        {/* Título */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-700">
            Configuración del sistema
          </h2>          
        </div>

        {/* Tabs */}
        <div className="flex gap-3 border-b pb-2">
          <button
            onClick={() => setTab('general')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === 'general'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Configuración general
          </button>

          <button
            onClick={() => setTab('pagos')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === 'pagos'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Cuentas bancarias
          </button>
        </div>

      </div>

      {tab === 'general' && (
        <ul className="space-y-4">
          {configs.map((c) => (
            <li
              key={c.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-gray-100 pb-3"
            >
              <label className="sm:w-64 font-medium text-gray-700">
                {c.nombre}
              </label>

              <input
                type="text"
                value={c.valor}
                onChange={(e) =>
                  setConfigs((prev) =>
                    prev.map((conf) =>
                      conf.id === c.id ? { ...conf, valor: e.target.value } : conf
                    )
                  )
                }
                className="border rounded-md p-2 flex-1 text-gray-600 input-minimal"
              />

              <div className="flex gap-3 justify-end sm:justify-normal">
                <button
                  onClick={() => actualizarConfig(c)}
                  className="text-green-600 hover:text-green-800"
                >
                  <FaSave />
                </button>

                <button
                  onClick={() => eliminarConfig(c.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'general' && (
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={agregarConfig}
                className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg shadow hover:bg-indigo-700"
              >
                <FaPlus /> Agregar
              </button>

              <button
                onClick={cargarConfiguraciones}
                className="flex items-center gap-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg shadow hover:bg-gray-300"
              >
                <FaSync /> Recargar
              </button>
            </div>
      )}

      {tab === 'pagos' && (
        <ConfiguracionPagosAdmin />
      )}
    </motion.div>
  );
}
