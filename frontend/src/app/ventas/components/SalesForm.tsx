'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FaShoppingCart } from 'react-icons/fa'
import Swal from 'sweetalert2'
import ModalSeleccionarProducto from '../../components/SeleccionarProductoModal'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function SalesForm() {
  const [formData, setFormData] = useState({
    cliente: '',
    observaciones: ''
  })

  const [productosSeleccionados, setProductosSeleccionados] = useState<any[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const [usuarioId, setUsuarioId] = useState<number | null>(null)
  const [sucursalId, setSucursalId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // 🔹 Calcular el total acumulado automáticamente
  const total = useMemo(() => {
    return productosSeleccionados.reduce((acc, p) => {
      const precio = Number(p.precio) || 0
      const cantidad = Number(p.cantidadSeleccionada) || 0
      return acc + precio * cantidad
    }, 0)
  }, [productosSeleccionados])

  // 🔹 Cargar usuario y sucursal
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/usuarios/me`, { credentials: 'include' })
        if (!res.ok) throw new Error('No autenticado')
        const data = await res.json()
        setUsuarioId(data.user.id)
        setSucursalId(data.user.sucursal_id)
      } catch (err) {
        Swal.fire({
          icon: 'warning',
          title: 'Sesión expirada',
          text: 'Debes iniciar sesión nuevamente.',
          confirmButtonColor: '#4F46E5'
        }).then(() => (window.location.href = '/login'))
      }
    }
    fetchUserData()
  }, [])

  // 🔹 Manejador de cambios
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // 🔹 Eliminar un producto seleccionado
  const eliminarProducto = (id: number) => {
    setProductosSeleccionados(prev => prev.filter(p => p.id !== id))
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

    if (productosSeleccionados.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Selecciona productos',
        text: 'Debes seleccionar al menos un producto antes de registrar la venta.',
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

    try {
      setLoading(true)

      // 1️⃣ Registrar la venta
      const ventaResp = await fetch(`${API_URL}/api/ventas`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: formData.cliente,
          observaciones: formData.observaciones,
          usuario_id: usuarioId,
          sucursal_id: sucursalId,
          total,
          productos: productosSeleccionados.map(p => ({
            id: p.id,
            cantidad: p.cantidadSeleccionada,
            precio_unitario: Number(p.precio) || 0
          }))
        })
      })

      if (!ventaResp.ok) {
        const errData = await ventaResp.json()
        throw new Error(errData.message || 'No se pudo registrar la venta.')
      }

      const ventaData = await ventaResp.json()
      const ventaId = ventaData.id || ventaData.venta_id

      // 2️⃣ Registrar movimiento en caja
      const cajaResp = await fetch(`${API_URL}/api/caja/movimiento`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'venta',
          monto: total,
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

      // 3️⃣ Descontar stock desde venta
      const inventarioResp = await fetch(`${API_URL}/api/inventario/descontar-venta`, {
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
      })

      if (!inventarioResp.ok) {
        const errData = await inventarioResp.json()
        throw new Error(errData.message || 'Error al descontar stock.')
      }

      // ✅ Todo correcto
      await Swal.fire({
        icon: 'success',
        title: 'Venta registrada',
        text: 'La venta, el movimiento de caja y el descuento de inventario se realizaron correctamente.',
        showConfirmButton: false,
        timer: 3000
      })

      // 🔹 Limpiar formulario
      setFormData({ cliente: '', observaciones: '' })
      setProductosSeleccionados([])

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
          className='border rounded-md p-2 text-gray-600'          
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
              Total: ${total.toFixed(2)} MXN
            </div>
          </div>
        )}

        <textarea
          name='observaciones'
          placeholder='Observaciones (opcional)'
          value={formData.observaciones}
          onChange={handleChange}
          rows={3}
          className='border rounded-md p-2 text-gray-600 resize-none'
        />

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
    </motion.div>
  )
}
