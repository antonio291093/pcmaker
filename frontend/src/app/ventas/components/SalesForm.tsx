'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FaShoppingCart } from 'react-icons/fa'
import Swal from 'sweetalert2'
import ModalSeleccionarProducto from '../../components/SeleccionarProductoModal'
import ModalSeleccionarServicios from '../../components/ModalSeleccionarServicios'
import { useUser } from '@/context/UserContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function SalesForm() {
  const [formData, setFormData] = useState({
    cliente: '',
    observaciones: '',
    telefono: '',
    correo: '',
    requiere_factura: false
  })

  const [pagos, setPagos] = useState({
    efectivo: 0,
    terminal: 0,
    transferencia: 0,
  })

  const [productosSeleccionados, setProductosSeleccionados] = useState<any[]>([])

  const equiposVendidos = productosSeleccionados.filter(
    (p) => p.es_equipo === true
  )

  const [mostrarModal, setMostrarModal] = useState(false)  
  const [loading, setLoading] = useState(false)
  const { user, loading: userLoading } = useUser()
  if (userLoading) {
    return <p>Cargando usuario...</p>
  }

  if (!user) {
    return null
  }

  const usuarioId = user.id
  const sucursalId = user.sucursal_id
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<any[]>([])
  const [mostrarModalServicios, setMostrarModalServicios] = useState(false)

  useEffect(() => {
    if (!user?.sucursal_id) return

    fetch(`${API_URL}/api/caja/abrir-dia`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sucursal_id: user.sucursal_id })
    })
  }, [user])  

  const IVA = 0.16

  // 🔹 subtotal real de productos + servicios
  const subtotal = useMemo(() => {
    const totalProductos = productosSeleccionados.reduce((acc, p) => {
      const precio = Number(p.precio) || 0
      const cantidad = Number(p.cantidadSeleccionada) || 0
      return acc + precio * cantidad
    }, 0)

    const totalServicios = serviciosSeleccionados.reduce((acc, s) => {
      return acc + Number(s.costo || 0)
    }, 0)

    return totalProductos + totalServicios
  }, [productosSeleccionados, serviciosSeleccionados])

  // 🔹 si requiere factura  
  const requiereFactura = formData.requiere_factura

  // 🔹 iva calculado
  const iva = useMemo(() => {
    if (!requiereFactura) return 0
    return subtotal * IVA
  }, [subtotal, requiereFactura])

  // 🔹 total final
  const total = useMemo(() => {
    return subtotal + iva
  }, [subtotal, iva])
  
  const totalPagado = useMemo(() => {
    return (
      Number(pagos.efectivo) +
      Number(pagos.terminal) +
      Number(pagos.transferencia)
    )
  }, [pagos])

  const cambio = totalPagado - total

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePagoChange = (metodo: string, value: string) => {
    setPagos(prev => ({
      ...prev,
      [metodo]: Number(value) || 0
    }))
  }

  //Eliminar un producto seleccionado
  const eliminarProducto = (id: number) => {
    setProductosSeleccionados(prev => prev.filter(p => p.id !== id))
  }

  const totalProductos = useMemo(() => {
    return productosSeleccionados.reduce((acc, p) => {
      const precio = Number(p.precio) || 0
      const cantidad = Number(p.cantidadSeleccionada) || 0
      return acc + precio * cantidad
    }, 0)
  }, [productosSeleccionados])

  const generarComisionVenta = async (
    ventaId: number,
    vendedorId: number,
    montoVenta: number
  ) => {
    try {
      //Obtener configuración
      const respConfig = await fetch(
        `${API_URL}/api/configuraciones/comision_ventas`,
        { credentials: 'include' }
      )

      let tasa = 0.03 // default 3%

      if (respConfig.ok) {
        const data = await respConfig.json()
        const parsed = parseFloat(data?.valor)
        if (!isNaN(parsed)) tasa = parsed
      }

      //Calcular comisión SOLO sobre productos
      const comision = montoVenta * tasa

      if (comision <= 0) return

      //Registrar comisión
      await fetch(`${API_URL}/api/comisiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          usuario_id: vendedorId,
          venta_id: ventaId,
          mantenimiento_id: null,
          monto: comision,
          fecha_creacion: new Date().toISOString(),
          equipo_id: null,
        }),
      })
    } catch (err) {
      console.error('Error generando comisión de venta:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!usuarioId || !sucursalId) {
      Swal.fire({
        icon: 'error',
        title: 'Usuario no disponible',
        text: 'Por favor, inicia sesión nuevamente.',
        confirmButtonColor: '#4F46E5'
      })
      return
    }

    if (productosSeleccionados.length === 0 && serviciosSeleccionados.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Selecciona productos o servicios',
        text: 'Debes seleccionar al menos un producto o servicio.',
        confirmButtonColor: '#4F46E5'
      })
      return
    }

    if (!formData.cliente) {
      Swal.fire({
        icon: 'info',
        title: 'Campo requerido',
        text: 'Debes ingresar el nombre del cliente.',
        confirmButtonColor: '#4F46E5'
      })
      return
    }

    // 🔹 Validar stock
    for (const p of productosSeleccionados) {
      if (p.cantidadSeleccionada > p.cantidad) {
        Swal.fire({
          icon: 'error',
          title: 'Stock insuficiente',
          text: `No hay suficiente stock para "${p.descripcion}".`,
          confirmButtonColor: '#4F46E5'
        })
        return
      }
    }

    if (totalPagado !== total) {
      Swal.fire({
        icon: 'error',
        title: 'Monto incorrecto',
        text: 'La suma de los pagos debe ser igual al total de la venta.',
        confirmButtonColor: '#4F46E5'
      })
      return
    }

    try {
      setLoading(true)
      const tieneProductos = productosSeleccionados.length > 0
      const tieneServicios = serviciosSeleccionados.length > 0

      //Registrar la venta
      const ventaResp = await fetch(`${API_URL}/api/ventas`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: formData.cliente,
          telefono: formData.telefono || null,
          correo: formData.correo || null,
          pagos: Object.entries(pagos)
          .filter(([_, monto]) => monto > 0)
          .map(([metodo, monto]) => ({
            metodo,
            monto
          })),
          observaciones: formData.observaciones,
          usuario_id: usuarioId,
          sucursal_id: sucursalId,

          subtotal,
          iva,
          total,
          requiere_factura: formData.requiere_factura,

          productos: tieneProductos ? productosSeleccionados.map(p => ({
            id: p.id,
            cantidad: p.cantidadSeleccionada,
            precio_unitario: Number(p.precio) || 0
          })) : [],

          servicios: tieneServicios ? serviciosSeleccionados.map(s => s.id) : []
        })
      })

      if (!ventaResp.ok) {
        const errData = await ventaResp.json()
        throw new Error(errData.message || 'No se pudo registrar la venta.')
      }

      const ventaData = await ventaResp.json()
      const ventaId = ventaData.venta_id;
      const totalVenta = ventaData.total;

      const ticketResult = await Swal.fire({
        title: 'Venta generada',
        text: '¿Deseas imprimir el ticket?',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Sí, imprimir',
        cancelButtonText: 'No',
      })

      if (ticketResult.isConfirmed) {
        window.open(
          `${API_URL}/api/ventas/ticket/${ventaId}`,
          '_blank'
        )
      }

      if (equiposVendidos.length > 0) {
        const garantiaResult = await Swal.fire({
          title: 'Garantía',
          text: '¿Deseas imprimir la garantía?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, imprimir',
          cancelButtonText: 'No',
        })

        if (garantiaResult.isConfirmed) {
          window.open(`${API_URL}/api/garantia/${ventaId}`, '_blank')
        }
      }

      //Generar comisión SOLO si hay productos
      if (productosSeleccionados.length > 0) {
        await generarComisionVenta(
          ventaId,
          usuarioId,
          totalProductos
        )
      }

      //Registrar movimiento en caja
      const cajaResp = await fetch(`${API_URL}/api/caja/movimiento`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'venta',
          monto: totalVenta,
          descripcion: `Venta #${ventaId} - Cliente: ${formData.cliente}`,
          usuario_id: usuarioId,
          sucursal_id: sucursalId,
          referencia_id: ventaId
        })
      })

      if (!cajaResp.ok) {
        const errData = await cajaResp.json()
        throw new Error(errData.message || 'Error al registrar movimiento en caja.')
      }

      if (tieneProductos) {
        const inventarioResp = await fetch(
          `${API_URL}/api/inventario/descontar-venta`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sucursal_id: sucursalId,
              productos: productosSeleccionados.map(p => ({
                producto_id: p.id,
                cantidad_vendida: p.cantidadSeleccionada
              }))
            })
          }
        )

        if (!inventarioResp.ok) {
          const errData = await inventarioResp.json()
          throw new Error(errData.message || 'Error al descontar stock.')
        }
      }

      let mensajeExito = 'La venta se registró correctamente.'

      if (tieneProductos && tieneServicios) {
        mensajeExito = 'La venta de productos y servicios se registró correctamente.'
      } else if (tieneProductos) {
        mensajeExito = 'La venta de productos se registró correctamente.'
      } else if (tieneServicios) {
        mensajeExito = 'El servicio fue cobrado correctamente.'
      }

      await Swal.fire({
        icon: 'success',
        title: 'Operación exitosa',
        text: mensajeExito,
        showConfirmButton: false,
        timer: 10000
      })

      //Limpiar formulario
      setFormData({
        cliente: '',
        observaciones: '',
        telefono: '',
        correo: '',
        requiere_factura: false      
      });

      setPagos({
        efectivo: 0,
        terminal: 0,
        transferencia: 0
      });

      setProductosSeleccionados([])
      setServiciosSeleccionados([])

    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error al registrar',
        text: error.message || 'Ocurrió un error durante el registro.',
        confirmButtonColor: '#4F46E5'
      })
    } finally {
      setLoading(false)
    }
  }

  // ==============================
  //           RENDER
  // ==============================

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className='bg-white rounded-xl shadow p-6 max-w-xl'
    >
      <h2 className='text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2'>
        <FaShoppingCart className='text-indigo-600' /> Registrar venta
      </h2>

      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <input
          type='text'
          name='cliente'
          placeholder='Nombre cliente'
          value={formData.cliente}
          onChange={handleChange}
          className='border rounded-md p-2 text-gray-600 input-minimal'          
        />

        <input
          type="tel"
          name="telefono"          
          value={formData.telefono}
          onChange={handleChange}
          className="border rounded-md p-2 text-gray-600 input-minimal"
          placeholder="Ej. 8441234567"
        />

         <input
          type="email"
          name="correo"
          value={formData.correo}
          onChange={handleChange}
          className="border rounded-md p-2 text-gray-600 input-minimal"
          placeholder="cliente@correo.com"
        />

        {/* Botón para abrir modal */}
        <button
          type='button'
          onClick={() => setMostrarModal(true)}
          className='bg-indigo-100 border border-indigo-300 rounded-md p-2 text-indigo-700 hover:bg-indigo-200 transition'
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

        {/* Listado de productos seleccionados */}
        {productosSeleccionados.length > 0 && (
          <div className='border rounded-md p-3 bg-gray-50'>
            <h4 className='font-semibold text-gray-700 mb-2'>Productos seleccionados</h4>
            <ul className='space-y-2'>
              {productosSeleccionados.map((p) => (
                <li
                  key={p.id}
                  className='flex justify-between items-center text-sm text-gray-700 bg-white p-2 rounded-md border'
                >
                  <div>
                    <p className='font-medium'>{p.descripcion || p.especificacion}</p>
                    <p className='text-gray-500'>
                      {p.cantidadSeleccionada} unidades × ${Number(p.precio || 0).toFixed(2)}
                    </p>
                    <p className='text-gray-600 font-semibold'>
                      Subtotal: ${(Number(p.precio || 0) * Number(p.cantidadSeleccionada)).toFixed(2)} MXN
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => eliminarProducto(p.id)}
                    className='text-red-500 hover:text-red-700 text-xs font-semibold'
                  >
                    ✖
                  </button>
                </li>
              ))}
            </ul>

            {/* Total */}
            <div className='text-right mt-3 font-bold text-gray-800'>
              {formData.requiere_factura && (
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

              <div className="text-right mt-1 text-sm text-gray-700">
                Pagado: <b>${totalPagado.toFixed(2)}</b>
              </div>

              {cambio > 0 && (
                <div className="text-right text-green-600 text-sm font-semibold">
                  Cambio: ${cambio.toFixed(2)}
                </div>
              )}

              {totalPagado < total && (
                <div className="text-xs text-red-500 text-right">
                  Faltan ${(total - totalPagado).toFixed(2)}
                </div>
              )}

            </div>
          </div>
        )}

        {serviciosSeleccionados.length > 0 && (
          <div className="border rounded-md p-3 bg-green-50">
            <h4 className="font-semibold text-gray-700 mb-2">
              Servicios seleccionados
            </h4>

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
                    onClick={() =>
                      setServiciosSeleccionados(prev =>
                        prev.filter(x => x.id !== s.id)
                      )
                    }
                    className="text-red-500 hover:text-red-700 text-xs font-semibold"
                  >
                    ✖
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <textarea
          name='observaciones'
          placeholder='Observaciones (opcional)'
          value={formData.observaciones}
          onChange={handleChange}
          rows={3}
          className='border rounded-md p-2 text-gray-600 resize-none textarea-minimal'
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.requiere_factura}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                requiere_factura: e.target.checked
              }))
            }
          />
          <span className="text-sm text-gray-700">
            Requiere factura
          </span>
        </div>

        <div className="border rounded-md p-3 bg-gray-50 input-minimal">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Pagos
          </span>

          <div className="grid grid-cols-3 gap-3">

            <div>
              <label className="text-xs text-gray-600">Efectivo</label>              
              <input
                type="number"
                min="0"
                value={pagos.efectivo}
                onChange={(e) => handlePagoChange("efectivo", e.target.value)}
                className="border rounded-md p-2 w-full text-sm input-minimal"
              />
              <button
                type="button"
                onClick={() =>
                  setPagos({
                    efectivo: total,
                    terminal: 0,
                    transferencia: 0
                  })
                }
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
                onChange={(e) => handlePagoChange("terminal", e.target.value)}
                className="border rounded-md p-2 w-full text-sm input-minimal"
              />
              <button
                type="button"
                onClick={() =>
                  setPagos({
                    efectivo: 0,
                    terminal: total,
                    transferencia: 0
                  })
                }
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
                onChange={(e) => handlePagoChange("transferencia", e.target.value)}
                className="border rounded-md p-2 w-full text-sm input-minimal"
              />
              <button
                type="button"
                onClick={() =>
                  setPagos({
                    efectivo: 0,
                    terminal: 0,
                    transferencia: total
                  })
                }
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

        <button
          type="submit"
          className={`w-full text-white font-medium py-2.5 rounded-lg transition ${
            loading
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
          disabled={loading}
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
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              Procesando...
            </div>
          ) : (
            'Registrar venta'
          )}
        </button>

      </form>

      {/* Modal */}
      {mostrarModal && (
        <ModalSeleccionarProducto
          onClose={() => setMostrarModal(false)}
          onSeleccionar={(productos) => {
            setProductosSeleccionados(productos)
            setMostrarModal(false)
          }}
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
