'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import {
  FaMicrochip,
  FaMemory,
  FaHdd,
  FaPlus,
  FaEdit,
  FaTrash,
  FaHeadphones,
  FaUsb,
  FaMouse,
  FaKeyboard,
  FaWifi,
  FaCamera,
  FaGamepad,
  FaTools,
  FaQuestionCircle,
  FaLaptopCode,
  FaStore,
  FaDownload,
  FaSearch
} from 'react-icons/fa';
import EtiquetaA4Modal from './EtiquetaA4Modal';
import type { Etiqueta } from './Types';
import EquipoTraspasoModal from "./EquiposTraspasoModal";
import { Equipo } from './Types';
import { Categoria } from './Types'
import { ItemEtiqueta } from './Types'

import { useUser } from '@/context/UserContext'

interface InventarioItem {
  id: number;
  tipo: string;
  descripcion?: string;
  especificacion?: string;
  cantidad: number;
  disponibilidad: boolean;
  estado: string;
  sucursal_id: number;
  precio?: number;
  sku?: string;
  es_codigo_generado?: boolean;
  barcode?: string;
  categoria_catalogo_id:number;
  visible_catalogo?: boolean; 
}

interface RecepcionDirectaItem {
  id: number
  cantidad: number
  precio: number
  categoria_catalogo_id: number
}

export interface EquipoArmado {
  id: number;
  nombre: string;
  procesador: string;
  etiqueta: string;
  sucursal_id?: number;
  sucursal_nombre: string;
  precio: number;
  estado: string;
  disponibilidad: boolean;
  serie:string;
  categoria_catalogo_id: number;
  visible_catalogo?: boolean; 

  // 🔹 Estas pueden o no existir al momento de enviar el payload
  memorias_ram?: string[];
  almacenamientos?: string[];
  memorias_ram_ids?: number[];
  almacenamientos_ids?: number[];
}

type EquipoInventario = {
  id: number
  nombre: string
  procesador?: string
  memorias_ram?: string[]
  almacenamientos?: string[]
  precio: number
  estado: string
  sucursal_nombre?: string
  cantidad: number
  serie?: string
  etiqueta?: string
  origen: "armado" | "recepcion_directa"
  visible_catalogo?: boolean 
}

function esEquipoArmado(
  eq: EquipoInventario
): eq is EquipoInventario & EquipoArmado {
  return eq.origen === "armado";
}

function esRecepcionDirecta(
  eq: EquipoInventario
): eq is EquipoInventario & RecepcionDirectaItem {
  return eq.origen === "recepcion_directa";
}

export default function InventoryHardwareSection() {  
  const [loading, setLoading] = useState(true);  
  const [editandoInventario, setEditandoInventario] = useState<InventarioItem | null>(null);
  const [editandoEquipo, setEditandoEquipo] = useState<EquipoArmado | null>(null);  
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const { user, loading: userLoading } = useUser();  
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number | null>(null)
  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([])
  const [openImpresion, setOpenImpresion] = useState(false);
  const [etiquetasImpresion, setEtiquetasImpresion] = useState<Etiqueta[]>([]);
  const [skuBusqueda, setSkuBusqueda] = useState('');
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [equiposArmados, setEquiposArmados] = useState<EquipoArmado[]>([]);
  const [inventarioFiltrado, setInventarioFiltrado] = useState<any[]>([]);  
  const [recepcionDirecta, setRecepcionDirecta] = useState<any[]>([]);
  const [equiposFiltrados, setEquiposFiltrados] = useState<EquipoInventario[]>([]);
  const [equipoParaTraspaso, setEquipoParaTraspaso] = useState<Equipo | null>(null); 
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);  
  const [editandoRecepcionDirecta, setEditandoRecepcionDirecta] =useState<RecepcionDirectaItem | null>(null);
  const [vistaTabla, setVistaTabla] = useState(false);
  const [soloDisponibles, setSoloDisponibles] = useState(true);
  
  const normalizarRecepcionDirecta = useCallback((items: any[]) => {
    return items.map(i => ({
      ...i,
      origen: 'recepcion_directa'
    }));
  }, []);

  const equiposUnificados = useMemo<EquipoInventario[]>(() => {
    return [
      ...equiposArmados.map(e => ({ ...e, origen: 'armado' as const })),
      ...normalizarRecepcionDirecta(recepcionDirecta)
    ];
  }, [equiposArmados, recepcionDirecta]);

  const toggleVisibleCatalogo = async (id: number, value: boolean) => {
    try {
      // 🔥 Optimista (UI rápida)
      setInventario(prev =>
        prev.map(i =>
          i.id === id ? { ...i, visible_catalogo: value } : i
        )
      );

      setEquiposArmados(prev =>
        prev.map(e =>
          e.id === id ? { ...e, visible_catalogo: value } : e
        )
      );

      setRecepcionDirecta(prev =>
        prev.map((i: any) =>
          i.id === id ? { ...i, visible_catalogo: value } : i
        )
      );

      const res = await fetch(
        `${API_URL}/api/inventario/${id}/visible-catalogo`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            visible_catalogo: value,
          }),
        }
      );

      if (!res.ok) throw new Error();

    } catch (error) {
      Swal.fire("Error", "No se pudo actualizar visibilidad", "error");

      // ❌ rollback
      cargarInventario();
      cargarEquiposArmados();
      cargarRecepcionDirecta();
    }
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (userLoading) return
    if (!user) return

    setSucursalId(user.sucursal_id)
    setSucursalSeleccionada(user.sucursal_id)
  }, [user, userLoading])

  if (userLoading) return null
  if (!user) return null     

  // Cargar sucursales al iniciar
  useEffect(() => {
    fetch(`${API_URL}/api/sucursales`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setSucursales(data))
      .catch(() => {
        setSucursales([]);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar las sucursales',
        });
      });
  }, []);  

  // cargar categorias
  useEffect(() => {
    const cargarCategorias = async () => {

      const resp = await fetch(
        `${API_URL}/api/catalogo-categorias`,
        {
          credentials: 'include'
        }
      )

      if (!resp.ok) {
        console.error('Error cargando categorías')
        return
      }

      const data = await resp.json()

      setCategorias(data)
    }

    cargarCategorias()

  }, [])

  const eliminarRecepcionDirecta = async (id: number) => {
    const { value: motivo } = await Swal.fire({
      title: "¿Eliminar equipo?",
      text: "Esta acción eliminará el inventario de recepción directa.",
      icon: "warning",
      input: "textarea",
      inputPlaceholder: "Escribe el motivo de eliminación...",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => {
        if (!value) {
          return "Debes escribir un motivo";
        }
      }
    });

    if (!motivo) return;

    try {
      const res = await fetch(
        `${API_URL}/api/inventario/recepcion-directa/${id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ motivo }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al eliminar");
      }

      setEquiposFiltrados(prev =>
        prev.filter(eq => eq.id !== id)
      );

      Swal.fire({
        icon: "success",
        title: "Eliminado",
        text: "El inventario fue eliminado correctamente",
        timer: 1600,
        showConfirmButton: false,
      });

    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudo eliminar el inventario",
      });
    }
  };

  // 🔹 Cargar inventario de accesorios
  const cargarInventario = async () => {
    try {      
      const resp = await fetch(`${API_URL}/api/inventario?sucursal_id=${sucursalSeleccionada}`, { credentials: 'include' });
      if (!resp.ok) throw new Error('Error al obtener inventario');
      const data = await resp.json();
      setInventario(data);
      setInventarioFiltrado(data);
    } catch (err) {
      console.error('Error cargando inventario:', err);
      Swal.fire('Error', 'No se pudo cargar el inventario', 'error');
    }
  };

  const subirImagenCatalogo = async (inventarioId: number) => {

    let selectedFile: File | null = null

    await Swal.fire({
      title: "Imagen catálogo",
      html: `
        <div style="text-align:center">

          <label 
            for="fileInput"
            style="
              display:block;
              border:2px dashed #ccc;
              border-radius:8px;
              padding:20px;
              cursor:pointer;
              font-size:14px;
              color:#666;
            "
          >
            Click para seleccionar imagen
          </label>

          <input 
            id="fileInput" 
            type="file" 
            accept="image/*"
            style="display:none"
          />

          <img 
            id="preview"
            style="
              margin-top:10px;
              max-height:150px;
              display:none;
              margin-left:auto;
              margin-right:auto;
              border-radius:6px;
            "
          />

        </div>
      `,
      confirmButtonText: "Subir",
      showCancelButton: true,
      didOpen: () => {

        const input = document.getElementById("fileInput") as HTMLInputElement
        const preview = document.getElementById("preview") as HTMLImageElement

        input.addEventListener("change", () => {

          if (input.files && input.files[0]) {

            selectedFile = input.files[0]

            preview.src = URL.createObjectURL(selectedFile)
            preview.style.display = "block"

          }

        })

      },
      preConfirm: () => {

        if (!selectedFile) {

          Swal.showValidationMessage(
            "Selecciona una imagen"
          )

          return false
        }

        return selectedFile

      }
    }).then(async (result) => {

      if (!result.isConfirmed) return

      try {

        const formData = new FormData()
        formData.append("imagen", result.value)

        const res = await fetch(
          `${API_URL}/api/catalogo/imagen/${inventarioId}`,
          {
            method: "POST",
            credentials: "include",
            body: formData
          }
        )

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.message)
        }

        Swal.fire({
          icon: "success",
          title: "Imagen subida",
          timer: 1400,
          showConfirmButton: false
        })

        cargarInventario()

      } catch (error: any) {

        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message
        })

      }

    })

  }

  const abrirModalTraspaso = async (inventarioId: number) => {
    try {
      const res = await fetch(
        `${API_URL}/api/inventario/por-inventario/${inventarioId}`,
        { credentials: 'include' }
      )

      if (!res.ok) throw new Error('No se pudo obtener el equipo')

      const equipo: Equipo = await res.json()

      if (!equipo?.id) {
        throw new Error('Equipo inválido recibido')
      }
      console.log(equipo)
      setEquipoParaTraspaso(equipo)
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error')
    }
  }

  // 🔹 Cargar equipos armados
  const cargarEquiposArmados = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/inventario/equipos-armados?sucursal_id=${sucursalSeleccionada}`, { credentials: 'include' });
      if (!resp.ok) throw new Error('Error al obtener equipos armados');
      const data = await resp.json();
      setEquiposArmados(data);      
    } catch (err) {
      console.error('Error cargando equipos armados:', err);
      Swal.fire('Error', 'No se pudieron cargar los equipos armados', 'error');
    }
  };

  const cargarRecepcionDirecta = async () => {
    try {
      const resp = await fetch(
        `${API_URL}/api/inventario/recepcion-directa?sucursal_id=${sucursalSeleccionada}`,
        { credentials: 'include' }
      );

      if (!resp.ok) throw new Error('Error al obtener recepción directa');

      const data = await resp.json();
      setRecepcionDirecta(data);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo cargar recepción directa', 'error');
    }
  };

  const guardarRecepcionDirecta = async (item:any) => {
    try {

      const res = await fetch(
        `${API_URL}/api/inventario/recepcion-directa/${item.id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cantidad: item.cantidad,
            precio: item.precio,
            categoria_catalogo_id: item.categoria_catalogo_id
          })
        }
      );

      if (!res.ok) throw new Error();

      Swal.fire(
        'Guardado',
        'Recepción directa actualizada',
        'success'
      );

      setEditandoRecepcionDirecta(null);

      cargarInventario();

    } catch {

      Swal.fire(
        'Error',
        'No se pudo actualizar',
        'error'
      );

    }

  };
  
  useEffect(() => {
    if (!sucursalSeleccionada) return

    ;(async () => {
      setLoading(true)
      await Promise.all([
        cargarInventario(),
        cargarEquiposArmados(),
        cargarRecepcionDirecta()
      ])
      setLoading(false)
    })()
  }, [sucursalSeleccionada])

  useEffect(() => {
    if (editandoRecepcionDirecta) {

      const categoriasOptions = categorias.map(c => `
        <option value="${c.id}"
          ${c.id === editandoRecepcionDirecta.categoria_catalogo_id ? 'selected' : ''}>
          ${c.descripcion}
        </option>
      `).join('');

      Swal.fire({
        title: 'Editar recepción directa',

        html: `

          <input id="swal-cantidad" 
            type="number" 
            class="swal2-input"
            value="${editandoRecepcionDirecta.cantidad || 0}"
            placeholder="Cantidad">

          <input id="swal-precio" 
            type="number" 
            step="0.01" 
            min="0"
            class="swal2-input"
            value="${editandoRecepcionDirecta.precio || 0}"
            placeholder="Precio (MXN)">

          <select id="swal-categoria" class="swal2-input">
            <option value="">Seleccionar categoría</option>
            ${categoriasOptions}
          </select>

        `,

        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar cambios',
        cancelButtonText: 'Cancelar',

        preConfirm: () => {

          const cantidad =
            parseInt(
              (document.getElementById('swal-cantidad') as HTMLInputElement).value
            );

          const precio =
            parseFloat(
              (document.getElementById('swal-precio') as HTMLInputElement).value
            );

          const categoria_id =
            parseInt(
              (document.getElementById('swal-categoria') as HTMLSelectElement).value
            );

          if (isNaN(cantidad) || isNaN(precio) || !categoria_id) {

            Swal.showValidationMessage(
              'Todos los campos son obligatorios'
            );

            return null;
          }

          return {
            ...editandoRecepcionDirecta,
            cantidad,
            precio,
            categoria_catalogo_id: categoria_id
          };

        }

      }).then((res) => {

        if (res.isConfirmed && res.value) {

          guardarRecepcionDirecta(res.value);

        } else {

          setEditandoRecepcionDirecta(null);

        }

      });

    }

  }, [editandoRecepcionDirecta, categorias]);

  // 🔹 Modal de edición (sin cambios)
  useEffect(() => {
    if (editandoInventario) {

      const categoriasOptions = categorias.map(c => `
        <option value="${c.id}" 
          ${c.id === editandoInventario.categoria_catalogo_id ? 'selected' : ''}>
          ${c.descripcion}
        </option>
      `).join('');

      Swal.fire({
        title: 'Editar artículo',
        html: `        
          <input id="swal-descripcion" class="swal2-input" 
            value="${editandoInventario.descripcion || ''}" 
            placeholder="Descripción">

          <input id="swal-cantidad" type="number" class="swal2-input" 
            value="${editandoInventario.cantidad}" 
            placeholder="Cantidad">

          <input id="swal-precio" type="number" step="0.01" min="0" 
            class="swal2-input" 
            value="${editandoInventario.precio || 0}" 
            placeholder="Precio (MXN)">

          <select id="swal-categoria" class="swal2-input">
            <option value="">Seleccionar categoría</option>
            ${categoriasOptions}
          </select>
        `,

        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar cambios',
        cancelButtonText: 'Cancelar',

        preConfirm: () => {

          const categoria_id =
            parseInt(
              (document.getElementById('swal-categoria') as HTMLSelectElement).value
            );

          const descripcion =
            (document.getElementById('swal-descripcion') as HTMLInputElement).value;

          const cantidad =
            parseInt(
              (document.getElementById('swal-cantidad') as HTMLInputElement).value
            );

          const precio =
            parseFloat(
              (document.getElementById('swal-precio') as HTMLInputElement).value
            );

          if (!descripcion || isNaN(cantidad) || isNaN(precio)) {
            Swal.showValidationMessage('Todos los campos son obligatorios');
            return null;
          }

          return {
            ...editandoInventario,
            categoria_catalogo_id: categoria_id,
            descripcion,
            cantidad,
            precio,
          };
        },

      }).then((res) => {

        if (res.isConfirmed && res.value) {
          guardarInventario(res.value as InventarioItem);
        } else {
          setEditandoInventario(null);
        }

      });

    }
  }, [editandoInventario, categorias]);

  useEffect(() => {
    if (!editandoEquipo) return;

    const categoriasOptions = categorias.map(c => `
        <option value="${c.id}" 
          ${c.id === editandoEquipo.categoria_catalogo_id ? 'selected' : ''}>
          ${c.descripcion}
        </option>
      `).join('');

    const abrirModalEdicion = (datosActuales: any) => {
      Swal.fire({
        title: 'Editar equipo armado',
        html: `
          <input id="swal-nombre" class="swal2-input" value="${datosActuales.nombre}" placeholder="Nombre del equipo">
          <input id="swal-procesador" class="swal2-input" value="${datosActuales.procesador}" placeholder="Procesador">
          <input id="swal-precio" type="number" step="0.01" class="swal2-input" value="${datosActuales.precio}" placeholder="Precio">

          <div style="display:flex;gap:6px;align-items:center;">
            <input id="swal-ram" class="swal2-input" value="${datosActuales.memorias_ram?.join(', ') || ''}" placeholder="RAM (separa por coma)" style="flex:1;">
            <button id="btn-seleccionar-ram" class="swal2-confirm swal2-styled" style="padding:4px 8px;font-size:12px;">🔍</button>
          </div>

          <div style="display:flex;gap:6px;align-items:center;">
            <input id="swal-almacenamiento" class="swal2-input" value="${datosActuales.almacenamientos?.join(', ') || ''}" placeholder="Almacenamientos (separa por coma)" style="flex:1;">
            <button id="btn-seleccionar-almacenamiento" class="swal2-confirm swal2-styled" style="padding:4px 8px;font-size:12px;">🔍</button>
          </div>

          <select id="swal-categoria" class="swal2-input">
            <option value="">Seleccionar categoría</option>
            ${categoriasOptions}
          </select>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar cambios',

        didOpen: () => {
          // 🔹 Botón seleccionar RAM
          document.getElementById("btn-seleccionar-ram")?.addEventListener("click", async () => {
            const { default: SelectorRamModal } = await import("./SelectorRamModal");

            Swal.close(); // Cierra el modal principal temporalmente

            await SelectorRamModal({
              sucursalId: user.sucursal_id,
              onSelect: (items) => {
                // 🔸 Extraemos tanto las descripciones como los IDs
                const nuevasRams = items.map((i) => i.descripcion);
                const nuevasRamIds = items.map((i) => i.id);

                const nuevosDatos = {
                  ...datosActuales,
                  memorias_ram: nuevasRams,
                  memorias_ram_ids: nuevasRamIds,
                };

                abrirModalEdicion(nuevosDatos); // reabre con cambios
              },
              onCancel: () => {
                abrirModalEdicion(datosActuales); // reabre sin cambios
              },
            });
          });

          // 🔹 Botón seleccionar almacenamiento
          document.getElementById("btn-seleccionar-almacenamiento")?.addEventListener("click", async () => {
            const { default: SelectorAlmacenamientoModal } = await import("./SelectorAlmacenamientoModal");

            Swal.close(); // Cierra el modal principal

            await SelectorAlmacenamientoModal({
              onSelect: (items) => {
                const nuevosAlm = items.map((i) => i.descripcion);
                const nuevosAlmIds = items.map((i) => i.id);

                const nuevosDatos = {
                  ...datosActuales,
                  almacenamientos: nuevosAlm,
                  almacenamientos_ids: nuevosAlmIds,
                };

                abrirModalEdicion(nuevosDatos); // reabre con cambios
              },
              onCancel: () => {
                abrirModalEdicion(datosActuales); // reabre sin cambios
              },
            });
          });
        },

        preConfirm: () => {
          const nombre = (document.getElementById('swal-nombre') as HTMLInputElement).value;
          const procesador = (document.getElementById('swal-procesador') as HTMLInputElement).value;
          const precio = parseFloat((document.getElementById('swal-precio') as HTMLInputElement).value);
          const memorias_ram = (document.getElementById('swal-ram') as HTMLInputElement).value.split(',').map(r => r.trim()).filter(r => r);
          const almacenamientos = (document.getElementById('swal-almacenamiento') as HTMLInputElement).value.split(',').map(a => a.trim()).filter(a => a);
          const categoria_id = parseInt((document.getElementById('swal-categoria') as HTMLSelectElement).value) || null;

          if (!nombre || !procesador || isNaN(precio)) {
            Swal.showValidationMessage('Completa todos los campos obligatorios');
            return false;
          }

          // Conserva los IDs si existen
          return {
            ...datosActuales,
            nombre,
            procesador,
            precio,
            categoria_catalogo_id: categoria_id,
            memorias_ram,
            almacenamientos,
            memorias_ram_ids: datosActuales.memorias_ram_ids || [],
            almacenamientos_ids: datosActuales.almacenamientos_ids || [],
          };
        },
      }).then((res) => {
        if (res.isConfirmed && res.value) guardarEquipoArmado(res.value);
        else setEditandoEquipo(null);
      });
    };

    abrirModalEdicion(editandoEquipo);
  }, [editandoEquipo]);

  const guardarInventarioCatalogo = async (body: {
    tipo: 'RAM' | 'Almacenamiento'
    especificacion?: string
    cantidad: number    
    precio: number
    estado: string
    memoria_ram_id: number | null
    almacenamiento_id: number | null
    sucursal_id: number
    categoria_catalogo_id: number
  }) => {
    const resp = await fetch(`${API_URL}/api/inventario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...body,
        fecha_creacion: new Date().toISOString(),
      }),
    })

    if (!resp.ok) {
      throw new Error('Error guardando inventario de catálogo')
    }

    return resp.json()
  }

  // 🔸 Guardar / editar artículo
  const guardarInventario = async (item: InventarioItem) => {
    try {
      const metodo = editandoInventario ? 'PUT' : 'POST';
      const url = editandoInventario
        ? `${API_URL}/api/inventario/${editandoInventario.id}`
        : `${API_URL}/api/inventario/general`;

      const resp = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(item),
      });

      if (!resp.ok) throw new Error('Error guardando inventario');
      const nuevo = await resp.json();

      nuevo.descripcion = nuevo.descripcion || nuevo.especificacion;

      if (editandoInventario) {
        setInventario((prev) => prev.map((i) => (i.id === nuevo.id ? nuevo : i)));
        Swal.fire('Actualizado', 'El artículo se actualizó correctamente', 'success');
      } else {
        setInventario((prev) => [nuevo, ...prev]);
        Swal.fire('Agregado', 'Artículo agregado al inventario', 'success');
      }

      setEditandoInventario(null);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo guardar el artículo', 'error');
    }
  };

  // 🔸 Guardar o actualizar equipo armado
  const guardarEquipoArmado = async (equipo: EquipoArmado) => {
    try {
      // 🧹 Crear una copia limpia del equipo antes de enviarlo
      const equipoLimpio = { ...equipo };

      // ⚙️ Si los arrays están vacíos, los quitamos del payload
      // (esto evita que se reemplace por null en la base de datos)
      if (equipoLimpio.memorias_ram_ids?.length === 0) {
        delete equipoLimpio.memorias_ram_ids;
      }
      if (equipoLimpio.almacenamientos_ids?.length === 0) {
        delete equipoLimpio.almacenamientos_ids;
      }

      // También puedes limpiar los arrays de nombres si no son relevantes para el backend
      if (equipoLimpio.memorias_ram?.length === 0) {
        delete equipoLimpio.memorias_ram;
      }
      if (equipoLimpio.almacenamientos?.length === 0) {
        delete equipoLimpio.almacenamientos;
      }

      console.log("📤 Enviando equipo al backend:", equipoLimpio);

      const resp = await fetch(`${API_URL}/api/inventario/equipos-armados/${equipo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(equipoLimpio),
      });

      if (!resp.ok) throw new Error('Error al actualizar equipo armado');
      const actualizado = await resp.json();

      setEquiposArmados((prev) =>
        prev.map((e) => (e.id === actualizado.id ? actualizado : e))
      );

      Swal.fire('Actualizado', 'El equipo fue editado correctamente', 'success');
      setEditandoEquipo(null);
    } catch (error) {
      console.error("❌ Error al actualizar equipo armado:", error);
      Swal.fire('Error', 'No se pudo actualizar el equipo', 'error');
    }
  };

  // 🔸 Eliminar artículo (soft delete con motivo)
  const eliminarInventario = async (id: number) => {
    const { value: motivo } = await Swal.fire({
      title: '¿Eliminar artículo?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      input: 'textarea',
      inputPlaceholder: 'Escribe el motivo de eliminación...',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes escribir un motivo';
        }
      }
    });

    if (!motivo) return;

    try {
      const resp = await fetch(`${API_URL}/api/inventario/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ motivo }),
      });

      if (!resp.ok) throw new Error('Error eliminando artículo');

      setInventario((prev) => prev.filter((i) => i.id !== id));

      Swal.fire('Eliminado', 'Artículo eliminado correctamente', 'success');

    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo eliminar el artículo', 'error');
    }
  };

  const abrirModalInventario = async () => {
    // 🔹 Cargar catálogos
    const [ramResp, almacenamientoResp, categoriasResp] = await Promise.all([
      fetch(`${API_URL}/api/catalogoMemoriaRam`, { credentials: 'include' }),
      fetch(`${API_URL}/api/catalogoAlmacenamiento`, { credentials: 'include' }),
      fetch(`${API_URL}/api/catalogo-categorias`, { credentials: 'include' })
    ])

    const catalogoRam = await ramResp.json()
    const catalogoAlmacenamiento = await almacenamientoResp.json()
    const catalogoCategorias = await categoriasResp.json()

    // 🔹 Opciones HTML
    const opcionesRam = catalogoRam
      .map((r: any) => 
        `<option value="${r.id}">
          ${r.descripcion} - ${r.tipo_modulo}
        </option>`
      )
      .join('')

    const opcionesAlmacenamiento = catalogoAlmacenamiento
      .map((a: any) => `<option value="${a.id}">${a.descripcion}</option>`)
      .join('')

    const opcionesCategorias = catalogoCategorias
      .map((c: any) => `<option value="${c.id}">${c.descripcion}</option>`)
      .join('')

    Swal.fire({
      title: 'Agregar nuevo artículo',
      html: `
        <div style="text-align:left">

          <label><strong>Tipo de artículo</strong></label>
          <div style="margin-bottom:10px">
            <label>
              <input type="radio" name="tipo" value="otro" checked />
              Otro
            </label><br/>
            <label>
              <input type="radio" name="tipo" value="ram" />
              Memoria RAM
            </label><br/>
            <label>
              <input type="radio" name="tipo" value="almacenamiento" />
              Almacenamiento
            </label>
          </div>

          <input id="descripcion" class="swal2-input" placeholder="Descripción (solo para Otro)" />

          <input
            id="sku"
            class="swal2-input"
            placeholder="Código / SKU (escanea o escribe)"
          />

          <select id="ram-select" class="swal2-select" style="display:none">
            <option value="">Selecciona memoria RAM</option>
            ${opcionesRam}
          </select>

          <select id="almacenamiento-select" class="swal2-select" style="display:none">
            <option value="">Selecciona almacenamiento</option>
            ${opcionesAlmacenamiento}
          </select>

          <input id="precio" type="number" min="0" step="0.01" class="swal2-input" placeholder="Precio (MXN)" />

          <select id="estado" class="swal2-select">
            <option value="nuevo">Nuevo</option>
            <option value="usado" selected>Usado</option>
          </select>          

          <select id="categoria-select" class="swal2-select">
            <option value="">Sin categoría</option>
            ${opcionesCategorias}
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const radios = document.querySelectorAll<HTMLInputElement>('input[name="tipo"]')
        const descripcion = document.getElementById('descripcion') as HTMLInputElement
        const ramSelect = document.getElementById('ram-select') as HTMLSelectElement
        const almSelect = document.getElementById('almacenamiento-select') as HTMLSelectElement

        radios.forEach(radio => {
          radio.addEventListener('change', () => {
            if (radio.value === 'ram') {
              descripcion.style.display = 'none'
              ramSelect.style.display = 'block'
              almSelect.style.display = 'none'
            } else if (radio.value === 'almacenamiento') {
              descripcion.style.display = 'none'
              ramSelect.style.display = 'none'
              almSelect.style.display = 'block'
            } else {
              descripcion.style.display = 'block'
              ramSelect.style.display = 'none'
              almSelect.style.display = 'none'
            }
          })
        })
      },
      preConfirm: () => {
        const tipo = (document.querySelector('input[name="tipo"]:checked') as HTMLInputElement).value
        const descripcion = (document.getElementById('descripcion') as HTMLInputElement).value
        const ramId = (document.getElementById('ram-select') as HTMLSelectElement).value
        const almId = (document.getElementById('almacenamiento-select') as HTMLSelectElement).value
        const precio = parseFloat((document.getElementById('precio') as HTMLInputElement).value)
        const sku = (document.getElementById('sku') as HTMLInputElement).value.trim()
        const estado = (document.getElementById('estado') as HTMLSelectElement).value
        const categoriaId =(document.getElementById('categoria-select') as HTMLSelectElement).value

        if (!categoriaId) {
          Swal.showValidationMessage('Selecciona una categoría')
          return
        }

        if (isNaN(precio)) {
          Swal.showValidationMessage('Precio inválido')
          return
        }

        if (tipo === 'otro' && !descripcion.trim()) {
          Swal.showValidationMessage('La descripción es obligatoria')
          return
        }

        if (tipo === 'ram' && !ramId) {
          Swal.showValidationMessage('Selecciona una memoria RAM')
          return
        }

        if (tipo === 'almacenamiento' && !almId) {
          Swal.showValidationMessage('Selecciona un almacenamiento')
          return
        }

        return {
          tipo,
          descripcion,
          sku: sku || null,
          memoria_ram_id: tipo === 'ram' ? Number(ramId) : null,
          almacenamiento_id: tipo === 'almacenamiento' ? Number(almId) : null,
          precio,
          estado,
          categoria_catalogo_id: categoriaId ? Number(categoriaId) : null
        }
      }
    }).then(async res => {
      if (!res.isConfirmed || !res.value) return

      if (!sucursalId) {
        Swal.fire('Error', 'No hay sucursal seleccionada', 'error')
        return
      }

      const data = res.value

      try {
        if (data.tipo === 'ram') {
          await guardarInventarioCatalogo({
            tipo: 'RAM',
            cantidad: 1,
            precio: data.precio,
            estado: data.estado,
            memoria_ram_id: data.memoria_ram_id,
            almacenamiento_id: null,
            sucursal_id: sucursalId, // ✅ ya es number
            categoria_catalogo_id: data.categoria_catalogo_id
          })

          Swal.fire('Agregado', 'Memoria RAM agregada al inventario', 'success')
          return
        }

        if (data.tipo === 'almacenamiento') {
          await guardarInventarioCatalogo({
            tipo: 'Almacenamiento',
            cantidad: 1,
            precio: data.precio,
            estado: data.estado,
            memoria_ram_id: null,
            almacenamiento_id: data.almacenamiento_id,
            sucursal_id: sucursalId, // ✅
            categoria_catalogo_id: data.categoria_catalogo_id
          })

          Swal.fire('Agregado', 'Almacenamiento agregado al inventario', 'success')
          return
        }

        await guardarInventario({
          id: 0,
          tipo: 'Otro',
          descripcion: data.descripcion,
          sku: data.sku || null,
          cantidad: 1,
          disponibilidad: true,
          estado: data.estado,
          sucursal_id: sucursalId, // ✅
          precio: data.precio,
          categoria_catalogo_id: data.categoria_catalogo_id
        } as InventarioItem)
      } catch (err) {
        console.error(err)
        Swal.fire('Error', 'No se pudo guardar el artículo', 'error')
      }
    })
  }

  const obtenerIcono = (tipo: string, especificacion?: string) => {
    const texto = `${tipo} ${especificacion || ''}`.toLowerCase().trim();
    if (texto.includes('ram') || texto.includes('ddr')) return <FaMemory className="text-indigo-600 text-3xl" />;
    if (texto.includes('ssd') || texto.includes('hdd') || texto.includes('disco')) return <FaHdd className="text-amber-600 text-3xl" />;
    if (texto.includes('mouse')) return <FaMouse className="text-blue-600 text-3xl" />;
    if (texto.includes('teclado')) return <FaKeyboard className="text-gray-700 text-3xl" />;
    if (texto.includes('audifono') || texto.includes('headset')) return <FaHeadphones className="text-pink-600 text-3xl" />;
    if (texto.includes('gamepad') || texto.includes('control')) return <FaGamepad className="text-purple-600 text-3xl" />;
    if (texto.includes('usb') || texto.includes('bluetooth')) return <FaUsb className="text-orange-600 text-3xl" />;
    if (texto.includes('router') || texto.includes('wifi')) return <FaWifi className="text-green-600 text-3xl" />;
    if (texto.includes('camara')) return <FaCamera className="text-rose-600 text-3xl" />;
    if (texto.includes('cable') || texto.includes('hdmi')) return <FaTools className="text-teal-600 text-3xl" />;
    if (texto.includes('fuente') || texto.includes('psu')) return <FaMicrochip className="text-green-600 text-3xl" />;
    return <FaQuestionCircle className="text-gray-400 text-3xl" />;
  };

  const imprimirEtiquetasInventario = (item: ItemEtiqueta) => {
    if (!item.sku || !item.barcode) return;

    setEtiquetasImpresion([
      {
        lote: item.descripcion || item.especificacion || 'INVENTARIO',
        id: item.sku,
        barcode: item.barcode,
      },
    ]);

    setOpenImpresion(true);
  }; 

  useEffect(() => {
    const valor = skuBusqueda.trim();

    if (!valor) {
      setInventarioFiltrado(inventario);
      setEquiposFiltrados(equiposUnificados);
      return;
    }

    setInventarioFiltrado(
      inventario.filter(item => item.sku === valor)
    );

    setEquiposFiltrados(
      equiposUnificados.filter(eq =>
        eq.serie === valor || eq.etiqueta === valor
      )
    );
  }, [skuBusqueda, inventario, equiposUnificados]);


  const equiposAgrupados = Object.values(
    equiposFiltrados.reduce<Record<string, EquipoInventario>>((acc, eq) => {

      const ram = eq.memorias_ram?.join(", ") || "N/A"
      const almacenamiento = eq.almacenamientos?.join(", ") || "N/A"

      const key = [
        eq.nombre,
        eq.procesador,
        ram,
        almacenamiento,
        eq.precio,
        eq.sucursal_nombre
      ].join("|")

      if (!acc[key]) {
        acc[key] = {
          ...eq,
          cantidad: eq.cantidad ?? 0
        }
      } else {
        acc[key].cantidad = (acc[key].cantidad ?? 0) + (eq.cantidad ?? 0)
      }

      return acc
    }, {})
  )

  if (loading) {
    return <div className="text-center text-gray-500 py-6">Cargando inventario...</div>;
  }

  const inventarioFinal = soloDisponibles
  ? inventarioFiltrado.filter(item => item.cantidad > 0)
  : inventarioFiltrado;

  const equiposFinal = soloDisponibles
  ? equiposFiltrados.filter(eq => eq.cantidad > 0)
  : equiposFiltrados;

  const equiposAgrupadosFinal = soloDisponibles
  ? equiposAgrupados.filter(eq => eq.cantidad > 0)
  : equiposAgrupados;

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className="bg-white p-6 rounded-xl shadow w-full"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        {/* Título */}
        <h2 className="font-semibold text-lg text-gray-700">
          Inventario de Hardware y Accesorios
        </h2>        
      </div>
      {/* === INVENTARIO GENERAL === */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">        
        {/* Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">

          <div className="relative w-full sm:w-auto">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              autoFocus
              placeholder="Escanear SKU o Serie"
              value={skuBusqueda}
              onChange={(e) => setSkuBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSkuBusqueda('');
              }}
              className="w-full sm:w-64 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm
                        focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filtro por sucursal */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <FaStore className="text-gray-500" />
            <select
              value={sucursalSeleccionada ?? ''}
              onChange={(e) => setSucursalSeleccionada(Number(e.target.value))}
              className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Botón agregar */}
          <button
            onClick={abrirModalInventario}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-indigo-600 text-white px-3 py-2 rounded-lg shadow hover:bg-indigo-700"
          >
            <FaPlus /> Agregar
          </button>

          <button
            onClick={() => setVistaTabla(!vistaTabla)}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gray-600 text-white px-3 py-2 rounded-lg shadow hover:bg-gray-700"
          >
            {vistaTabla ? 'Vista Cards' : 'Vista Tabla'}
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

            <div
              className={`w-11 h-6 rounded-full transition ${
                soloDisponibles ? 'bg-green-500' : 'bg-gray-400'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                  soloDisponibles ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
          </label>

        </div>
      </div>      

      {/* Mensaje cuando no hay coincidencias en inventario */}
      {skuBusqueda && equiposFinal.length === 0 && (
        <p className="text-sm text-gray-500 mb-4">
          No se encontró inventario con ese SKU
        </p>
      )}

      {!vistaTabla && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {inventarioFinal.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02 }}
              className={`p-4 rounded-lg shadow-sm flex flex-col items-start
                ${skuBusqueda
                  ? 'border-2 border-indigo-500 bg-indigo-50'
                  : 'border border-gray-100 bg-gray-50'}
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                {obtenerIcono(item.tipo, item.especificacion || item.descripcion)}
                <span className="font-semibold text-gray-800">
                  {item.descripcion || item.especificacion}
                </span>
              </div>
              {item.cantidad > 0 ? (
                    <span className="text-sm text-gray-700">
                      📦 Stock disponible: {item.cantidad}
                    </span>
                  ) : (
                    <span className="text-sm text-red-500 font-medium">
                      🚫 Sin stock
                    </span>
                  )}            
              <span className="text-sm text-gray-600">
                💲 Precio: {Number(item.precio || 0).toFixed(2)} MXN
              </span>
              <span className="text-xs text-gray-400 mt-1">Estado: {item.estado}</span>

              <div className="flex gap-3 mt-4 items-center">
                <button
                  onClick={() => setEditandoInventario(item)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Editar"
                >
                  <FaEdit />
                </button>

                <button
                  onClick={() => eliminarInventario(item.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Eliminar"
                >
                  <FaTrash />
                </button>

                <button
                  onClick={() => subirImagenCatalogo(item.id)}
                  className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                >
                  Imagen Catálogo
                </button>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={!!item.visible_catalogo}
                    onChange={(e) =>
                      toggleVisibleCatalogo(item.id, e.target.checked)
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-xs text-gray-600">
                    Visible catálogo
                  </span>
                </div>

                  {/* 🏷️ Imprimir etiquetas (solo si fue generado) */}
                  {item.es_codigo_generado && item.sku && item.barcode && (
                    <button
                      onClick={() => imprimirEtiquetasInventario(item)}
                      className="text-green-600 hover:text-green-800"
                      title="Imprimir etiquetas"
                    >
                      <FaDownload />
                    </button>
                  )}              
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {vistaTabla && (
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
            
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Producto</th>
                <th className="px-4 py-3 text-left font-medium">Stock</th>
                <th className="px-4 py-3 text-left font-medium">Precio</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {inventarioFinal.map((item) => (
                <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">                  

                  <td className="px-3 py-2">
                    {item.descripcion || item.especificacion}
                  </td>                  

                  <td className="px-3 py-2">
                    {item.cantidad > 0 ? (
                      <span className="text-green-700 font-medium">
                        {item.cantidad}
                      </span>
                    ) : (
                      <span className="text-red-500 font-medium">
                        Sin stock
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    ${Number(item.precio || 0).toFixed(2)}
                  </td>

                  <td className="px-3 py-2">
                    {item.estado}
                  </td>

                  <td className="px-3 py-2 flex gap-3">

                    <button
                      onClick={() => setEditandoInventario(item)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>

                    <button
                      onClick={() => eliminarInventario(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FaTrash />
                    </button>                    

                    <button
                      onClick={() => subirImagenCatalogo(item.id)}
                      className="text-indigo-600 hover:text-indigo-800"
                      title="Imagen catálogo"
                    >
                      <FaCamera />
                    </button>

                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}

      {/* === EQUIPOS ARMADOS === */}
      <h2 className="font-semibold text-lg text-gray-700 mb-4 flex items-center gap-2">
        <FaLaptopCode className="text-indigo-600" /> Equipos Armados
      </h2>

      {/* Mensaje cuando no hay coincidencias en equipos armados */}
      {skuBusqueda && equiposFinal.length === 0 && (
        <p className="text-sm text-gray-500 mb-4">
          No se encontraron equipos armados con esa serie
        </p>
      )}

      {!vistaTabla && (
        <>
          {equiposFiltrados.length === 0 && !skuBusqueda ? (
            <p className="text-gray-500 text-center py-4">
              No hay equipos armados registrados.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {equiposFinal.map((eq) => (
                <motion.div
                  key={eq.id}
                  whileHover={{ scale: 1.02 }}
                  className={`p-5 rounded-2xl shadow-md flex flex-col justify-between
                    ${skuBusqueda
                      ? 'border-2 border-indigo-500 bg-indigo-50'
                      : 'border border-gray-200 bg-white'}
                  `}
                >
                  {/* 🔹 Encabezado */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-800 text-lg leading-tight">
                        {eq.nombre}
                      </h3>
                      <span className="text-xs text-gray-500 font-mono">
                        #{eq.etiqueta}
                      </span>
                    </div>
                    {eq.cantidad > 0 ? (
                      <span className="text-sm text-gray-700">
                        📦 Stock disponible: {eq.cantidad}
                      </span>
                    ) : (
                      <span className="text-sm text-red-500 font-medium">
                        🚫 Sin stock
                      </span>
                    )}


                    {/* 🔹 Especificaciones */}
                    <div className="space-y-1 mt-2 text-sm text-gray-600">
                      <p>🧠 {eq.procesador}</p>
                      <p>💾 RAM: {eq.memorias_ram?.join(", ") || "N/A"}</p>
                      <p>📦 Almacenamiento: {eq.almacenamientos?.join(", ") || "N/A"}</p>
                      <span
                        className="text-xs text-blue-500 cursor-pointer hover:underline mt-1"
                        onClick={() => abrirModalTraspaso(eq.id)}
                      >
                        Sucursal: {eq.sucursal_nombre ?? "Sin asignar"}
                      </span>
                    </div>
                  </div>

                  {/* 🔹 Precio y estado */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-base font-semibold text-green-700">
                      💲 Precio: {Number(eq.precio || 0).toFixed(2)} MXN
                    </p>
                    <p className="text-xs text-gray-400">Estado: {eq.estado}</p>                
                    {/* 🔹 Botones de acción */}
                    <div className="flex gap-4 mt-3 items-center">
                      {esEquipoArmado(eq) && (
                        <>
                          <button
                            onClick={() => setEditandoEquipo(eq)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar equipo"
                          >
                            <FaEdit />
                          </button>

                          <button
                            onClick={() => eliminarInventario(eq.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Eliminar equipo"
                          >
                            <FaTrash />
                          </button>

                          <button
                            onClick={() => subirImagenCatalogo(eq.id)}
                            className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                          >
                            Imagen Catálogo
                          </button>

                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="checkbox"
                              checked={!!eq.visible_catalogo}
                              onChange={(e) =>
                                toggleVisibleCatalogo(eq.id, e.target.checked)
                              }
                              className="w-4 h-4"
                            />
                            <span className="text-xs text-gray-600">
                              Visible catálogo
                            </span>
                          </div>
                        </>
                      )}

                      {esRecepcionDirecta(eq) && (
                        <>
                          <button
                            onClick={() => setEditandoRecepcionDirecta(eq)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar inventario"
                          >
                            <FaEdit />
                          </button>

                          <button
                            onClick={() => imprimirEtiquetasInventario(eq as any)}
                            className="text-green-600 hover:text-green-800"
                            title="Imprimir etiquetas"
                          >
                            <FaDownload />
                          </button>

                          <button
                            onClick={() => subirImagenCatalogo(eq.id)}
                            className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                          >
                            Imagen Catálogo
                          </button>

                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="checkbox"
                              checked={!!eq.visible_catalogo}
                              onChange={(e) =>
                                toggleVisibleCatalogo(eq.id, e.target.checked)
                              }
                              className="w-4 h-4"
                            />
                            <span className="text-xs text-gray-600">
                              Visible catálogo
                            </span>
                          </div>
                          
                          <button
                            onClick={() => eliminarRecepcionDirecta(eq.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Eliminar inventario"
                          >
                            <FaTrash />
                          </button>                          
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {vistaTabla && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded-xl overflow-hidden">

            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                <th className="px-4 py-3 text-left font-medium">Equipo</th>                
                <th className="px-4 py-3 text-left font-medium">Stock</th>
                <th className="px-4 py-3 text-left font-medium">Procesador</th>
                <th className="px-4 py-3 text-left font-medium">RAM</th>
                <th className="px-4 py-3 text-left font-medium">Almacenamiento</th>
                <th className="px-4 py-3 text-left font-medium">Sucursal</th>
                <th className="px-4 py-3 text-left font-medium">Precio</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>                
              </tr>
            </thead>

            <tbody>
              {equiposAgrupadosFinal.map((eq) => (
                <tr
                  key={eq.id}
                  className={`border-t border-gray-100 hover:bg-gray-50 transition-colors
                    ${skuBusqueda ? 'bg-indigo-50' : ''}
                  `}
                >

                  <td className="px-3 py-2 font-medium">
                    {eq.nombre}
                  </td>                  

                  <td className="px-3 py-2">
                    {eq.cantidad > 0 ? (
                      <span className="text-green-700 font-medium">
                        {eq.cantidad}
                      </span>
                    ) : (
                      <span className="text-red-500 font-medium">
                        Sin stock
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    {eq.procesador}
                  </td>

                  <td className="px-3 py-2">
                    {eq.memorias_ram?.join(", ") || "N/A"}
                  </td>
                  
                  <td className="px-3 py-2">
                    {eq.almacenamientos?.join(", ") || "N/A"}
                  </td>

                  <td
                    className="px-3 py-2 text-blue-600 cursor-pointer hover:underline"
                    onClick={() => abrirModalTraspaso(eq.id)}
                  >
                    {eq.sucursal_nombre ?? "Sin asignar"}
                  </td>

                  <td className="px-3 py-2 text-green-700 font-semibold">
                    ${Number(eq.precio || 0).toFixed(2)}
                  </td>

                  <td className="px-3 py-2 text-gray-500">
                    {eq.estado}
                  </td>                  

                </tr>
              ))}
            </tbody>

          </table>
        </div>
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

      <EtiquetaA4Modal
        open={openImpresion}
        etiquetas={etiquetasImpresion}
        onClose={() => setOpenImpresion(false)}
        allowCantidad
      />

    </motion.div>
  );
}
