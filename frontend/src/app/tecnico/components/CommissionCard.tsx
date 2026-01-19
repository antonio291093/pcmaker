'use client'
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useUser } from '@/context/UserContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function CommissionsCard() {
  const { user, loading: userLoading } = useUser()

  const [comisiones, setComisiones] = useState<any[]>([])
  const [totalSemana, setTotalSemana] = useState<number>(0)

  if (userLoading) return <p>Cargando comisiones...</p>
  if (!user) return null

  const usuarioId = user.id

  useEffect(() => {
    if (!usuarioId) return

    fetch(`${API_URL}/api/comisiones/semana/${usuarioId}`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        const comisionesValidas = data.filter((x: any) => x.id !== null)

        setComisiones(comisionesValidas)

        const total = comisionesValidas.reduce(
          (acc: number, c: any) => acc + Number(c.monto),
          0
        )

        setTotalSemana(total)
      })
  }, [usuarioId])

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 70, delay: 0.2 }}
      className="bg-white rounded-xl shadow p-4 sm:p-6 w-full max-w-full"
    >
      <h2 className="text-lg font-semibold mb-4 text-gray-700">
        Comisiones de ventas (semana)
      </h2>

      {/* === RESUMEN === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-indigo-50 rounded-lg text-center">
          <span className="text-sm text-gray-500">Total semana</span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">
            ${totalSemana.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-4 bg-indigo-50 rounded-lg text-center">
          <span className="text-sm text-gray-500">Ventas comisionadas</span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">
            {comisiones.length}
          </div>
        </div>
      </div>

      {/* === DETALLE === */}
      <div>
        <h3 className="mb-2 text-gray-600 font-medium">
          Detalle de ventas
        </h3>

        <ul className="divide-y divide-gray-200 text-gray-700">
          {comisiones.length === 0 ? (
            <li className="py-2 text-center text-gray-400">
              No hay comisiones esta semana
            </li>
          ) : (
            comisiones.map((c) => (
              <li key={c.id} className="py-3 border-b">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {c.tipo === "venta" && `Venta #${c.venta.id}`}
                    {c.tipo === "armado" && `Armado de equipo`}
                    {c.tipo === "mantenimiento" && `Mantenimiento`}
                  </span>

                  <span className="text-sm">
                    ${Number(c.monto).toFixed(2)} |{" "}
                    {new Date(c.fecha_creacion).toLocaleDateString("es-MX")}
                  </span>
                </div>

                {/* 🔵 DETALLE DE VENTA */}
                {c.tipo === "venta" && (
                  <ul className="ml-4 mt-1 text-sm text-gray-600">
                    {c.venta.items.map((item: any, idx: any) => (
                      <li key={idx}>
                        • {item.nombre} (${item.precio})
                      </li>
                    ))}
                    <li className="font-semibold">
                      Total venta: ${c.venta.total_venta}
                    </li>
                  </ul>
                )}

                {/* 🟢 ARMADO */}
                {c.tipo === "armado" && c.equipo && (
                  <p className="ml-4 text-sm text-gray-600">
                    Equipo: {c.equipo.nombre} (${c.equipo.precio})
                  </p>
                )}

                {/* 🟣 MANTENIMIENTO */}
                {c.tipo === "mantenimiento" && c.mantenimiento && (
                  <p className="ml-4 text-sm text-gray-600">
                    {c.mantenimiento.descripcion}
                  </p>
                )}
              </li>
            ))

          )}
        </ul>
      </div>
    </motion.div>
  )
}
