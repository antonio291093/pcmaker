'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import { FaMemory, FaHdd, FaPlus, FaEdit, FaTrash, FaStore } from 'react-icons/fa';

import { useUser } from '@/context/UserContext'
import { API_URL } from '@/utils/api'

interface ComponenteInventario {
  id: number;
  tipo: string;
  memoria_ram_id: number | null;
  almacenamiento_id: number | null;
  descripcion: string;
  cantidad: number;
  precio: string | number | null;
  estado: string;
  sucursal_id: number;
  sucursal_nombre: string | null;
}

interface OpcionCatalogo {
  id: number;
  descripcion: string;
  tipo_modulo?: string;
}

interface NuevoComponente {
  tipo: 'ram' | 'almacenamiento';
  catalogoId: number;
  cantidad: number;
  precio: number;
  estado: string;
}

export default function InventoryComponentsSection() {
  const { user, loading: userLoading, sucursalActiva } = useUser();
  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number | null>(null);
  const [componentes, setComponentes] = useState<ComponenteInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [soloDisponibles, setSoloDisponibles] = useState(true);

  useEffect(() => {
    if (userLoading || !user) return;
    setSucursalSeleccionada(sucursalActiva || user.sucursal_id);
  }, [user, userLoading, sucursalActiva]);

  useEffect(() => {
    fetch(`${API_URL}/api/sucursales`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setSucursales(data))
      .catch(() => setSucursales([]));
  }, []);

  const cargarComponentes = useCallback(async () => {
    if (!sucursalSeleccionada) return;
    setLoading(true);
    try {
      const resp = await fetch(
        `${API_URL}/api/inventario/componentes?sucursal_id=${sucursalSeleccionada}`,
        { credentials: 'include' }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Error al obtener componentes');
      setComponentes(data);
    } catch (err) {
      Swal.fire('Error', err instanceof Error ? err.message : 'No se pudieron cargar los componentes', 'error');
    } finally {
      setLoading(false);
    }
  }, [sucursalSeleccionada]);

  useEffect(() => {
    cargarComponentes();
  }, [cargarComponentes]);

  const abrirModalAgregar = async () => {
    if (!sucursalSeleccionada) return;

    let catalogoRam: OpcionCatalogo[] = [];
    let catalogoAlmacenamiento: OpcionCatalogo[] = [];
    try {
      const [ramResp, almResp] = await Promise.all([
        fetch(`${API_URL}/api/catalogoMemoriaRam`, { credentials: 'include' }),
        fetch(`${API_URL}/api/catalogoAlmacenamiento`, { credentials: 'include' }),
      ]);
      if (!ramResp.ok || !almResp.ok) throw new Error();
      catalogoRam = await ramResp.json();
      catalogoAlmacenamiento = await almResp.json();
    } catch {
      Swal.fire('Error', 'No se pudieron cargar los catálogos', 'error');
      return;
    }

    const opcionesRam = catalogoRam
      .map(r => `<option value="${r.id}">${r.descripcion}${r.tipo_modulo ? ` - ${r.tipo_modulo}` : ''}</option>`)
      .join('');
    const opcionesAlmacenamiento = catalogoAlmacenamiento
      .map(a => `<option value="${a.id}">${a.descripcion}</option>`)
      .join('');

    const { isConfirmed, value } = await Swal.fire<NuevoComponente>({
      title: 'Agregar componente',
      html: `
        <div style="text-align:left">
          <label><strong>Tipo de componente</strong></label>
          <div style="margin-bottom:10px">
            <label><input type="radio" name="tipo-componente" value="ram" checked /> Memoria RAM</label><br/>
            <label><input type="radio" name="tipo-componente" value="almacenamiento" /> Almacenamiento</label>
          </div>

          <select id="ram-select" class="swal2-select" style="display:block">
            <option value="">Selecciona memoria RAM</option>
            ${opcionesRam}
          </select>

          <select id="almacenamiento-select" class="swal2-select" style="display:none">
            <option value="">Selecciona almacenamiento</option>
            ${opcionesAlmacenamiento}
          </select>

          <input id="cantidad" type="number" min="1" step="1" value="1" class="swal2-input" placeholder="Cantidad" />
          <input id="precio" type="number" min="0" step="0.01" class="swal2-input" placeholder="Precio (MXN)" />

          <select id="estado" class="swal2-select">
            <option value="nuevo">Nuevo</option>
            <option value="usado" selected>Usado</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const ramSelect = document.getElementById('ram-select') as HTMLSelectElement;
        const almSelect = document.getElementById('almacenamiento-select') as HTMLSelectElement;
        document.querySelectorAll<HTMLInputElement>('input[name="tipo-componente"]').forEach(radio => {
          radio.addEventListener('change', () => {
            const esRam = radio.value === 'ram';
            ramSelect.style.display = esRam ? 'block' : 'none';
            almSelect.style.display = esRam ? 'none' : 'block';
          });
        });
      },
      preConfirm: () => {
        const tipo = (document.querySelector('input[name="tipo-componente"]:checked') as HTMLInputElement).value as NuevoComponente['tipo'];
        const selectId = tipo === 'ram' ? 'ram-select' : 'almacenamiento-select';
        const catalogoId = Number((document.getElementById(selectId) as HTMLSelectElement).value);
        const cantidad = Number((document.getElementById('cantidad') as HTMLInputElement).value);
        const precio = parseFloat((document.getElementById('precio') as HTMLInputElement).value);
        const estado = (document.getElementById('estado') as HTMLSelectElement).value;

        if (!catalogoId) {
          Swal.showValidationMessage(tipo === 'ram' ? 'Selecciona una memoria RAM' : 'Selecciona un almacenamiento');
          return false;
        }
        if (!Number.isInteger(cantidad) || cantidad < 1) {
          Swal.showValidationMessage('La cantidad debe ser un entero mayor a 0');
          return false;
        }
        if (isNaN(precio) || precio < 0) {
          Swal.showValidationMessage('Precio inválido');
          return false;
        }
        return { tipo, catalogoId, cantidad, precio, estado };
      },
    });

    if (!isConfirmed || !value) return;

    try {
      const resp = await fetch(`${API_URL}/api/inventario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tipo: value.tipo === 'ram' ? 'RAM' : 'Almacenamiento',
          cantidad: value.cantidad,
          precio: value.precio,
          estado: value.estado,
          memoria_ram_id: value.tipo === 'ram' ? value.catalogoId : null,
          almacenamiento_id: value.tipo === 'almacenamiento' ? value.catalogoId : null,
          sucursal_id: sucursalSeleccionada,
          fecha_creacion: new Date().toISOString(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Error al guardar el componente');

      Swal.fire({ icon: 'success', title: 'Agregado', text: 'Componente agregado al inventario', timer: 1400, showConfirmButton: false });
      cargarComponentes();
    } catch (err) {
      Swal.fire('Error', err instanceof Error ? err.message : 'No se pudo guardar el componente', 'error');
    }
  };

  const editarComponente = async (comp: ComponenteInventario) => {
    const { isConfirmed, value } = await Swal.fire<{ cantidad: number; precio: number }>({
      title: 'Editar componente',
      html: `
        <p style="margin-bottom:8px;color:#4b5563">${comp.descripcion}</p>
        <input id="swal-cantidad" type="number" min="0" step="1" class="swal2-input"
          value="${comp.cantidad}" placeholder="Cantidad">
        <input id="swal-precio" type="number" min="0" step="0.01" class="swal2-input"
          value="${Number(comp.precio || 0)}" placeholder="Precio (MXN)">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar cambios',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const cantidad = Number((document.getElementById('swal-cantidad') as HTMLInputElement).value);
        const precio = parseFloat((document.getElementById('swal-precio') as HTMLInputElement).value);

        if (!Number.isInteger(cantidad) || cantidad < 0) {
          Swal.showValidationMessage('La cantidad debe ser un entero mayor o igual a 0');
          return false;
        }
        if (isNaN(precio) || precio < 0) {
          Swal.showValidationMessage('Precio inválido');
          return false;
        }
        return { cantidad, precio };
      },
    });

    if (!isConfirmed || !value) return;

    try {
      const resp = await fetch(`${API_URL}/api/inventario/componentes/${comp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(value),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Error al actualizar el componente');

      setComponentes(prev =>
        prev.map(c => (c.id === comp.id ? { ...c, cantidad: data.cantidad, precio: data.precio } : c))
      );
      Swal.fire({ icon: 'success', title: 'Actualizado', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', err instanceof Error ? err.message : 'No se pudo actualizar el componente', 'error');
    }
  };

  const eliminarComponente = async (comp: ComponenteInventario) => {
    const { value: motivo } = await Swal.fire({
      title: '¿Eliminar componente?',
      text: comp.descripcion,
      icon: 'warning',
      input: 'textarea',
      inputPlaceholder: 'Escribe el motivo de eliminación...',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v ? 'Debes escribir un motivo' : undefined),
    });

    if (!motivo) return;

    try {
      const resp = await fetch(`${API_URL}/api/inventario/${comp.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ motivo }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Error al eliminar el componente');

      setComponentes(prev => prev.filter(c => c.id !== comp.id));
      Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', err instanceof Error ? err.message : 'No se pudo eliminar el componente', 'error');
    }
  };

  if (userLoading || !user) return null;

  const visibles = componentes.filter(c => !soloDisponibles || c.cantidad > 0);
  const memorias = visibles.filter(c => c.memoria_ram_id != null);
  const almacenamientos = visibles.filter(c => c.almacenamiento_id != null);

  const renderTabla = (items: ComponenteInventario[], vacio: string) =>
    items.length === 0 ? (
      <p className="text-sm text-gray-500 py-4 text-center">{vacio}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Descripción</th>
              <th className="px-4 py-3 text-left font-medium">Stock</th>
              <th className="px-4 py-3 text-left font-medium">Precio</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Sucursal</th>
              <th className="px-4 py-3 text-left font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(comp => (
              <tr key={comp.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 font-medium text-gray-800">{comp.descripcion}</td>
                <td className="px-3 py-2">
                  {comp.cantidad > 0 ? (
                    <span className="text-green-700 font-medium">{comp.cantidad}</span>
                  ) : (
                    <span className="text-red-500 font-medium">Sin stock</span>
                  )}
                </td>
                <td className="px-3 py-2">${Number(comp.precio || 0).toFixed(2)}</td>
                <td className="px-3 py-2 text-gray-500">{comp.estado}</td>
                <td className="px-3 py-2 text-gray-600">{comp.sucursal_nombre ?? 'Sin asignar'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-3">
                    <button
                      onClick={() => editarComponente(comp)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Editar cantidad y precio"
                      aria-label={`Editar ${comp.descripcion}`}
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => eliminarComponente(comp)}
                      className="text-red-500 hover:text-red-700"
                      title="Eliminar"
                      aria-label={`Eliminar ${comp.descripcion}`}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className="bg-white p-6 rounded-xl shadow w-full"
    >
      <h2 className="font-semibold text-lg text-gray-700 mb-4">
        Componentes internos
      </h2>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-6">
        {/* Filtro por sucursal */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <FaStore className="text-gray-500" />
          <select
            value={sucursalSeleccionada ?? ''}
            onChange={(e) => setSucursalSeleccionada(Number(e.target.value))}
            className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <button
          onClick={abrirModalAgregar}
          className="flex items-center justify-center gap-2 w-full sm:w-auto bg-indigo-600 text-white px-3 py-2 rounded-lg shadow hover:bg-indigo-700"
        >
          <FaPlus /> Agregar componente
        </button>

        {/* Toggle inventario disponible */}
        <label className="inline-flex items-center cursor-pointer gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-600">
            {soloDisponibles ? 'Inventario disponible' : 'Mostrar todo'}
          </span>
          <input
            type="checkbox"
            checked={soloDisponibles}
            onChange={() => setSoloDisponibles(!soloDisponibles)}
            className="sr-only"
          />
          <div className={`w-11 h-6 rounded-full transition ${soloDisponibles ? 'bg-green-500' : 'bg-gray-400'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${soloDisponibles ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
        </label>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-6">Cargando componentes...</div>
      ) : (
        <>
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FaMemory className="text-indigo-600" /> Memorias RAM
          </h3>
          <div className="mb-8">
            {renderTabla(memorias, soloDisponibles ? 'No hay memorias RAM con stock.' : 'No hay memorias RAM registradas.')}
          </div>

          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FaHdd className="text-amber-600" /> Almacenamiento
          </h3>
          {renderTabla(almacenamientos, soloDisponibles ? 'No hay almacenamiento con stock.' : 'No hay almacenamiento registrado.')}
        </>
      )}
    </motion.div>
  );
}
