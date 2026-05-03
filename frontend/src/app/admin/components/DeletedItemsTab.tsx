'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaTrashAlt,
  FaSearch,
  FaDesktop,
  FaBarcode,
  FaUser,
  FaCalendarAlt,
} from 'react-icons/fa'

type DeletedItem = {
  id: number
  tipo_articulo: string
  descripcion: string
  especificaciones: string | null
  serie: string | null
  codigo_barras: string | null
  precio: string
  sucursal: string
  eliminado_por: string | null
  motivo_eliminacion: string
  fecha_eliminacion: string
}

export default function DeletedItemTabs() {

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  const [items, setItems] = useState<DeletedItem[]>([])
  const [loading, setLoading] = useState(true)

  const [sucursal, setSucursal] = useState('')

  // 🔹 Filtros
  const [search, setSearch] = useState('')

  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  })

  const [to, setTo] = useState(() => {
    const d = new Date()

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  })

  const obtenerItems = async () => {
    try {

      setLoading(true)

      const params = new URLSearchParams()

      if (from) params.append('from', from)
      if (to) params.append('to', to)

      const resp = await fetch(
        `${API_URL}/api/reportes/articulos-eliminados?${params.toString()}`,
        {
          credentials: 'include'
        }
      )

      if (!resp.ok) {
        throw new Error('Error obteniendo artículos eliminados')
      }

      const data = await resp.json()

      setItems(data)

    } catch (error) {

      console.error(error)

    } finally {

      setLoading(false)

    }
  }

  useEffect(() => {
    obtenerItems()
  }, [from, to])

  // 🔥 Búsqueda local
  const filtered = useMemo(() => {

    const term = search.toLowerCase()

    return items.filter((i) => {

        const matchesSearch =
        i.descripcion?.toLowerCase().includes(term) ||
        i.tipo_articulo?.toLowerCase().includes(term) ||
        i.sucursal?.toLowerCase().includes(term) ||
        i.serie?.toLowerCase().includes(term) ||
        i.eliminado_por?.toLowerCase().includes(term)

        const matchesSucursal =
        !sucursal || i.sucursal === sucursal

        return matchesSearch && matchesSucursal

    })

  }, [items, search, sucursal])

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >

      {/* HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">

        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            Artículos eliminados
          </h3>

          <p className="text-sm text-gray-500">
            Historial de eliminaciones del inventario con trazabilidad.
          </p>
        </div>

        {/* FILTROS */}
        <div className="flex flex-col xl:flex-row gap-3">

        {/* Buscar */}
        <div className="relative w-full xl:w-72">            
            <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="
                w-full
                pl-12 pr-4 py-2.5
                rounded-xl border text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                bg-white
                input-minimal
                "
            />
        </div>

        {/* Filtro sucursal */}
        <select
            value={sucursal}
            onChange={(e) => setSucursal(e.target.value)}
            className="
            border rounded-xl px-4 py-2.5 text-sm
            bg-white text-gray-700
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            input-minimal
            "
        >
            <option value="">Todas las sucursales</option>

            <option value="Sucursal Saltillo">
            Sucursal Saltillo
            </option>

            <option value="Sucursal Monterrey">
            Sucursal Monterrey
            </option>
        </select>

        {/* Fecha inicio */}
        <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="
            border rounded-xl px-4 py-2.5 text-sm
            bg-white
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            input-minimal
            "
        />

        {/* Fecha fin */}
        <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="
            border rounded-xl px-4 py-2.5 text-sm
            bg-white
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            input-minimal
            "
        />

        </div>

      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <StatCard
          title="Total eliminados"
          value={filtered.length}
        />

        <StatCard
          title="Equipos armados"
          value={
            filtered.filter(
              i => i.tipo_articulo === 'Equipo Armado'
            ).length
          }
        />

        <StatCard
          title="Recepción directa"
          value={
            filtered.filter(
              i => i.tipo_articulo === 'Recepción Directa'
            ).length
          }
        />

      </div>

      {/* LOADING */}
      {loading && (
        <div className="space-y-3 animate-pulse">

          {[1,2,3,4].map(i => (
            <div
              key={i}
              className="h-28 rounded-xl bg-gray-100 border"
            />
          ))}

        </div>
      )}

      {/* EMPTY */}
      {!loading && filtered.length === 0 && (
        <div
          className="
            border rounded-xl bg-gray-50
            p-10 text-center
          "
        >
          <FaTrashAlt className="mx-auto text-4xl text-gray-300 mb-3" />

          <h4 className="font-semibold text-gray-600">
            No hay artículos eliminados
          </h4>

          <p className="text-sm text-gray-500 mt-1">
            No se encontraron registros para el filtro seleccionado.
          </p>
        </div>
      )}

      {/* LISTA */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-4">

          <AnimatePresence>

            {filtered.map((item) => (

              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="
                  border rounded-2xl p-5 bg-white shadow-sm
                  hover:shadow-md transition
                  input-minimal
                "
              >

                {/* HEADER */}
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">

                  <div className="space-y-3 flex-1">

                    {/* Tipo */}
                    <div className="flex items-center gap-2">

                      <div
                        className="
                          w-9 h-9 rounded-lg
                          bg-red-100 text-red-600
                          flex items-center justify-center
                        "
                      >
                        <FaDesktop />
                      </div>

                      <div>

                        <p className="text-xs text-gray-500">
                          {item.tipo_articulo}
                        </p>

                        <h4 className="font-semibold text-gray-700">
                          {item.descripcion}
                        </h4>

                      </div>

                    </div>

                    {/* Especificaciones */}
                    {item.especificaciones && (
                      <div className="text-sm text-gray-500">
                        {item.especificaciones}
                      </div>
                    )}

                    {/* Metadata */}
                    <div
                      className="
                        flex flex-wrap gap-4
                        text-xs text-gray-500
                      "
                    >

                      {item.serie && (
                        <div className="flex items-center gap-1">
                          <FaBarcode />
                          <span>{item.serie}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <FaUser />
                        <span>
                          {item.eliminado_por || 'Sin registro'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <FaCalendarAlt />
                        <span>
                          {new Date(
                            item.fecha_eliminacion
                          ).toLocaleString()}
                        </span>
                      </div>

                    </div>

                  </div>

                  {/* PRECIO */}
                  <div className="text-right">

                    <p className="text-xs text-gray-500">
                      Precio
                    </p>

                    <p className="text-xl font-bold text-indigo-600">
                      ${Number(item.precio).toLocaleString()}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      {item.sucursal}
                    </p>

                  </div>

                </div>

                {/* MOTIVO */}
                <div
                  className="
                    mt-5 p-4 rounded-xl
                    bg-red-50 border border-red-100
                  "
                >

                  <p className="text-xs font-medium text-red-500 mb-1">
                    Motivo de eliminación
                  </p>

                  <p className="text-sm text-red-700">
                    {item.motivo_eliminacion}
                  </p>

                </div>

              </motion.div>

            ))}

          </AnimatePresence>

        </div>
      )}

    </motion.div>
  )
}

/* 🔹 CARD */
function StatCard({
  title,
  value
}: {
  title: string
  value: number
}) {

  return (
    <div
      className="
        bg-gray-50 border rounded-xl
        p-4 input-minimal
      "
    >

      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="text-2xl font-bold text-indigo-600 mt-1">
        {value.toLocaleString()}
      </p>

    </div>
  )
}