'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa'
import { API_URL } from '@/utils/api'

type Categoria = { id: number; descripcion: string }

export default function CategoriasCrud() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nueva, setNueva] = useState('')
  const [loading, setLoading] = useState(false)

  const cargar = async () => {
    const res = await fetch(`${API_URL}/api/catalogo-categorias`, { credentials: 'include' })
    if (res.ok) setCategorias(await res.json())
  }

  useEffect(() => { cargar() }, [])

  const agregar = async () => {
    const desc = nueva.trim()
    if (!desc) return Swal.fire('Error', 'Escribe un nombre para la categoría', 'warning')

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/catalogo-categorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ descripcion: desc }),
      })
      if (!res.ok) throw new Error((await res.json()).message)
      const creada = await res.json()
      setCategorias(prev => [...prev, creada])
      setNueva('')
    } catch (e: any) {
      Swal.fire('Error', e.message || 'No se pudo crear la categoría', 'error')
    } finally {
      setLoading(false)
    }
  }

  const editar = async (cat: Categoria) => {
    const { value: desc } = await Swal.fire({
      title: 'Editar categoría',
      input: 'text',
      inputValue: cat.descripcion,
      inputPlaceholder: 'Nombre de la categoría',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => !v.trim() ? 'El nombre no puede estar vacío' : undefined,
    })
    if (!desc) return

    try {
      const res = await fetch(`${API_URL}/api/catalogo-categorias/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ descripcion: desc.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).message)
      const actualizada = await res.json()
      setCategorias(prev => prev.map(c => c.id === cat.id ? actualizada : c))
      Swal.fire({ icon: 'success', title: 'Categoría actualizada', timer: 1200, showConfirmButton: false })
    } catch (e: any) {
      Swal.fire('Error', e.message || 'No se pudo actualizar', 'error')
    }
  }

  const eliminar = async (cat: Categoria) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar "${cat.descripcion}"?`,
      text: 'Los artículos con esta categoría quedarán sin categoría asignada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    })
    if (!isConfirmed) return

    try {
      const res = await fetch(`${API_URL}/api/catalogo-categorias/${cat.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json()).message)
      setCategorias(prev => prev.filter(c => c.id !== cat.id))
      Swal.fire({ icon: 'success', title: 'Categoría eliminada', timer: 1200, showConfirmButton: false })
    } catch (e: any) {
      Swal.fire('Error', e.message || 'No se pudo eliminar', 'error')
    }
  }

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className="bg-white p-6 rounded-xl shadow w-full max-w-lg"
    >
      <h2 className="text-lg font-semibold text-gray-700 mb-6">Categorías de inventario</h2>

      {/* Formulario agregar */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={nueva}
          onChange={e => setNueva(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder="Nueva categoría"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={agregar}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          <FaPlus /> Agregar
        </button>
      </div>

      {/* Tabla */}
      {categorias.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No hay categorías registradas.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
              <th className="pb-2">Nombre</th>
              <th className="pb-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map(cat => (
              <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 text-gray-700">{cat.descripcion}</td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => editar(cat)}
                      className="text-indigo-500 hover:text-indigo-700"
                      title="Editar"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => eliminar(cat)}
                      className="text-red-400 hover:text-red-600"
                      title="Eliminar"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </motion.div>
  )
}
