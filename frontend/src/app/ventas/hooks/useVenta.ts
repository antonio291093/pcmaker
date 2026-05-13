'use client'
import { useState, useEffect, useMemo } from 'react'
import Swal from 'sweetalert2'
import { useUser } from '@/context/UserContext'
import { API_URL } from '@/utils/api'
import { ProductoSeleccionado } from '../../components/SeleccionarProductoModal'
import { ServicioPendiente } from '../../components/ModalSeleccionarServicios'
import { ConfiguracionPago } from '../../components/Types'

const IVA = 0.16

export function useVenta() {
  const { user, loading: userLoading } = useUser()

  const [formData, setFormData] = useState({
    cliente: '',
    observaciones: '',
    telefono: '',
    correo: '',
    requiere_factura: false,
  })

  const [pagos, setPagos] = useState({
    efectivo: 0,
    terminal: 0,
    transferencia: 0,
  })

  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([])
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<ServicioPendiente[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarModalServicios, setMostrarModalServicios] = useState(false)
  const [loading, setLoading] = useState(false)
  const [configTransferencia, setConfigTransferencia] = useState<ConfiguracionPago | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(false)

  useEffect(() => {
    if (!user?.sucursal_id) return
    fetch(`${API_URL}/api/caja/abrir-dia`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sucursal_id: user.sucursal_id }),
    })
  }, [user])

  useEffect(() => {
    const obtenerConfig = async () => {
      if (pagos.transferencia <= 0 && !formData.requiere_factura) {
        setConfigTransferencia(null)
        return
      }

      setLoadingConfig(true)

      try {
        const params = new URLSearchParams()
        if (pagos.transferencia > 0) params.append('tipo_pago', 'TRANSFERENCIA')
        if (formData.requiere_factura) params.append('requiere_factura', 'true')

        const res = await fetch(
          `${API_URL}/api/configuracionPagos/config?${params.toString()}`,
          { credentials: 'include' }
        )

        setConfigTransferencia(res.ok ? await res.json() : null)
      } catch (error) {
        console.error('Error obteniendo config transferencia:', error)
        setConfigTransferencia(null)
      } finally {
        setLoadingConfig(false)
      }
    }

    obtenerConfig()
  }, [pagos.transferencia, formData.requiere_factura])

  const subtotalProductos = useMemo(
    () =>
      productosSeleccionados.reduce(
        (acc, p) => acc + (Number(p.precio) || 0) * (Number(p.cantidadSeleccionada) || 0),
        0
      ),
    [productosSeleccionados]
  )

  const subtotalServicios = useMemo(
    () =>
      serviciosSeleccionados.reduce(
        (acc, s) => acc + Number(s.costo || 0),
        0
      ),
    [serviciosSeleccionados]
  )

  const subtotal = useMemo(
    () => subtotalProductos + subtotalServicios,
    [subtotalProductos, subtotalServicios]
  )

  const iva = useMemo(
    () => (formData.requiere_factura ? subtotalProductos * IVA : 0),
    [subtotalProductos, formData.requiere_factura]
  )

  const total = useMemo(() => subtotal + iva, [subtotal, iva])

  const totalPagado = useMemo(
    () => Number(pagos.efectivo) + Number(pagos.terminal) + Number(pagos.transferencia),
    [pagos]
  )

  const cambio = totalPagado - total

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const setRequiereFactura = (value: boolean) => {
    setFormData(prev => ({ ...prev, requiere_factura: value }))
  }

  const handlePagoChange = (metodo: string, value: string) => {
    setPagos(prev => ({ ...prev, [metodo]: Number(value) || 0 }))
  }

  const pagarTodo = (metodo: 'efectivo' | 'terminal' | 'transferencia') => {
    setPagos({ efectivo: 0, terminal: 0, transferencia: 0, [metodo]: total })
  }

  const eliminarProducto = (id: number) => {
    setProductosSeleccionados(prev => prev.filter(p => p.id !== id))
  }

  const eliminarServicio = (id: number) => {
    setServiciosSeleccionados(prev => prev.filter(s => s.id !== id))
  }

  const resetForm = () => {
    setFormData({ cliente: '', observaciones: '', telefono: '', correo: '', requiere_factura: false })
    setPagos({ efectivo: 0, terminal: 0, transferencia: 0 })
    setProductosSeleccionados([])
    setServiciosSeleccionados([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id || !user?.sucursal_id) {
      Swal.fire({ icon: 'error', title: 'Usuario no disponible', text: 'Por favor, inicia sesión nuevamente.', confirmButtonColor: '#4F46E5' })
      return
    }

    if (productosSeleccionados.length === 0 && serviciosSeleccionados.length === 0) {
      Swal.fire({ icon: 'info', title: 'Selecciona productos o servicios', text: 'Debes seleccionar al menos un producto o servicio.', confirmButtonColor: '#4F46E5' })
      return
    }

    if (!formData.cliente) {
      Swal.fire({ icon: 'info', title: 'Campo requerido', text: 'Debes ingresar el nombre del cliente.', confirmButtonColor: '#4F46E5' })
      return
    }

    for (const p of productosSeleccionados) {
      if (p.cantidadSeleccionada > p.cantidad) {
        Swal.fire({ icon: 'error', title: 'Stock insuficiente', text: `No hay suficiente stock para "${p.descripcion}".`, confirmButtonColor: '#4F46E5' })
        return
      }
    }

    if (totalPagado !== total) {
      Swal.fire({ icon: 'error', title: 'Monto incorrecto', text: 'La suma de los pagos debe ser igual al total de la venta.', confirmButtonColor: '#4F46E5' })
      return
    }

    try {
      setLoading(true)

      const tieneProductos = productosSeleccionados.length > 0
      const tieneServicios = serviciosSeleccionados.length > 0
      const tieneEquipos = productosSeleccionados.some(p => p.es_equipo)

      const ventaResp = await fetch(`${API_URL}/api/ventas`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: formData.cliente,
          telefono: formData.telefono || null,
          correo: formData.correo || null,
          pagos: Object.entries(pagos)
            .filter(([, monto]) => monto > 0)
            .map(([metodo, monto]) => ({ metodo, monto })),
          observaciones: formData.observaciones,
          usuario_id: user.id,
          sucursal_id: user.sucursal_id,
          subtotal,
          iva,
          total,
          requiere_factura: formData.requiere_factura,
          productos: tieneProductos
            ? productosSeleccionados.map(p => ({
                id: p.id,
                cantidad: p.cantidadSeleccionada,
                precio_unitario: Number(p.precio) || 0,
              }))
            : [],
          servicios: tieneServicios ? serviciosSeleccionados.map(s => s.id) : [],
        }),
      })

      if (!ventaResp.ok) {
        const errData = await ventaResp.json()
        throw new Error(errData.message || 'No se pudo registrar la venta.')
      }

      const { venta_id: ventaId } = await ventaResp.json()

      const ticketResult = await Swal.fire({
        title: 'Venta generada',
        text: '¿Deseas imprimir el ticket?',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Sí, imprimir',
        cancelButtonText: 'No',
      })

      if (ticketResult.isConfirmed) {
        window.open(`${API_URL}/api/ventas/ticket/${ventaId}`, '_blank')
      }

      if (tieneEquipos || tieneProductos) {
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
        timer: 10000,
      })

      resetForm()
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error al registrar',
        text: (error as Error).message || 'Ocurrió un error durante el registro.',
        confirmButtonColor: '#4F46E5',
      })
    } finally {
      setLoading(false)
    }
  }

  return {
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
  }
}
