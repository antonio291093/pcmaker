'use client'
import { ProductoSeleccionado } from '../../components/SeleccionarProductoModal'
import { ServicioPendiente } from '../../components/ModalSeleccionarServicios'

interface Props {
  productosSeleccionados: ProductoSeleccionado[]
  serviciosSeleccionados: ServicioPendiente[]
  onEliminarProducto: (id: number) => void
  onEliminarServicio: (id: number) => void
  subtotal: number
  iva: number
  total: number
  totalPagado: number
  cambio: number
  requiereFactura: boolean
}

export default function ListaItems({
  productosSeleccionados,
  serviciosSeleccionados,
  onEliminarProducto,
  onEliminarServicio,
  subtotal,
  iva,
  total,
  totalPagado,
  cambio,
  requiereFactura,
}: Props) {
  return (
    <>
      {productosSeleccionados.length > 0 && (
        <div className="border rounded-md p-3 bg-gray-50">
          <h4 className="font-semibold text-gray-700 mb-2">Productos seleccionados</h4>

          <ul className="space-y-2">
            {productosSeleccionados.map((p) => (
              <li
                key={p.id}
                className="flex justify-between items-center text-sm text-gray-700 bg-white p-2 rounded-md border"
              >
                <div>
                  <p className="font-medium">{p.descripcion || p.especificacion}</p>
                  <p className="text-gray-500">
                    {p.cantidadSeleccionada} unidades × ${Number(p.precio || 0).toFixed(2)}
                  </p>
                  <p className="text-gray-600 font-semibold">
                    Subtotal: ${(Number(p.precio || 0) * Number(p.cantidadSeleccionada)).toFixed(2)} MXN
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEliminarProducto(p.id)}
                  className="text-red-500 hover:text-red-700 text-xs font-semibold"
                >
                  ✖
                </button>
              </li>
            ))}
          </ul>

          <div className="text-right mt-3 font-bold text-gray-800">
            {requiereFactura && (
              <>
                <div className="text-sm text-gray-600">
                  Subtotal: ${subtotal.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  IVA (16%): ${iva.toFixed(2)}
                </div>
              </>
            )}
            <div className="text-lg">
              Total: ${total.toFixed(2)} MXN
            </div>
            <div className="mt-1 text-sm text-gray-700">
              Pagado: <b>${totalPagado.toFixed(2)}</b>
            </div>
            {cambio > 0 && (
              <div className="text-green-600 text-sm font-semibold">
                Cambio: ${cambio.toFixed(2)}
              </div>
            )}
            {totalPagado < total && (
              <div className="text-xs text-red-500">
                Faltan ${(total - totalPagado).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      )}

      {serviciosSeleccionados.length > 0 && (
        <div className="border rounded-md p-3 bg-green-50">
          <h4 className="font-semibold text-gray-700 mb-2">Servicios seleccionados</h4>

          <ul className="space-y-2">
            {serviciosSeleccionados.map((s) => (
              <li
                key={s.id}
                className="flex justify-between items-center text-sm bg-white p-2 rounded-md border"
              >
                <div>
                  <p className="font-medium">{s.tipo_mantenimiento}</p>
                  <p className="text-gray-500">{s.detalle}</p>
                  <p className="text-gray-600 font-semibold">
                    ${Number(s.costo).toFixed(2)} MXN
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEliminarServicio(s.id)}
                  className="text-red-500 hover:text-red-700 text-xs font-semibold"
                >
                  ✖
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
