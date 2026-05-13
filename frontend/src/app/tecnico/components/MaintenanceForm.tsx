'use client'
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useUser } from '@/context/UserContext'

import { API_URL } from '@/utils/api'
import { toDateString } from '@/utils/fecha'

export default function MaintenanceForm() {
  const [data, setData] = useState({
    equipo: "",
    detalle: "",
    fecha: "",
    tecnico: "",
    tipoMantenimiento: "",
    otroDescripcion: "",
    otroCosto: ""
  });

  const [tecnicoId, setTecnicoId] = useState<number | null>(null);
  const [catalogos, setCatalogos] = useState<any[]>([]);
  const [selectedCosto, setSelectedCosto] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const { user, loading: userLoading } = useUser()

  useEffect(() => {
    if (!user) return

    setData(prev => ({
      ...prev,
      fecha: toDateString(),
      tecnico: user.nombre
    }))

    setTecnicoId(user.id)
    setSucursalId(user.sucursal_id)

    setLoading(false) // loading del formulario
  }, [user])


  // --- Cargar catálogo ---
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const res = await fetch(`${API_URL}/api/catalogoMantenimiento`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          const lista = [...data, { id: "otro", descripcion: "Otro", costo: 0 }];
          setCatalogos(lista);
        }
      } catch (err) {
        console.error("Error cargando catálogo:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalogos();
  }, []);

  // --- Cambiar tipo mantenimiento ---
  const handleTipoChange = (value: string) => {
    setData({ ...data, tipoMantenimiento: value });
    if (value === "otro") {
      setSelectedCosto(null);
    } else {
      const encontrado = catalogos.find((c) => c.id === parseInt(value));
      setSelectedCosto(encontrado ? encontrado.costo : null);
    }
  };

  const generarComisionMantenimiento = async (
    mantenimiento: any,
    tecnicoId: any,
    costo: number
  ) => {
    try {
      // 🔹 1. Obtener configuración desde el backend
      const respConfig = await fetch(`${API_URL}/api/configuraciones/comision_mantenimiento`, {
        credentials: "include",
      });

      let tasa = 0.03; // valor por defecto

      if (respConfig.ok) {
        const data = await respConfig.json();
        if (data?.valor) {
          const parsed = parseFloat(data.valor);
          if (!isNaN(parsed)) tasa = parsed; // ya guardas el valor como 0.3 o 0.03 en BD
        }
      } else {
        console.warn("⚠️ No se pudo obtener la configuración de comisión, usando valor por defecto (3%)");
      }

      // 🔹 2. Calcular comisión
      const comision = costo * tasa;

      // 🔹 3. Registrar comisión
      const respCrear = await fetch(`${API_URL}/api/comisiones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          usuario_id: tecnicoId,
          venta_id: null,
          mantenimiento_id: mantenimiento.id,
          monto: comision,
          fecha_creacion: new Date().toISOString(),
          equipo_id: mantenimiento.equipo_id || null,
        }),
      });

      if (respCrear.ok) {
        //console.log(`✅ Comisión generada correctamente (${(tasa * 100).toFixed(2)}%)`);
        return true;
      } else {
        console.error("❌ Error al generar comisión");
        return false;
      }
    } catch (err) {
      console.error("Error generando comisión:", err);
      return false;
    }
  };

  // --- Enviar formulario ---
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!data.fecha || !data.detalle || !tecnicoId || !data.tipoMantenimiento) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos requeridos.'
      });
      return;
    }

    let catalogoId = data.tipoMantenimiento;

    try {
      if (catalogoId === "otro") {
        if (!data.otroDescripcion || !data.otroCosto) {
          Swal.fire({
            icon: 'warning',
            title: 'Datos faltantes',
            text: 'Debes proporcionar la descripción y el costo del nuevo mantenimiento.'
          });
          return;
        }

        const resNuevo = await fetch(`${API_URL}/api/catalogoMantenimiento`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify({
            descripcion: data.otroDescripcion,
            costo: parseFloat(data.otroCosto)
          })
        });

        if (!resNuevo.ok) throw new Error('Error al crear tipo de mantenimiento');
        const nuevoTipo = await resNuevo.json();
        catalogoId = nuevoTipo.id;
      }

      const body = {
        fecha_mantenimiento: data.fecha,
        detalle: data.detalle,
        tecnico_id: tecnicoId,
        sucursal_id: sucursalId,
        catalogo_id: catalogoId
      };

      const res = await fetch(`${API_URL}/api/mantenimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(body),
      });      

      if (res.ok) {
         const mantenimiento = await res.json();

        // Generar comisión automáticamente
        const costoMantenimiento = selectedCosto || 0;
        await generarComisionMantenimiento(mantenimiento, tecnicoId, costoMantenimiento);

        Swal.fire({
          icon: 'success',
          title: 'Mantenimiento guardado',
          text: 'El mantenimiento ha sido registrado correctamente',
        });
        setData(prev => ({
          ...prev,
          equipo: "",
          detalle: "",
          tipoMantenimiento: "",
          otroDescripcion: "",
          otroCosto: "",
          fecha: data.fecha, 
          tecnico: data.tecnico
        }));
        setSelectedCosto(null);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar el mantenimiento',
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'Hubo un problema con la solicitud al servidor',
      });
    }
  };

  if (loading) return <p>Cargando catálogo...</p>;

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 70, delay: 0.1 }}
      className="bg-white rounded-xl shadow p-6 max-w-xl"
    >
      <h2 className="text-lg font-semibold mb-4 text-gray-700">Registrar mantenimiento</h2>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <input
          required
          type="date"
          className="border rounded-md p-2 text-gray-600"
          value={data.fecha}
          onChange={e => setData({ ...data, fecha: e.target.value })}
        />

        <select
          required
          className="border rounded-md p-2 text-gray-600"
          value={data.tipoMantenimiento}
          onChange={e => handleTipoChange(e.target.value)}
        >
          <option value="">Seleccionar tipo de mantenimiento</option>
          {catalogos.map((item) => (
            <option key={item.id} value={item.id}>
              {item.descripcion}
            </option>
          ))}
        </select>

        {/* Mostrar costo dependiendo de la selección */}
        {data.tipoMantenimiento && data.tipoMantenimiento !== "otro" && (
          <input
            type="text"
            readOnly
            className="border rounded-md p-2 text-gray-600 bg-gray-100"
            value={
              selectedCosto !== null && !isNaN(Number(selectedCosto))
                ? `$${Number(selectedCosto).toFixed(2)}`
                : "Sin costo definido"
            }
          />
        )}

        {data.tipoMantenimiento === "otro" && (
          <>
            <input
              type="text"
              placeholder="Descripción del nuevo mantenimiento"
              className="border rounded-md p-2 text-gray-600"
              value={data.otroDescripcion}
              onChange={e => setData({ ...data, otroDescripcion: e.target.value })}
            />
            <input
              type="number"
              placeholder="Costo del nuevo mantenimiento"
              className="border rounded-md p-2 text-gray-600"
              value={data.otroCosto}
              onChange={e => setData({ ...data, otroCosto: e.target.value })}
            />
          </>
        )}

        <textarea
          required
          placeholder="Detalle técnico"
          className="border rounded-md p-2 text-gray-600 resize-none"
          rows={3}
          value={data.detalle}
          onChange={e => setData({ ...data, detalle: e.target.value })}
        />

        <input
          type="text"
          placeholder="Técnico responsable"
          className="border rounded-md p-2 text-gray-600"
          value={data.tecnico}
          readOnly
        />

        <motion.button
          whileTap={{ scale: 0.97 }}
          className="mt-2 bg-indigo-600 text-white rounded-md py-2 font-medium transition-colors hover:bg-indigo-700"
          type="submit"
        >
          Guardar mantenimiento
        </motion.button>
      </form>
    </motion.div>
  );
}
