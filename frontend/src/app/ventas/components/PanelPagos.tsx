'use client'
import { ConfiguracionPago } from '../../components/Types'

interface Pagos {
  efectivo: number
  terminal: number
  transferencia: number
}

interface Props {
  pagos: Pagos
  total: number
  totalPagado: number
  onPagoChange: (metodo: string, value: string) => void
  onPagarTodo: (metodo: 'efectivo' | 'terminal' | 'transferencia') => void
  configTransferencia: ConfiguracionPago | null
  loadingConfig: boolean
}

export default function PanelPagos({
  pagos,
  total,
  totalPagado,
  onPagoChange,
  onPagarTodo,
  configTransferencia,
  loadingConfig,
}: Props) {
  return (
    <>
      <div className="border rounded-md p-3 bg-gray-50 input-minimal">
        <span className="block text-sm font-medium text-gray-700 mb-2">Pagos</span>

        <div className="grid grid-cols-3 gap-3">

          <div>
            <label className="text-xs text-gray-600">Efectivo</label>
            <input
              type="number"
              min="0"
              value={pagos.efectivo}
              onChange={(e) => onPagoChange('efectivo', e.target.value)}
              className="border rounded-md p-2 w-full text-sm input-minimal"
            />
            <button
              type="button"
              onClick={() => onPagarTodo('efectivo')}
              className="w-full bg-green-600 text-white px-3 py-1 rounded-md text-xs hover:bg-green-700 mt-1"
            >
              Pagar todo en efectivo
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-600">Terminal</label>
            <input
              type="number"
              min="0"
              value={pagos.terminal}
              onChange={(e) => onPagoChange('terminal', e.target.value)}
              className="border rounded-md p-2 w-full text-sm input-minimal"
            />
            <button
              type="button"
              onClick={() => onPagarTodo('terminal')}
              className="w-full bg-blue-600 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-700 mt-1"
            >
              Pagar con terminal
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-600">Transferencia</label>
            <input
              type="number"
              min="0"
              value={pagos.transferencia}
              onChange={(e) => onPagoChange('transferencia', e.target.value)}
              className="border rounded-md p-2 w-full text-sm input-minimal"
            />
            <button
              type="button"
              onClick={() => onPagarTodo('transferencia')}
              className="w-full bg-purple-600 text-white px-3 py-1 rounded-md text-xs hover:bg-purple-700 mt-1"
            >
              Pagar con transferencia
            </button>
          </div>

        </div>

        <div className="text-right mt-2 text-sm text-gray-700">
          Pagado: <b>${totalPagado.toFixed(2)}</b>
        </div>

        {totalPagado < total && (
          <div className="text-xs text-red-500 text-right">
            Faltan ${(total - totalPagado).toFixed(2)}
          </div>
        )}
      </div>

      {pagos.transferencia > 0 && (
        <div className="border rounded-md p-3 bg-purple-50 mt-3 input-minimal">
          <h4 className="text-sm font-semibold text-purple-700 mb-2">
            Datos para transferencia
          </h4>

          {loadingConfig && (
            <p className="text-xs text-gray-500">Cargando información bancaria...</p>
          )}

          {!loadingConfig && configTransferencia && (
            <div className="text-sm text-gray-700 space-y-1">
              <p><b>Banco:</b> {configTransferencia.banco}</p>
              <p><b>Titular:</b> {configTransferencia.titular}</p>
              <p><b>Cuenta:</b> {configTransferencia.numero_cuenta}</p>
              <p><b>CLABE:</b> {configTransferencia.clabe}</p>
              {configTransferencia.referencia && (
                <p><b>Referencia:</b> {configTransferencia.referencia}</p>
              )}
            </div>
          )}

          {!loadingConfig && !configTransferencia && (
            <p className="text-xs text-red-500">
              No hay configuración disponible para este tipo de pago.
            </p>
          )}
        </div>
      )}
    </>
  )
}
