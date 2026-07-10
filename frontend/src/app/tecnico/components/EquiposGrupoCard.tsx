'use client'

const ESTADO_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Por revisar',      color: 'bg-yellow-100 text-yellow-800' },
  2: { label: 'Revisado',         color: 'bg-blue-100 text-blue-800'   },
  3: { label: 'No funciona',      color: 'bg-red-100 text-red-800'     },
  4: { label: 'Armado',           color: 'bg-green-100 text-green-800' },
}

type Props = {
  nombre: string
  procesador: string
  sucursal_nombre?: string
  cantidad: number
  estadoConteos: Record<number, number>
  onClick: () => void
}

export default function EquiposGrupoCard({
  nombre,
  procesador,
  sucursal_nombre,
  cantidad,
  estadoConteos,
  onClick,
}: Props) {
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-lg bg-white shadow-sm cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all border border-transparent hover:border-gray-200"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-gray-800 leading-tight">{nombre}</span>
        <span className="text-2xl font-bold text-gray-300 shrink-0">{cantidad}</span>
      </div>
      <span className="text-xs text-gray-500 block mt-1">Procesador: {procesador}</span>
      <span className="text-xs text-gray-500 block">Sucursal: {sucursal_nombre ?? 'Sin asignar'}</span>
      <div className="flex flex-wrap gap-1 mt-3">
        {Object.entries(estadoConteos).map(([estadoId, count]) => {
          const config = ESTADO_CONFIG[Number(estadoId)]
          if (!config || count === 0) return null
          return (
            <span
              key={estadoId}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}
            >
              {count} {config.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
