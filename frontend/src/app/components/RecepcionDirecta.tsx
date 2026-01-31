'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { useUser } from '@/context/UserContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function RecepcionDirecta() {
  const { user, loading: userLoading } = useUser()

  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    cantidad: 1,
    precio: '',
    modelo: '',
    procesador: '',
    ram_gb: '',
    ram_tipo: '',
    almacenamiento_gb: '',
    almacenamiento_tipo: '',
    observaciones: '',
  })

  useEffect(() => {
    if (userLoading) return
    if (!user) return
  }, [user, userLoading])

  if (userLoading || !user) return null

  const onChange = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const validarFormulario = () => {
    if (form.cantidad < 1) {
      Swal.fire('Error', 'La cantidad debe ser mayor a 0', 'warning')
      return false
    }

    if (!form.modelo.trim() || !form.procesador.trim()) {
      Swal.fire('Error', 'Modelo y procesador son obligatorios', 'warning')
      return false
    }

    if (!form.precio || Number(form.precio) <= 0) {
      Swal.fire('Error', 'El precio debe ser mayor a 0', 'warning')
      return false
    }

    if (!form.ram_gb || Number(form.ram_gb) <= 0) {
      Swal.fire('Error', 'RAM inválida', 'warning')
      return false
    }

    if (!form.almacenamiento_gb || Number(form.almacenamiento_gb) <= 0) {
      Swal.fire('Error', 'Almacenamiento inválido', 'warning')
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validarFormulario()) return

    const confirm = await Swal.fire({
      title: 'Confirmar recepción directa',
      text: `Se registrarán ${form.cantidad} equipos del modelo ${form.modelo}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar',
    })

    if (!confirm.isConfirmed) return

    setLoading(true)

    try {
      const response = await fetch(
        `${API_URL}/api/inventario/recepcion-directa`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            sucursal_id: user.sucursal_id,
            cantidad: Number(form.cantidad),
            precio: Number(form.precio),
            modelo: form.modelo,
            procesador: form.procesador,
            ram_gb: Number(form.ram_gb),
            ram_tipo: form.ram_tipo,
            almacenamiento_gb: Number(form.almacenamiento_gb),
            almacenamiento_tipo: form.almacenamiento_tipo,
            observaciones: form.observaciones,
          }),
        }
      )

      if (!response.ok) throw new Error('Error al registrar recepción directa')

      await Swal.fire({
        icon: 'success',
        title: 'Recepción registrada',
        text: 'Los equipos fueron dados de alta correctamente',
        timer: 2000,
        showConfirmButton: false,
      })

      // Reset
      setForm({
        cantidad: 1,
        precio: '',
        modelo: '',
        procesador: '',
        ram_gb: '',
        ram_tipo: '',
        almacenamiento_gb: '',
        almacenamiento_tipo: '',
        observaciones: '',
      })
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error del servidor', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className="bg-white rounded-xl shadow p-4 sm:p-6 max-w-full sm:max-w-6xl w-full"
    >
      <h2 className="text-xl font-semibold mb-6 text-gray-700">
        Recepción directa de equipos
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input type="number" min={1} value={form.cantidad}
          onChange={e => onChange('cantidad', Number(e.target.value))}
          className="border rounded-md p-2 input-minimal" placeholder="Cantidad" />

        <input type="number" value={form.precio}
          onChange={e => onChange('precio', e.target.value)}
          className="border rounded-md p-2 input-minimal" placeholder="Precio unitario" />

        <input value={form.modelo}
          onChange={e => onChange('modelo', e.target.value)}
          className="border rounded-md p-2 input-minimal" placeholder="Modelo" />

        <input value={form.procesador}
          onChange={e => onChange('procesador', e.target.value)}
          className="border rounded-md p-2 input-minimal" placeholder="Procesador" />

        <input type="number" value={form.ram_gb}
          onChange={e => onChange('ram_gb', e.target.value)}
          className="border rounded-md p-2 input-minimal" placeholder="RAM (GB)" />

        <input value={form.ram_tipo}
          onChange={e => onChange('ram_tipo', e.target.value)}
          className="border rounded-md p-2 input-minimal" placeholder="Tipo RAM (DDR4, DDR5...)" />

        <input type="number" value={form.almacenamiento_gb}
          onChange={e => onChange('almacenamiento_gb', e.target.value)}
          className="border rounded-md p-2 input-minimal" placeholder="Almacenamiento (GB)" />

        <input value={form.almacenamiento_tipo}
          onChange={e => onChange('almacenamiento_tipo', e.target.value)}
          className="border rounded-md p-2 input-minimal" placeholder="Tipo almacenamiento (SSD, NVMe...)" />
      </div>

      <textarea
        value={form.observaciones}
        onChange={e => onChange('observaciones', e.target.value)}
        className="border rounded-md p-2 w-full mt-4 textarea-minimal"
        rows={3}
        placeholder="Observaciones (opcional)"
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-6 bg-indigo-600 text-white rounded-md py-2 px-8 font-medium hover:bg-indigo-700 transition-colors"
      >
        {loading ? 'Guardando...' : 'Registrar recepción'}
      </button>
    </motion.div>
  )
}
