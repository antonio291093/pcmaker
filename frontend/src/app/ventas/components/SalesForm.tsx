'use client'
import { motion } from 'framer-motion'
import { FaShoppingCart } from 'react-icons/fa'
import ModalSeleccionarProducto from '../../components/SeleccionarProductoModal'
import ModalSeleccionarServicios from '../../components/ModalSeleccionarServicios'
import { useVenta } from '../hooks/useVenta'
import ListaItems from './ListaItems'
import PanelPagos from './PanelPagos'

export default function SalesForm() {
  const {
    userLoading,
    user,
    formData,
    pagos,
    productosSeleccionados,
    serviciosSeleccionados,
    mostrarModal,
    mostrarModalServicios,
    loading,
    configTransferencia,
    loadingConfig,
    subtotal,
    iva,
    total,
    totalPagado,
    cambio,
    setProductosSeleccionados,
    setServiciosSeleccionados,
    setMostrarModal,
    setMostrarModalServicios,
    handleChange,
    setRequiereFactura,
    handlePagoChange,
    pagarTodo,
    eliminarProducto,
    eliminarServicio,
    handleSubmit,
  } = useVenta()

  if (userLoading) return <p>Cargando usuario...</p>
  if (!user) return null

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className="bg-white rounded-xl shadow p-6 max-w-xl"
    >
      <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
        <FaShoppingCart className="text-indigo-600" /> Registrar venta
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <input
          type="text"
          name="cliente"
          placeholder="Nombre cliente"
          value={formData.cliente}
          onChange={handleChange}
          className="border rounded-md p-2 text-gray-600 input-minimal"
        />

        <input
          type="tel"
          name="telefono"
          placeholder="Ej. 8441234567"
          value={formData.telefono}
          onChange={handleChange}
          className="border rounded-md p-2 text-gray-600 input-minimal"
        />

        <input
          type="email"
          name="correo"
          placeholder="cliente@correo.com"
          value={formData.correo}
          onChange={handleChange}
          className="border rounded-md p-2 text-gray-600 input-minimal"
        />

        <button
          type="button"
          onClick={() => setMostrarModal(true)}
          className="bg-indigo-100 border border-indigo-300 rounded-md p-2 text-indigo-700 hover:bg-indigo-200 transition"
        >
          {productosSeleccionados.length > 0
            ? '🔄 Editar productos seleccionados'
            : '➕ Seleccionar productos'}
        </button>

        <button
          type="button"
          onClick={() => setMostrarModalServicios(true)}
          className="bg-green-100 border border-green-300 rounded-md p-2 text-green-700 hover:bg-green-200 transition"
        >
          {serviciosSeleccionados.length > 0
            ? '🔄 Editar servicios seleccionados'
            : '➕ Seleccionar servicios'}
        </button>

        <ListaItems
          productosSeleccionados={productosSeleccionados}
          serviciosSeleccionados={serviciosSeleccionados}
          onEliminarProducto={eliminarProducto}
          onEliminarServicio={eliminarServicio}
          subtotal={subtotal}
          iva={iva}
          total={total}
          totalPagado={totalPagado}
          cambio={cambio}
          requiereFactura={formData.requiere_factura}
        />

        <textarea
          name="observaciones"
          placeholder="Observaciones (opcional)"
          value={formData.observaciones}
          onChange={handleChange}
          rows={3}
          className="border rounded-md p-2 text-gray-600 resize-none textarea-minimal"
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.requiere_factura}
            onChange={(e) => setRequiereFactura(e.target.checked)}
          />
          <span className="text-sm text-gray-700">Requiere factura</span>
        </div>

        <PanelPagos
          pagos={pagos}
          total={total}
          totalPagado={totalPagado}
          onPagoChange={handlePagoChange}
          onPagarTodo={pagarTodo}
          configTransferencia={configTransferencia}
          loadingConfig={loadingConfig}
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full text-white font-medium py-2.5 rounded-lg transition ${
            loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Procesando...
            </div>
          ) : (
            'Registrar venta'
          )}
        </button>

      </form>

      {mostrarModal && (
        <ModalSeleccionarProducto
          onClose={() => setMostrarModal(false)}
          onSeleccionar={(productos) => {
            setProductosSeleccionados(productos)
            setMostrarModal(false)
          }}
          seleccionadosIniciales={productosSeleccionados}
        />
      )}

      {mostrarModalServicios && (
        <ModalSeleccionarServicios
          onClose={() => setMostrarModalServicios(false)}
          onSeleccionar={(servicios) => {
            setServiciosSeleccionados(servicios)
            setMostrarModalServicios(false)
          }}
        />
      )}

    </motion.div>
  )
}
