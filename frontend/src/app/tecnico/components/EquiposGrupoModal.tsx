'use client'
import { Equipo } from '../../components/Types'

const ESTADO_NOMBRES: Record<number, string> = {
  1: 'Por revisar',
  2: 'Revisado - Por armar',
  3: 'No funciona',
  4: 'Armado',
}

type Props = {
  nombre: string
  procesador: string
  sucursal_nombre?: string
  equipos: Equipo[]
  onClose: () => void
  onAbrirDetalle: (equipo: Equipo) => void
}

export default function EquiposGrupoModal({
  nombre,
  procesador,
  sucursal_nombre,
  equipos,
  onClose,
  onAbrirDetalle,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b">
          <div>
            <p className="font-semibold text-gray-800">{nombre}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {procesador} · {sucursal_nombre ?? 'Sin sucursal'} · {equipos.length} equipos
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none ml-4 mt-0.5"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="px-4 py-2 text-left font-medium">Etiqueta</th>
                <th className="px-4 py-2 text-left font-medium">RAM</th>
                <th className="px-4 py-2 text-left font-medium">Almacenamiento</th>
                <th className="px-4 py-2 text-left font-medium">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {equipos.map((eq) => (
                <tr key={eq.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">{eq.etiqueta}</td>
                  <td className="px-4 py-2 text-gray-600 text-xs">
                    {eq.memorias_ram?.join(', ') || '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-600 text-xs">
                    {eq.almacenamientos?.join(', ') || '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {eq.estado_id ? (ESTADO_NOMBRES[eq.estado_id] ?? '—') : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => onAbrirDetalle(eq)}
                      className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                    >
                      Detalle →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
