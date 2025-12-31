'use client'

import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { Equipo } from './Types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (equipos: Equipo[]) => void
  equiposSeleccionados: Equipo[]
}

export default function ModalSeleccionEquiposPedido({
  open,
  onClose,
  onConfirm,
  equiposSeleccionados
}: Props) {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionados, setSeleccionados] = useState<Equipo[]>([])

  useEffect(() => {
    if (!open) return

    setLoading(true)
    fetch(`${API_URL}/api/equipos/para-pedido?q=${busqueda}`, {
      credentials: 'include'
    })
      .then(r => r.json())
      .then(data => {
        setEquipos(data)
        setSeleccionados(equiposSeleccionados)
      })
      .catch(() => {
        Swal.fire('Error', 'No se pudieron cargar los equipos', 'error')
      })
      .finally(() => setLoading(false))
  }, [open, busqueda])

  const toggleEquipo = (equipo: Equipo) => {
    const existe = seleccionados.some(e => e.id === equipo.id)
    if (existe) {
      setSeleccionados(prev => prev.filter(e => e.id !== equipo.id))
    } else {
      setSeleccionados(prev => [...prev, equipo])
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Seleccionar equipos para el pedido</h2>

        <input
          type="text"
          placeholder="Buscar por nombre o etiqueta"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-4"
        />

        {loading ? (
          <p className="text-center text-gray-500">Cargando equipos...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
            {equipos.map(eq => {
              const checked = seleccionados.some(e => e.id === eq.id)
              return (
                <div
                  key={eq.id}
                  className={`border rounded-lg p-3 cursor-pointer ${
                    checked ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleEquipo(eq)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{eq.nombre}</p>
                      <p className="text-xs text-gray-500">Etiqueta: {eq.etiqueta}</p>
                      <p className="text-xs text-gray-500">Sucursal: {eq.sucursal_nombre ?? 'N/A'}</p>
                    </div>
                    <input type="checkbox" checked={checked} readOnly />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (seleccionados.length === 0) {
                Swal.fire('Atención', 'Selecciona al menos un equipo', 'warning')
                return
              }
              onConfirm(seleccionados)
              onClose()
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Agregar equipos
          </button>
        </div>
      </div>
    </div>
  )
}
