'use client'
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useUser } from '@/context/UserContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Lote {
  id: number;
  etiqueta: string;
  fecha_recibo: string;
  total_equipos: number;
  usuario_recibio: number;
  fecha_creacion: string;
}

interface RamModule {
  memoria_ram_id: number | "";
  cantidad?: number;
  slot?: number | null;
}

interface StorageDevice {
  almacenamiento_id: number | "";
  rol?: string;
  capacidad_override?: number;
  orden?: number;
}

interface Serie {
  lote_etiqueta_id: number;  
  lote_id: number;
  etiqueta: string;
  equipo_id: number | null;
  estado_id: number | null;
  estado_nombre: string | null;
  visual_color: string | null;
}

export default function SpecsCard() {
  const { user, loading } = useUser()
  if (loading) return <p>Cargando...</p>
  if (!user) return null
  const usuarioId = user.id
  const sucursalId = user.sucursal_id  
  const [specs, setSpecs] = useState({
    modelo: "",
    procesador: "",
    observaciones: "",
    detalles: "",
  });
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [selectedLote, setSelectedLote] = useState("");  
  const [selectedSerialId, setSelectedSerialId] = useState<number | "">("");  
  const [catalogoEstados, setCatalogoEstados] = useState<{id: number, nombre: string}[]>([]);
  const [selectedEstadoId, setSelectedEstadoId] = useState<number | "">("");
  const [seriales, setSeriales] = useState<Serie[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [camposDeshabilitados, setCamposDeshabilitados] = useState(false);
  const [equipoEncontrado, setEquipoEncontrado] = useState<any>(null);    

  // Dentro de SpecsCard agrega al inicio:
  const [ramOptions, setRamOptions] = useState<{ id: number; descripcion: string }[]>([]);
  const [storageOptions, setStorageOptions] = useState<{ id: number; descripcion: string }[]>([]);

  const [ramModules, setRamModules] = useState<RamModule[]>([{ memoria_ram_id: "" }]);
  const [storages, setStorages] = useState<StorageDevice[]>([{ almacenamiento_id: "" }]);
  
  const addRamModule = () => setRamModules([...ramModules, { memoria_ram_id: "" }]);
  const removeRamModule = (idx: number) => setRamModules(ramModules.filter((_, i) => i !== idx));
   
  const addStorage = () => setStorages([...storages, { almacenamiento_id: "" }]);
  const removeStorage = (idx: number) => setStorages(storages.filter((_, i) => i !== idx));

  const updateRamModule = (idx: number, value: number | "") =>
  setRamModules(ramModules.map((mod, i) =>
    i === idx ? { ...mod, memoria_ram_id: value } : mod
  ));

  const updateStorage = (idx: number, value: number | "") =>
    setStorages(storages.map((sto, i) =>
      i === idx ? { ...sto, almacenamiento_id: value } : sto
    ));

  useEffect(() => {
    fetch(`${API_URL}/api/catalogoEstados`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCatalogoEstados(data))
      .catch(() => {
        setCatalogoEstados([]);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los estados.',
        });
      });
  }, []); 

  // En un useEffect para cargar las opciones de RAM y Almacenamiento desde la API
  useEffect(() => {
    fetch(`${API_URL}/api/catalogoMemoriaRam`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setRamOptions(data))
      .catch(() => setRamOptions([]));

    fetch(`${API_URL}/api/catalogoAlmacenamiento`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setStorageOptions(data))
      .catch(() => setStorageOptions([]));
  }, []);

  //Buscar Equipo en base a la etiqueta
  useEffect(() => {
    if (selectedSerialId) {
      const etiquetaSeleccionada = seriales.find(s => s.lote_etiqueta_id === selectedSerialId)?.etiqueta || "";
      if (!etiquetaSeleccionada) return;

      fetch(`${API_URL}/api/equipos/buscar?texto=${encodeURIComponent(etiquetaSeleccionada)}`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(equipo => {
          if (equipo) {
            setSpecs({
              modelo: equipo.nombre,
              procesador: equipo.procesador,
              observaciones: "",
              detalles: "",
            });
            setSelectedEstadoId(equipo.estado_id);
            setCamposDeshabilitados(equipo.estado_id === 4);
            setEquipoEncontrado(equipo);
          } else {
            setSpecs({ modelo: "", procesador: "", observaciones: "", detalles: "" });
            setSelectedEstadoId("");
            setCamposDeshabilitados(false);
            setEquipoEncontrado(null);
          }
        });
    } else {
      setSpecs({ modelo: "", procesador: "", observaciones: "", detalles: "" });
      setSelectedEstadoId("");
      setCamposDeshabilitados(false);
      setEquipoEncontrado(null);
    }
  }, [selectedSerialId, seriales]);

  //Cargar los lotes
  useEffect(() => {
    fetch(`${API_URL}/api/lotes`, { method: 'GET', credentials: 'include' })
      .then(res => res.json())
      .then(data => setLotes(data))
      .catch(() => {
        setLotes([]);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los lotes.',
        });
      });
  }, []);

  // useEffect para cargar números de serie desde backend
  useEffect(() => {
    if (selectedLote) {
      const lote = lotes.find(l => l.etiqueta === selectedLote);
      if (lote) {
        fetch(`${API_URL}/api/lotes/${lote.id}/etiquetas`, { credentials: 'include' })
          .then(res => res.json())
          .then(data => setSeriales(data))
          .catch(() => {
            setSeriales([]);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo obtener las series del lote seleccionado.',
            });
          });
      } else {
        setSeriales([]);
      }
    } else {
      setSeriales([]);
    }
    setSelectedSerialId("");
  }, [selectedLote, lotes]);

  function agruparCantidadPorId<T extends { [key: string]: number }>(
    items: T[],
    key: keyof T
  ): Record<number, number> {
    const grouped: Record<number, number> = {};
    items.forEach(item => {
      const id = item[key];
      if (typeof id === "number") {
        grouped[id] = (grouped[id] || 0) + 1;
      }
    });
    return grouped;
  }

  const validarStock = async (ramModules: any, storages: any) => {
    const ramSolicitada = agruparCantidadPorId(ramModules, 'memoria_ram_id');
    const stoSolicitada = agruparCantidadPorId(storages, 'almacenamiento_id');

    for (const [id, cantidad] of Object.entries(ramSolicitada)) {
      const res = await fetch(
        `${API_URL}/api/inventario/validar-stock?memoria_ram_id=${id}&cantidad=${cantidad}&sucursal_id=${sucursalId}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (!data || !data.tieneStock) {
        await Swal.fire({
          icon: 'warning',
          title: 'Stock insuficiente',
          text: `No hay suficiente stock para el módulo RAM seleccionado (${cantidad} requerido).`,
        });
        return false;
      }
    }
    for (const [id, cantidad] of Object.entries(stoSolicitada)) {
      const res = await fetch(
        `${API_URL}/api/inventario/validar-stock?almacenamiento_id=${id}&cantidad=${cantidad}&sucursal_id=${sucursalId}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (!data || !data.tieneStock) {
        await Swal.fire({
          icon: 'warning',
          title: 'Stock insuficiente',
          text: `No hay suficiente stock para el almacenamiento seleccionado (${cantidad} requerido).`,
        });
        return false;
      }
    }
    return true;
  };

  const buscarEquipoPorEtiqueta = async () => {
    if (!busqueda.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/equipos/buscar?texto=${encodeURIComponent(busqueda)}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Equipo no encontrado");
      const equipo = await res.json();

      // Encontrar etiqueta completa asociada
      const etiqueta = seriales.find(s => s.lote_etiqueta_id === equipo.lote_etiqueta_id);

      // Si no existe en seriales, cargar seriales del lote
      if (!etiqueta) {
        // Por lote_etiqueta_id necesito el lote_id para cargar seriales
        // Aquí podrías necesitar hacer fetch para obtener el lote_id de ese lote_etiqueta_id
        // o idealmente modificar la respuesta del backend para incluir lote_id y la etiqueta completa
        // Por simplicidad, asumo que tienes lote_id ya disponible.
      }

      // Encontrar lote relacionado por id de lote de etiqueta
      const loteRelacionado = lotes.find(l => l.id === (etiqueta?.lote_id || equipo.lote_id));

      if (loteRelacionado) {
        setSelectedLote(loteRelacionado.etiqueta);

        fetch(`${API_URL}/api/lotes/${loteRelacionado.id}/etiquetas`, { credentials: 'include' })
          .then(resp => resp.json())
          .then(data => {
            setSeriales(data);
            setSelectedSerialId(equipo.lote_etiqueta_id);
          });
      } else {
        setSelectedLote("");
        setSeriales([]);
        setSelectedSerialId("");
      }

      setSpecs({
        modelo: equipo.nombre,
        procesador: equipo.procesador,
        observaciones: "",
        detalles: "",
      });
      setSelectedEstadoId(equipo.estado_id);
      setCamposDeshabilitados(equipo.estado_id === 4);
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Error", text: error.message || "No se encontró el equipo" });
      setCamposDeshabilitados(false);
    }
  };  

  const generarComision = async (equipoGuardado: any, usuario_id: number) => {
    try {
      // 1️⃣ Validar si ya existe la comisión para este equipo
      const respExiste = await fetch(`${API_URL}/api/comisiones/equipo/${equipoGuardado.id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const existe = await respExiste.json();
      if (existe && existe.id) {
        // Ya existe la comisión, no crear
        return true;
      }

      // 2️⃣ Obtener configuración de comision_armado desde el backend
      let monto = 20; // valor por defecto
      try {
        const respConfig = await fetch(`${API_URL}/api/configuraciones/comision_armado`, {
          credentials: "include",
        });
        if (respConfig.ok) {
          const data = await respConfig.json();
          const parsed = parseFloat(data?.valor);
          if (!isNaN(parsed)) monto = parsed;
        } else {
          console.warn("⚠️ No se pudo obtener comision_armado, usando valor por defecto (20)");
        }
      } catch (err) {
        console.error("Error al obtener configuración de comisión:", err);
      }

      // 3️⃣ Crear la comisión con el valor obtenido
      const respCrear = await fetch(`${API_URL}/api/comisiones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          usuario_id,
          venta_id: null,
          mantenimiento_id: null,
          monto,
          fecha_creacion: new Date().toISOString(),
          equipo_id: equipoGuardado.id,
        }),
      });

      if (respCrear.ok) {
        //console.log(`✅ Comisión por armado generada correctamente ($${monto})`);
        return true;
      } else {
        console.error("❌ Error al generar comisión por armado");
        return false;
      }
    } catch (err) {
      console.error("Error generando comisión:", err);
      return false;
    }
  };

  const guardarRevision = async (data:any) => {
    try {
      const loteObjeto = lotes.find(l => l.etiqueta === data.lote);
      if (!loteObjeto) throw new Error('Lote no válido');

      let respEquipo, equipoGuardado;

      // --- ARMADO DEL PAYLOAD para POST/PUT ---
      const equipoPayload = {
        nombre: data.specs.modelo,
        descripcion: `Procesador: ${data.specs.procesador}. Observaciones: ${data.specs.observaciones}`,
        procesador: data.specs.procesador,
        tipo: "equipo",
        lote_etiqueta_id: data.lote_etiqueta_id,
        estado_id: data.estado_id,
        cantidad: 1,
        sucursal_id: sucursalId, 
        tecnico_id: usuarioId,
        ramModules: data.ramModules.filter((mod:any) => mod.memoria_ram_id),
        storages: data.storages.filter((sto:any) => sto.almacenamiento_id),
      };

      // --- ACTUALIZAR O CREAR ---
      if (equipoEncontrado) {
        respEquipo = await fetch(`${API_URL}/api/equipos/${equipoEncontrado.id}`, {
          method: "PUT",
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(equipoPayload),
        });
      } else {
        respEquipo = await fetch(`${API_URL}/api/equipos`, {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...equipoPayload,
            fecha_creacion: new Date().toISOString(),
          }),
        });
      }

      if (!respEquipo.ok) throw new Error('Error guardando equipo');
      equipoGuardado = await respEquipo.json();

      // ----- Inventario -----
      // Ajusta stock según estado
      if (data.estado_id === 4) {
        for (const ram of data.ramModules.filter((mod:any) => mod.memoria_ram_id)) {
          await fetch(`${API_URL}/api/inventario/descontar`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              memoria_ram_id: ram.memoria_ram_id,
              cantidad: ram.cantidad || 1,
              sucursal_id:sucursalId,
            }),
          });
        }
        for (const sto of data.storages.filter((sto:any) => sto.almacenamiento_id)) {
          await fetch(`${API_URL}/api/inventario/descontar`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              almacenamiento_id: sto.almacenamiento_id,
              cantidad: sto.cantidad || 1,
              sucursal_id:sucursalId,
            }),
          });
        }  
        try {
          const response = await fetch(`${API_URL}/api/inventario/registrar-equipo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              equipo_id: equipoGuardado.id, 
              sucursal_id: sucursalId,
              precio: 0,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("❌ Error registrando equipo en inventario:", errorData);
          } else {
            console.log("✅ Equipo registrado en inventario correctamente.");
          }
        } catch (error) {
          console.error("⚠️ Error en la petición de registro de inventario:", error);
        }
      } else {
        for (const ram of data.ramModules.filter((mod:any) => mod.memoria_ram_id)) {
          const body = {
            tipo: "RAM",
            especificacion: "",
            cantidad: ram.cantidad || 1,
            estado: "usado",
            fecha_creacion: new Date().toISOString(),
            memoria_ram_id: ram.memoria_ram_id,
            almacenamiento_id: null,
            sucursal_id: sucursalId,
          };
          await fetch(`${API_URL}/api/inventario`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
          });
        }
        for (const sto of data.storages.filter((sto:any) => sto.almacenamiento_id)) {
          const body = {
            tipo: "Almacenamiento",
            especificacion: "",
            cantidad: sto.cantidad || 1,
            estado: "usado",
            fecha_creacion: new Date().toISOString(),
            memoria_ram_id: null,
            almacenamiento_id: sto.almacenamiento_id,
            sucursal_id: sucursalId,
          };
          await fetch(`${API_URL}/api/inventario`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
          });
        }
      }

      return { success: true, equipo: equipoGuardado };
    } catch (error) {
      console.error("Error guardando revisión:", error);
      return { success: false, error };
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedLote || !selectedSerialId || !specs.modelo || !specs.procesador || !selectedEstadoId) {
      return Swal.fire({
        icon: "warning",
        title: "Campos requeridos",
        text: "Completa todos los campos obligatorios.",
      });
    }

    // Solo enviar los arrays de módulos/discos seleccionados con tipo
    const dataAGuardar = {
      lote: selectedLote,
      lote_etiqueta_id: selectedSerialId,
      specs,
      estado_id: selectedEstadoId,
      tecnico_id: usuarioId,
      ramModules: ramModules
        .filter((mod) => mod.memoria_ram_id)
        .map((mod) => ({
          memoria_ram_id: mod.memoria_ram_id,
          cantidad: mod.cantidad || 1,
          slot: mod.slot || null
        })),
      storages: storages
        .filter((sto) => sto.almacenamiento_id)
        .map((sto) => ({
          almacenamiento_id: sto.almacenamiento_id,
          rol: sto.rol || null,
          capacidad_override: sto.capacidad_override || null,
          orden: sto.orden || null
        }))
    };

    if (selectedEstadoId === 4) {
      // Validar que haya al menos un módulo RAM y un almacenamiento seleccionado
      const tieneRam = ramModules.some((mod) => mod.memoria_ram_id);
      const tieneAlmacenamiento = storages.some((sto) => sto.almacenamiento_id);

      if (!tieneRam || !tieneAlmacenamiento) {
        await Swal.fire({
          icon: "warning",
          title: "Componentes faltantes",
          text: "Debes seleccionar al menos un módulo de RAM y un tipo de almacenamiento antes de guardar.",
        });
        return;
      }

      // Si sí hay componentes, validar stock
      const stockValido = await validarStock(ramModules, storages);
      if (!stockValido) return;
    }

    const resultado = await guardarRevision(dataAGuardar);

    if (resultado.success) {
      if (selectedEstadoId === 4) {
        if (typeof usuarioId === "number") {
        await generarComision(resultado.equipo, usuarioId);
        } else {
          Swal.fire({
            icon: "error",
            title: "Usuario inválido",
            text: "No se puede obtener el identificador del técnico.",
          });
          return;
        }  
      }          
      Swal.fire({
        icon: "success",
        title: "Guardado",
        text: "La especificación ha sido guardada correctamente.",
      });
      setSpecs({ modelo: "", procesador: "", observaciones: "", detalles: "" });
      setSelectedLote("");
      setSelectedEstadoId("");
      setRamModules([{ memoria_ram_id: "" }]);
      setStorages([{ almacenamiento_id: "" }]);
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un error guardando la especificación.",
      });
    }
  };
  
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 70, delay: 0.15 }}
      className="bg-white rounded-xl shadow p-6 max-w-xl"
    >
      <div className="flex items-center gap-2 mb-4 w-full max-w-md">
        <input
          type="text"
          placeholder="Buscar por etiqueta o número de serie"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border rounded-md p-2 flex-grow"
          disabled={camposDeshabilitados}
        />
        <button
          type="button"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md"
          onClick={buscarEquipoPorEtiqueta}
          disabled={camposDeshabilitados}
          aria-label="Buscar equipo"
        >
          🔍
        </button>
      </div>

      <h2 className="text-lg font-semibold mb-4 text-gray-700">Revisar Equipos</h2>
      <form className="flex flex-col gap-3" onSubmit={handleSave}>
        <select
          value={selectedLote}
          onChange={(e) => setSelectedLote(e.target.value)}
          className="border rounded-md p-2 text-gray-600"
        >
          <option value="">Selecciona un lote</option>
          {lotes.map((lote) => (
            <option key={lote.etiqueta} value={lote.etiqueta}>
              {lote.etiqueta}
            </option>
          ))}
        </select>
        <select
          value={selectedSerialId}
          onChange={(e) => setSelectedSerialId(Number(e.target.value))}
          className="border rounded-md p-2 text-gray-600"
          disabled={!seriales.length}
        >
          <option value="">
            {seriales.length ? "Selecciona un número de serie" : "Selecciona primero un lote"}
          </option>
          {seriales.map((serie) => (
            <option key={serie.lote_etiqueta_id} value={serie.lote_etiqueta_id}>
              {serie.etiqueta}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Modelo (Ej: HP 290 G4)"
          className="border rounded-md p-2 text-gray-600"
          value={specs.modelo}
          onChange={(e) => setSpecs({ ...specs, modelo: e.target.value })}
          required
          disabled={camposDeshabilitados}
        />
        <input
          type="text"
          placeholder="Procesador (Ej: Intel i5-8400)"
          className="border rounded-md p-2 text-gray-600"
          value={specs.procesador}
          onChange={(e) => setSpecs({ ...specs, procesador: e.target.value })}
          required
          disabled={camposDeshabilitados}
        />
        <textarea
          placeholder="Observaciones"
          className="border rounded-md p-2 text-gray-600 resize-none"
          rows={2}
          value={specs.observaciones}
          onChange={(e) => setSpecs({ ...specs, observaciones: e.target.value })}
          disabled={camposDeshabilitados}
        />
        <textarea
          placeholder="Detalles técnicos"
          className="border rounded-md p-2 text-gray-600 resize-none"
          rows={3}
          value={specs.detalles}
          onChange={(e) => setSpecs({ ...specs, detalles: e.target.value })}
          disabled={camposDeshabilitados}
        />

        <div className="mt-4">
          <label htmlFor="estado" className="font-semibold mb-1 block">Estado</label>
          <select
            id="estado"
            value={selectedEstadoId}
            onChange={e => setSelectedEstadoId(Number(e.target.value))}
            className="border rounded-md p-2 text-gray-600 w-full"
            required
            disabled={camposDeshabilitados}
          >
            <option value="">Selecciona un estado</option>
            {catalogoEstados.map(estado => (
              <option key={estado.id} value={estado.id}>{estado.nombre}</option>
            ))}
          </select>
        </div>

        {/* Sección dinámica para módulos RAM */}
        <div className="mt-4 border-t pt-4">
          <div className="flex justify-between">
            <span className="font-semibold">
              {selectedEstadoId === 4 ? "Módulos RAM incorporado" : "Módulos RAM retirados"}
            </span>
            <button type="button" className="text-indigo-600" onClick={addRamModule}>
              + Añadir módulo
            </button>
          </div>
            {ramModules.map((mod, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row gap-2 mt-2 items-stretch">
              <select
                className="border rounded-md p-2 w-full"
                value={mod.memoria_ram_id}
                onChange={(e) => updateRamModule(idx, Number(e.target.value))}
                disabled={camposDeshabilitados}
              >
                <option value="">Selecciona tipo RAM</option>
                {ramOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.descripcion}</option>
                ))}
              </select>
              {ramModules.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRamModule(idx)}
                  className="text-red-500 hover:underline"
                >
                  Eliminar
                </button>
              )}
            </div>
          ))}
        </div>

        
        {/* Sección dinámica para dispositivos de almacenamiento */}
        <div className="mt-4 border-t pt-4">
          <div className="flex justify-between">
              <span className="font-semibold">
                {selectedEstadoId === 4 ? "Almacenamiento incorporado" : "Almacenamiento retirado"}
              </span>
              <button type="button" className="text-indigo-600" onClick={addStorage}>
                + Añadir Almacenamiento
              </button>
          </div>
          {storages.map((sto, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row gap-2 mt-2 items-stretch">
              <select
                className="border rounded-md p-2 w-full"
                value={sto.almacenamiento_id}
                onChange={(e) => updateStorage(idx, Number(e.target.value))}
                disabled={camposDeshabilitados}
              >
                <option value="">Selecciona tipo almacenamiento</option>
                {storageOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.descripcion}</option>
                ))}
              </select>
              {storages.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStorage(idx)}
                  className="text-red-500 hover:underline"
                >
                  Eliminar
                </button>
              )}
            </div>
          ))}
        </div>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          className="mt-6 bg-indigo-600 text-white rounded-md py-2 font-medium transition-colors hover:bg-indigo-700"
        >
          Guardar especificación
        </motion.button>
      </form>
    </motion.div>
  );
}
