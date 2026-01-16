'use client';
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { useUser } from '@/context/UserContext'
import {
  FaMemory, FaHdd, FaMouse, FaKeyboard, FaHeadphones, FaUsb,
  FaGamepad, FaWifi, FaCamera, FaTools, FaMicrochip, FaQuestionCircle,
} from "react-icons/fa";

interface Producto {
  id: number;
  tipo: string;
  descripcion?: string;
  especificacion?: string;
  cantidad: number;
  estado: string;
  precio?: number | null;
  sku?: string; // 👈 AÑADIR
}

interface EquipoArmado {
  id: number;
  nombre: string;
  procesador: string;
  etiqueta: string;
  cantidad: number;
  estado: string;
  precio?: number | null;
  serie? : string;
  memorias_ram: string[];
  almacenamientos: string[];
}

interface ProductoSeleccionado extends Producto {
  cantidadSeleccionada: number;
  es_equipo: boolean; 
}

interface ModalSeleccionarProductoProps {
  onClose: () => void;
  onSeleccionar: (productos: ProductoSeleccionado[]) => void;
}

export default function ModalSeleccionarProducto({
  onClose,
  onSeleccionar,
}: ModalSeleccionarProductoProps) {
  const [inventario, setInventario] = useState<Producto[]>([]);
  const [equiposArmados, setEquiposArmados] = useState<EquipoArmado[]>([]);
  const [seleccionados, setSeleccionados] = useState<ProductoSeleccionado[]>([]);
  const [loading, setLoading] = useState(true);
  const [sucursalId, setSucursalId] = useState<number | null>(null)
  const [skuBusqueda, setSkuBusqueda] = useState('');
  const [inventarioFiltrado, setInventarioFiltrado] = useState<Producto[]>([]);
  const [equiposArmadosFiltrados, setEquiposArmadosFiltrados] = useState<EquipoArmado[]>([]);
  const { user, loading: userLoading } = useUser()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (userLoading) return
    if (!user) return

    setSucursalId(user.sucursal_id)
  }, [user, userLoading])

  if (userLoading) return null
  if (!user) return null

  // 2️⃣ Cargar inventario
  const cargarInventario = async () => {
    const resp = await fetch(`${API_URL}/api/inventario?sucursal_id=${sucursalId}`, {
      credentials: "include",
    });
    if (!resp.ok) throw new Error("Error inventario");
    return await resp.json();
  };

  // 3️⃣ Cargar equipos armados
  const cargarEquiposArmados = async () => {
    const resp = await fetch(`${API_URL}/api/inventario/equipos-armados?sucursal_id=${sucursalId}`, {
      credentials: "include",
    });
    if (!resp.ok) throw new Error("Error equipos armados");
    return await resp.json();
  };

  // 4️⃣ Cargar datos cuando haya sucursal
  useEffect(() => {
    if (!sucursalId) return;

    (async () => {
      setLoading(true);
      try {
        const [inv, eqArmados] = await Promise.all([
          cargarInventario(),
          cargarEquiposArmados(),
        ]);

        setInventario(inv);
        setEquiposArmados(eqArmados);
        setInventarioFiltrado(inv);
        setEquiposArmadosFiltrados(eqArmados);
      } catch (err) {
        console.error("Error cargando inventario/equipos:", err);
        Swal.fire("Error", "No se pudieron cargar los productos", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [sucursalId]);

  useEffect(() => {
    const valor = skuBusqueda.trim();

    if (!valor) {
      setInventarioFiltrado(inventario);
      setEquiposArmadosFiltrados(equiposArmados);
      return;
    }

    // 🔎 Filtra inventario por SKU
    setInventarioFiltrado(
      inventario.filter(item =>
        item.sku?.toLowerCase() === valor.toLowerCase()
      )
    );

    // 🔎 Filtra equipos armados por serie
    setEquiposArmadosFiltrados(
      equiposArmados.filter(eq =>
        eq.serie?.toLowerCase() === valor.toLowerCase()
      )
    );
  }, [skuBusqueda, inventario, equiposArmados]);


  const obtenerIcono = (tipo: string, especificacion?: string) => {
    const texto = `${tipo} ${especificacion || ""}`.toLowerCase();
    if (texto.includes("ram") || texto.includes("ddr")) return <FaMemory className="text-indigo-600 text-3xl" />;
    if (texto.includes("ssd") || texto.includes("hdd") || texto.includes("disco")) return <FaHdd className="text-amber-600 text-3xl" />;
    if (texto.includes("mouse")) return <FaMouse className="text-blue-600 text-3xl" />;
    if (texto.includes("teclado")) return <FaKeyboard className="text-gray-700 text-3xl" />;
    if (texto.includes("audifono") || texto.includes("headset")) return <FaHeadphones className="text-pink-600 text-3xl" />;
    if (texto.includes("gamepad") || texto.includes("control")) return <FaGamepad className="text-purple-600 text-3xl" />;
    if (texto.includes("usb") || texto.includes("adaptador")) return <FaUsb className="text-orange-600 text-3xl" />;
    if (texto.includes("router") || texto.includes("wifi")) return <FaWifi className="text-green-600 text-3xl" />;
    if (texto.includes("camara")) return <FaCamera className="text-rose-600 text-3xl" />;
    if (texto.includes("cable") || texto.includes("hdmi")) return <FaTools className="text-teal-600 text-3xl" />;
    if (texto.includes("fuente") || texto.includes("psu")) return <FaMicrochip className="text-green-600 text-3xl" />;
    return <FaQuestionCircle className="text-gray-400 text-3xl" />;
  };

  const toggleSeleccion = (producto: ProductoSeleccionado) => {
    if (producto.cantidad <= 0) {
      Swal.fire({
        icon: "error",
        title: "Sin stock",
        text: `El producto "${producto.descripcion}" no tiene unidades disponibles.`,
      });
      return;
    }

    if (!producto.precio || producto.precio <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Precio no asignado",
        text: `Asigna un precio al producto antes de usarlo.`,
      });
      return;
    }

    setSeleccionados((prev) => {
      const existe = prev.find((p) => p.id === producto.id);
      if (existe) return prev.filter((p) => p.id !== producto.id);
      return [...prev, { ...producto, cantidadSeleccionada: 1 }];
    });
  };

  const actualizarCantidad = (id: number, nuevaCantidad: number) => {
    setSeleccionados((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, cantidadSeleccionada: Math.max(1, Math.min(nuevaCantidad, p.cantidad)) }
          : p
      )
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center text-gray-500">
          Cargando productos...
        </div>
      </div>
    );
  }

  const totalSeleccionado = seleccionados.reduce(
    (acc, p) => acc + (Number(p.precio) || 0) * p.cantidadSeleccionada,
    0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-6 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col"
      >
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Seleccionar productos
        </h2>

        <div className="relative mb-3 max-w-sm">
          <input
            type="text"
            placeholder="Escanear o escribir SKU"
            value={skuBusqueda}
            onChange={(e) => setSkuBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSkuBusqueda('');
            }}
            className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm
                      focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* INVENTARIO */}
        <h3 className="text-sm font-bold text-gray-600 mt-2 mb-1">
          Inventario general
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 max-h-[35vh]">          
          {inventarioFiltrado.map((producto) => {
            const seleccionado = seleccionados.find((p) => p.id === producto.id);
            return (
              <motion.div
                key={producto.id}
                whileHover={{ scale: 1.02 }}
                onClick={() =>
                  toggleSeleccion({
                    id: producto.id,
                    tipo: producto.tipo,
                    descripcion: producto.descripcion,
                    especificacion: producto.especificacion,
                    cantidad: producto.cantidad,
                    estado: producto.estado,
                    precio: producto.precio,
                    cantidadSeleccionada: 1,
                    es_equipo: false,
                  })
                }
                className={`cursor-pointer p-4 rounded-lg border transition-all flex flex-col items-start shadow-sm ${
                  seleccionado
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  {obtenerIcono(producto.tipo, producto.descripcion)}
                  <span className="font-semibold text-gray-800">
                    {producto.descripcion}
                  </span>
                </div>

                <span className="text-sm text-gray-600">Stock: {producto.cantidad}</span>
                <span className="text-sm text-gray-700">
                  💲{" "}
                  {producto.precio
                    ? Number(producto.precio).toFixed(2)
                    : "Sin precio"}
                </span>

                {seleccionado && (
                  <input
                    type="number"
                    min={1}
                    max={producto.cantidad}
                    value={seleccionado.cantidadSeleccionada}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      actualizarCantidad(
                        producto.id,
                        parseInt(e.target.value)
                      )
                    }
                    className="mt-3 w-full border rounded-md p-1 text-center text-sm"
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* EQUIPOS ARMADOS */}
        <h3 className="text-sm font-bold text-gray-600 mt-4 mb-1">
          Equipos armados
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 max-h-[35vh]">          
          {equiposArmadosFiltrados.map((equipo) => {
            const seleccionado = seleccionados.find((p) => p.id === equipo.id);
            return (
              <motion.div
                key={equipo.id}
                whileHover={{ scale: 1.02 }}
                onClick={() =>
                  toggleSeleccion({
                    id: equipo.id,
                    tipo: "Equipo Armado",
                    descripcion: equipo.nombre,
                    especificacion: equipo.procesador,
                    cantidad: equipo.cantidad,
                    estado: equipo.estado,
                    precio: equipo.precio,
                    cantidadSeleccionada: 1,
                    es_equipo: true,
                  })
                }
                className={`cursor-pointer p-4 rounded-lg border transition-all flex flex-col items-start shadow-sm ${
                  seleccionado
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <FaMicrochip className="text-green-700 text-3xl" />
                  <span className="font-semibold text-gray-800">
                    {equipo.nombre}
                  </span>
                </div>

                <span className="text-sm text-gray-600">
                  Procesador: {equipo.procesador}
                </span>

                <span className="text-sm text-gray-600">Stock: {equipo.cantidad}</span>
                <span className="text-sm text-gray-700">
                  💲{" "}
                  {equipo.precio
                    ? Number(equipo.precio).toFixed(2)
                    : "Sin precio"}
                </span>

                <span className="text-xs text-gray-500 mt-1">
                  RAM: {equipo.memorias_ram.join(", ")}
                </span>

                <span className="text-xs text-gray-500">
                  Almacenamiento: {equipo.almacenamientos.join(", ")}
                </span>

                {seleccionado && (
                  <input
                    type="number"
                    min={1}
                    max={equipo.cantidad}
                    value={seleccionado.cantidadSeleccionada}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      actualizarCantidad(
                        equipo.id,
                        parseInt(e.target.value)
                      )
                    }
                    className="mt-3 w-full border rounded-md p-1 text-center text-sm"
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* BOTONES */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
          >
            Cancelar
          </button>

          <button
            disabled={seleccionados.length === 0}
            onClick={() => onSeleccionar(seleccionados)}
            className={`px-4 py-2 rounded-lg shadow text-white ${
              seleccionados.length > 0
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {seleccionados.length > 0
              ? `Seleccionar (${seleccionados.length}) - Total: $${totalSeleccionado.toFixed(
                  2
                )}`
              : "Seleccionar (0)"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
